import type { GameSettings } from "../core/types";

export const AUDIO_CUES = ["confirm", "item", "clock", "memory", "ending"] as const;

export type AudioCue = (typeof AUDIO_CUES)[number];
export type AudioSettings = Pick<GameSettings, "ambientVolume" | "effectVolume" | "muted">;

export interface AudioManagerOptions {
  /** Listen for a first pointer, touch, or keyboard gesture. Defaults to true. */
  readonly autoUnlock?: boolean;
  /** Target used for lazy gesture unlock. Defaults to `document` when available. */
  readonly gestureTarget?: EventTarget | null;
}

export const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  ambientVolume: 0.45,
  effectVolume: 0.65,
  muted: false,
};

interface ToneStep {
  readonly frequency: number;
  readonly endFrequency?: number;
  readonly offset: number;
  readonly duration: number;
  readonly gain: number;
  readonly wave: OscillatorType;
}

type AudioContextConstructor = new () => AudioContext;

const MAX_EFFECT_SOURCES = 20;
const MAX_PENDING_CUES = 6;
const RAIN_BUFFER_SECONDS = 2;

const CUE_TONES: Readonly<Record<AudioCue, readonly ToneStep[]>> = {
  confirm: [
    { frequency: 520, endFrequency: 680, offset: 0, duration: 0.11, gain: 0.13, wave: "sine" },
  ],
  item: [
    { frequency: 392, offset: 0, duration: 0.16, gain: 0.1, wave: "triangle" },
    { frequency: 587.33, offset: 0.08, duration: 0.18, gain: 0.09, wave: "triangle" },
    { frequency: 783.99, offset: 0.17, duration: 0.23, gain: 0.08, wave: "sine" },
  ],
  clock: [
    { frequency: 176, endFrequency: 154, offset: 0, duration: 0.12, gain: 0.11, wave: "triangle" },
    { frequency: 220, endFrequency: 196, offset: 0.17, duration: 0.13, gain: 0.09, wave: "triangle" },
  ],
  memory: [
    { frequency: 293.66, offset: 0, duration: 0.44, gain: 0.065, wave: "sine" },
    { frequency: 392, offset: 0.13, duration: 0.48, gain: 0.06, wave: "sine" },
    { frequency: 493.88, offset: 0.28, duration: 0.55, gain: 0.052, wave: "sine" },
  ],
  ending: [
    { frequency: 261.63, offset: 0, duration: 0.68, gain: 0.055, wave: "sine" },
    { frequency: 329.63, offset: 0.2, duration: 0.76, gain: 0.05, wave: "sine" },
    { frequency: 392, offset: 0.42, duration: 0.85, gain: 0.047, wave: "sine" },
    { frequency: 523.25, offset: 0.7, duration: 0.92, gain: 0.04, wave: "sine" },
  ],
};

function getAudioContextConstructor(): AudioContextConstructor | null {
  const scope = globalThis as typeof globalThis & {
    readonly webkitAudioContext?: AudioContextConstructor;
  };
  return scope.AudioContext ?? scope.webkitAudioContext ?? null;
}

function defaultGestureTarget(): EventTarget | null {
  return typeof document === "undefined" ? null : document;
}

function clampVolume(value: number, fallback: number): number {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback;
}

function safeStop(source: AudioScheduledSourceNode): void {
  try {
    source.stop();
  } catch {
    // Stopping an already-ended or not-yet-started source can throw in older browsers.
  }
}

function safeDisconnect(node: AudioNode | null): void {
  try {
    node?.disconnect();
  } catch {
    // Disconnection is best-effort during teardown.
  }
}

/**
 * Small Web Audio synthesizer. It creates no AudioContext until an explicit start
 * or the first user gesture, so autoplay policy failures remain silent and retryable.
 */
export class AudioManager {
  private settings: AudioSettings;
  private readonly pendingCues: AudioCue[] = [];
  private readonly ambientSources = new Set<AudioScheduledSourceNode>();
  private readonly ambientNodes = new Set<AudioNode>();
  private readonly effectSources = new Map<AudioScheduledSourceNode, readonly AudioNode[]>();
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private effectGain: GainNode | null = null;
  private startPromise: Promise<boolean> | null = null;
  private gestureTarget: EventTarget | null = null;
  private ambienceEnabled = true;
  private ambienceStarted = false;
  private destroyed = false;

  public constructor(settings: AudioSettings = DEFAULT_AUDIO_SETTINGS, options: AudioManagerOptions = {}) {
    this.settings = {
      ambientVolume: clampVolume(settings.ambientVolume, DEFAULT_AUDIO_SETTINGS.ambientVolume),
      effectVolume: clampVolume(settings.effectVolume, DEFAULT_AUDIO_SETTINGS.effectVolume),
      muted: settings.muted,
    };

    if (options.autoUnlock ?? true) {
      this.attachGestureUnlock(
        options.gestureTarget === undefined ? defaultGestureTarget() : options.gestureTarget,
      );
    }
  }

  public static get isSupported(): boolean {
    return getAudioContextConstructor() !== null;
  }

  public get isAvailable(): boolean {
    return AudioManager.isSupported && !this.destroyed;
  }

  public get isStarted(): boolean {
    return this.context?.state === "running";
  }

  public get currentSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  /**
   * Starts or resumes audio. Call from a user gesture; failures caused by autoplay
   * policy are returned as `false` and may be retried on the next gesture.
   */
  public start(): Promise<boolean> {
    if (this.destroyed) return Promise.resolve(false);
    if (this.context?.state === "running") {
      this.startAmbienceIfNeeded();
      this.flushPendingCues();
      this.detachGestureUnlock();
      return Promise.resolve(true);
    }
    if (this.startPromise) return this.startPromise;

    this.startPromise = this.attemptStart().finally(() => {
      this.startPromise = null;
    });
    return this.startPromise;
  }

  /** Alias matching common UI terminology. */
  public unlock(): Promise<boolean> {
    return this.start();
  }

  /**
   * Installs retryable gesture listeners without creating an AudioContext.
   * Returns a disposer for callers that own a shorter-lived UI surface.
   */
  public attachGestureUnlock(target: EventTarget | null = defaultGestureTarget()): () => void {
    this.detachGestureUnlock();
    if (!target || this.destroyed) return () => undefined;
    this.gestureTarget = target;
    target.addEventListener("pointerdown", this.handleUnlockGesture, true);
    target.addEventListener("touchstart", this.handleUnlockGesture, true);
    target.addEventListener("keydown", this.handleUnlockGesture, true);
    return () => {
      if (this.gestureTarget === target) this.detachGestureUnlock();
    };
  }

  public detachGestureUnlock(): void {
    if (!this.gestureTarget) return;
    this.gestureTarget.removeEventListener("pointerdown", this.handleUnlockGesture, true);
    this.gestureTarget.removeEventListener("touchstart", this.handleUnlockGesture, true);
    this.gestureTarget.removeEventListener("keydown", this.handleUnlockGesture, true);
    this.gestureTarget = null;
  }

  public updateSettings(settings: Partial<AudioSettings>): void {
    if (this.destroyed) return;
    this.settings = {
      ambientVolume: clampVolume(
        settings.ambientVolume ?? this.settings.ambientVolume,
        this.settings.ambientVolume,
      ),
      effectVolume: clampVolume(
        settings.effectVolume ?? this.settings.effectVolume,
        this.settings.effectVolume,
      ),
      muted: settings.muted ?? this.settings.muted,
    };
    if (this.settings.muted) this.pendingCues.length = 0;
    this.applySettings(false);
  }

  public setAmbientVolume(volume: number): void {
    this.updateSettings({ ambientVolume: volume });
  }

  public setEffectVolume(volume: number): void {
    this.updateSettings({ effectVolume: volume });
  }

  public setMuted(muted: boolean): void {
    this.updateSettings({ muted });
  }

  /** Stops or restores ambience without suspending short UI effects. */
  public setAmbienceEnabled(enabled: boolean): void {
    if (this.destroyed || this.ambienceEnabled === enabled) return;
    this.ambienceEnabled = enabled;
    if (enabled) {
      this.startAmbienceIfNeeded();
    } else {
      this.stopAmbience();
    }
  }

  public play(cue: AudioCue): boolean {
    if (this.destroyed || this.settings.muted || this.settings.effectVolume <= 0) return false;
    if (this.context?.state === "running" && this.effectGain) {
      this.synthesizeCue(cue);
      return true;
    }

    if (this.pendingCues.length < MAX_PENDING_CUES) this.pendingCues.push(cue);
    void this.start();
    return false;
  }

  public playConfirm(): boolean {
    return this.play("confirm");
  }

  public playItem(_itemId?: string): boolean {
    return this.play("item");
  }

  public playItemAcquired(itemId?: string): boolean {
    return this.playItem(itemId);
  }

  public playClock(_amount?: number): boolean {
    return this.play("clock");
  }

  public playClockAdvance(amount?: number): boolean {
    return this.playClock(amount);
  }

  public playMemory(_memoryId?: string): boolean {
    return this.play("memory");
  }

  public playMemoryReveal(memoryId?: string): boolean {
    return this.playMemory(memoryId);
  }

  public playEnding(_endingId?: string): boolean {
    return this.play("ending");
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.detachGestureUnlock();
    this.pendingCues.length = 0;
    this.stopAmbience();

    for (const source of [...this.effectSources.keys()]) {
      safeStop(source);
      this.releaseEffectSource(source);
    }

    safeDisconnect(this.ambientGain);
    safeDisconnect(this.effectGain);
    safeDisconnect(this.masterGain);
    this.ambientGain = null;
    this.effectGain = null;
    this.masterGain = null;

    const context = this.context;
    this.context = null;
    if (context && context.state !== "closed") {
      try {
        void context.close().catch(() => undefined);
      } catch {
        // Closing is best-effort when the page itself is already tearing down.
      }
    }
  }

  private readonly handleUnlockGesture = (): void => {
    void this.start().then(
      (started) => {
        if (started || !AudioManager.isSupported) this.detachGestureUnlock();
      },
      () => undefined,
    );
  };

  private async attemptStart(): Promise<boolean> {
    try {
      const context = this.ensureContext();
      if (!context || this.destroyed) return false;
      if (context.state === "closed") return false;
      if (context.state !== "running") await context.resume();
      if (this.destroyed || context.state !== "running") return false;

      this.applySettings(true);
      this.startAmbienceIfNeeded();
      this.flushPendingCues();
      this.detachGestureUnlock();
      return true;
    } catch {
      // Autoplay rejection and unavailable audio devices are normal fallbacks.
      return false;
    }
  }

  private ensureContext(): AudioContext | null {
    if (this.context && this.context.state !== "closed") return this.context;
    const Constructor = getAudioContextConstructor();
    if (!Constructor) return null;

    const context = new Constructor();
    try {
      const masterGain = context.createGain();
      const ambientGain = context.createGain();
      const effectGain = context.createGain();
      ambientGain.connect(masterGain);
      effectGain.connect(masterGain);
      masterGain.connect(context.destination);

      this.context = context;
      this.masterGain = masterGain;
      this.ambientGain = ambientGain;
      this.effectGain = effectGain;
      this.applySettings(true);
      return context;
    } catch {
      try {
        void context.close().catch(() => undefined);
      } catch {
        // Context setup can fail when the system audio device disappears.
      }
      return null;
    }
  }

  private applySettings(immediate: boolean): void {
    const context = this.context;
    if (!context) return;
    this.setGain(this.masterGain?.gain, this.settings.muted ? 0 : 1, immediate);
    this.setGain(this.ambientGain?.gain, this.settings.ambientVolume, immediate);
    this.setGain(this.effectGain?.gain, this.settings.effectVolume, immediate);
  }

  private setGain(parameter: AudioParam | undefined, value: number, immediate: boolean): void {
    if (!parameter || !this.context) return;
    const now = this.context.currentTime;
    parameter.cancelScheduledValues(now);
    if (immediate) {
      parameter.setValueAtTime(value, now);
    } else {
      parameter.setTargetAtTime(value, now, 0.018);
    }
  }

  private startAmbienceIfNeeded(): void {
    const context = this.context;
    const destination = this.ambientGain;
    if (
      !context ||
      !destination ||
      context.state !== "running" ||
      !this.ambienceEnabled ||
      this.ambienceStarted ||
      this.destroyed
    ) {
      return;
    }

    try {
      const rainSource = context.createBufferSource();
      rainSource.buffer = this.createRainBuffer(context);
      rainSource.loop = true;
      const rainFilter = context.createBiquadFilter();
      rainFilter.type = "bandpass";
      rainFilter.frequency.setValueAtTime(1_650, context.currentTime);
      rainFilter.Q.setValueAtTime(0.55, context.currentTime);
      const rainGain = context.createGain();
      rainGain.gain.setValueAtTime(0.14, context.currentTime);
      rainSource.connect(rainFilter);
      rainFilter.connect(rainGain);
      rainGain.connect(destination);

      this.ambientSources.add(rainSource);
      this.ambientNodes.add(rainFilter);
      this.ambientNodes.add(rainGain);

      this.createHumOscillator(context, destination, 55, 0.026);
      this.createHumOscillator(context, destination, 82.41, 0.012);
      rainSource.start();
      this.ambienceStarted = true;
    } catch {
      this.stopAmbience();
    }
  }

  private createRainBuffer(context: AudioContext): AudioBuffer {
    const frameCount = Math.max(
      1,
      Math.min(Math.floor(context.sampleRate * RAIN_BUFFER_SECONDS), context.sampleRate * 3),
    );
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    let seed = 0x51_7c_c1_b7;
    let smoothed = 0;

    for (let index = 0; index < channel.length; index += 1) {
      seed = (Math.imul(seed, 1_664_525) + 1_013_904_223) >>> 0;
      const white = (seed / 0xffff_ffff) * 2 - 1;
      smoothed = smoothed * 0.82 + white * 0.18;
      channel[index] = Math.max(-1, Math.min(1, white * 0.34 + smoothed * 0.66));
    }
    return buffer;
  }

  private createHumOscillator(
    context: AudioContext,
    destination: AudioNode,
    frequency: number,
    level: number,
  ): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    gain.gain.setValueAtTime(level, context.currentTime);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start();
    this.ambientSources.add(oscillator);
    this.ambientNodes.add(gain);
  }

  private stopAmbience(): void {
    for (const source of this.ambientSources) safeStop(source);
    for (const source of this.ambientSources) safeDisconnect(source);
    for (const node of this.ambientNodes) safeDisconnect(node);
    this.ambientSources.clear();
    this.ambientNodes.clear();
    this.ambienceStarted = false;
  }

  private flushPendingCues(): void {
    if (this.destroyed || this.settings.muted || this.context?.state !== "running") return;
    const cues = this.pendingCues.splice(0);
    for (const cue of cues) this.synthesizeCue(cue);
  }

  private synthesizeCue(cue: AudioCue): void {
    const context = this.context;
    const destination = this.effectGain;
    if (!context || !destination || context.state !== "running") return;
    const baseTime = context.currentTime + 0.006;
    for (const tone of CUE_TONES[cue]) this.synthesizeTone(context, destination, baseTime, tone);
  }

  private synthesizeTone(
    context: AudioContext,
    destination: AudioNode,
    baseTime: number,
    tone: ToneStep,
  ): void {
    this.makeEffectRoom();
    let oscillator: OscillatorNode | null = null;
    let gain: GainNode | null = null;

    try {
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.type = tone.wave;
      const start = baseTime + tone.offset;
      const end = start + tone.duration;
      const attackEnd = Math.min(end, start + 0.018);
      oscillator.frequency.setValueAtTime(tone.frequency, start);
      if (tone.endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, end);
      }

      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, tone.gain), attackEnd);
      gain.gain.exponentialRampToValueAtTime(0.0001, end);
      oscillator.connect(gain);
      gain.connect(destination);

      const source = oscillator;
      this.effectSources.set(source, [gain]);
      source.onended = () => this.releaseEffectSource(source);
      source.start(start);
      source.stop(end + 0.02);
    } catch {
      if (oscillator && this.effectSources.has(oscillator)) {
        safeStop(oscillator);
        this.releaseEffectSource(oscillator);
      } else {
        if (oscillator) safeStop(oscillator);
        safeDisconnect(oscillator);
        safeDisconnect(gain);
      }
    }
  }

  private makeEffectRoom(): void {
    while (this.effectSources.size >= MAX_EFFECT_SOURCES) {
      const oldest = this.effectSources.keys().next().value;
      if (!oldest) break;
      safeStop(oldest);
      this.releaseEffectSource(oldest);
    }
  }

  private releaseEffectSource(source: AudioScheduledSourceNode): void {
    const nodes = this.effectSources.get(source);
    if (!nodes) return;
    this.effectSources.delete(source);
    source.onended = null;
    safeDisconnect(source);
    for (const node of nodes) safeDisconnect(node);
  }
}
