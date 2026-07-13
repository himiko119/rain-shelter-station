import type { EndingId, GameSettings, GameState } from "./types";

export const DEFAULT_SETTINGS: GameSettings = Object.freeze({
  ambientVolume: 0.55,
  effectVolume: 0.7,
  muted: false,
  textSpeed: "normal",
  showAllText: false,
  reducedMotion: false,
});

export interface InitialStateOptions {
  readonly settings?: Partial<GameSettings>;
  readonly viewedEndingIds?: readonly EndingId[];
  readonly revision?: number;
  readonly started?: boolean;
}

const VALID_ENDING_IDS: ReadonlySet<EndingId> = new Set([
  "ending_last_train",
  "ending_first_train",
  "ending_rain_shelter",
]);

function clampVolume(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(1, Math.max(0, value));
}

export function mergeSettings(
  current: GameSettings,
  patch: Partial<GameSettings>,
): GameSettings {
  const textSpeed =
    patch.textSpeed === "slow" ||
    patch.textSpeed === "normal" ||
    patch.textSpeed === "fast" ||
    patch.textSpeed === "instant"
      ? patch.textSpeed
      : current.textSpeed;

  return {
    ambientVolume: clampVolume(patch.ambientVolume, current.ambientVolume),
    effectVolume: clampVolume(patch.effectVolume, current.effectVolume),
    muted: typeof patch.muted === "boolean" ? patch.muted : current.muted,
    textSpeed,
    showAllText:
      typeof patch.showAllText === "boolean" ? patch.showAllText : current.showAllText,
    reducedMotion:
      typeof patch.reducedMotion === "boolean"
        ? patch.reducedMotion
        : current.reducedMotion,
  };
}

function uniqueEndingIds(ids: readonly EndingId[] | undefined): EndingId[] {
  if (!ids) {
    return [];
  }

  return [...new Set(ids.filter((id) => VALID_ENDING_IDS.has(id)))];
}

export function createInitialState(options: InitialStateOptions = {}): GameState {
  const revision =
    typeof options.revision === "number" &&
    Number.isSafeInteger(options.revision) &&
    options.revision >= 0
      ? options.revision
      : 0;

  return {
    saveVersion: 1,
    revision,
    started: options.started ?? false,
    areaId: "area_waiting_room",
    playerPosition: { x: 320, y: 360, facing: "down" },
    inventoryItemIds: [],
    foundClueIds: [],
    inspectedHotspotIds: [],
    returnedItemIds: [],
    viewedMemoryIds: [],
    pendingMemoryId: null,
    hintTierByItem: {},
    wrongAttemptsByItem: {},
    nonProgressInteractions: 0,
    sameHotspotInspections: {},
    elapsedSinceProgressMs: 0,
    introSeen: false,
    controlsSeen: false,
    activeEndingId: null,
    viewedEndingIds: uniqueEndingIds(options.viewedEndingIds),
    settings: mergeSettings(DEFAULT_SETTINGS, options.settings ?? {}),
  };
}
