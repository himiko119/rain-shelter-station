import {
  MOVEMENT_DIRECTIONS,
  parseControlBinding,
  type ControlBinding,
  type InputAction,
  type InputActionListener,
  type InputSource,
  type MovementDirection,
  type MovementVector,
  type TriggerInputActionName,
} from "./actions";
import { getKeyboardBinding } from "./bindings";

export interface ActionInputOptions {
  /** Receives keydown and keyup. Defaults to `document` in a browser. */
  readonly keyboardTarget?: EventTarget | null;
  /** Delegates controls carrying data-input-action or data-action. Defaults to `document`. */
  readonly pointerTarget?: EventTarget | null;
  /** Prevent scrolling and browser shortcuts for recognized gameplay controls. */
  readonly preventDefault?: boolean;
  /** Attach listeners in the constructor. Defaults to true. */
  readonly autoAttach?: boolean;
}

interface HeldPointerBinding {
  readonly binding: Extract<ControlBinding, { readonly type: "move" | "dash" }>;
  readonly token: string;
}

const MODAL_ACTIONS: ReadonlySet<TriggerInputActionName> = new Set(["confirm", "cancel"]);

function browserDocument(): Document | null {
  return typeof document === "undefined" ? null : document;
}

function browserWindow(): Window | null {
  return typeof window === "undefined" ? null : window;
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLSelectElement) return true;
  return target.closest("[contenteditable]:not([contenteditable='false'])") !== null;
}

function controlElementFromTarget(target: EventTarget | null): HTMLElement | null {
  if (!(target instanceof Element)) return null;
  const element = target.closest<HTMLElement>("[data-input-action], [data-action]");
  return element instanceof HTMLElement ? element : null;
}

function usesNativeKeyboardActivation(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return target.closest("button, a[href], [role='button'], input[type='button'], input[type='submit']") !== null;
}

function bindingFromElement(element: HTMLElement): ControlBinding | null {
  return parseControlBinding(
    element.dataset.inputAction ?? element.dataset.action,
    element.dataset.direction,
  );
}

/**
 * Framework-independent action controller shared by Phaser and the DOM UI.
 * It owns physical held state, while subscribers receive serializable action events.
 */
export class ActionInput {
  private readonly keyboardTarget: EventTarget | null;
  private readonly pointerTarget: EventTarget | null;
  private readonly preventDefault: boolean;
  private readonly listeners = new Set<InputActionListener>();
  private readonly heldDirections = new Map<MovementDirection, Set<string>>();
  private readonly heldDashTokens = new Set<string>();
  private readonly heldPointers = new Map<number, HeldPointerBinding>();
  private attached = false;
  private destroyed = false;
  private modalActive = false;

  public constructor(options: ActionInputOptions = {}) {
    const defaultTarget = browserDocument();
    this.keyboardTarget = options.keyboardTarget === undefined ? defaultTarget : options.keyboardTarget;
    this.pointerTarget = options.pointerTarget === undefined ? defaultTarget : options.pointerTarget;
    this.preventDefault = options.preventDefault ?? true;

    for (const direction of MOVEMENT_DIRECTIONS) {
      this.heldDirections.set(direction, new Set());
    }

    if (options.autoAttach ?? true) this.attach();
  }

  public get isAttached(): boolean {
    return this.attached;
  }

  public get isDestroyed(): boolean {
    return this.destroyed;
  }

  public get isModalActive(): boolean {
    return this.modalActive;
  }

  public get isDashHeld(): boolean {
    return this.heldDashTokens.size > 0;
  }

  public get movementVector(): MovementVector {
    return this.getMovementVector();
  }

  public attach(): void {
    if (this.attached || this.destroyed) return;

    this.keyboardTarget?.addEventListener("keydown", this.handleKeyDown);
    this.keyboardTarget?.addEventListener("keyup", this.handleKeyUp);
    this.pointerTarget?.addEventListener("pointerdown", this.handlePointerDown);
    this.pointerTarget?.addEventListener("pointerup", this.handlePointerRelease);
    this.pointerTarget?.addEventListener("pointercancel", this.handlePointerRelease);
    this.pointerTarget?.addEventListener("lostpointercapture", this.handlePointerRelease);
    this.pointerTarget?.addEventListener("click", this.handleAccessibleClick);

    const currentWindow = browserWindow();
    currentWindow?.addEventListener("blur", this.handleBlur);
    if (currentWindow && currentWindow !== this.pointerTarget) {
      currentWindow.addEventListener("pointerup", this.handlePointerRelease);
      currentWindow.addEventListener("pointercancel", this.handlePointerRelease);
    }

    browserDocument()?.addEventListener("visibilitychange", this.handleVisibilityChange);
    this.attached = true;
  }

  public detach(): void {
    if (!this.attached) return;

    this.keyboardTarget?.removeEventListener("keydown", this.handleKeyDown);
    this.keyboardTarget?.removeEventListener("keyup", this.handleKeyUp);
    this.pointerTarget?.removeEventListener("pointerdown", this.handlePointerDown);
    this.pointerTarget?.removeEventListener("pointerup", this.handlePointerRelease);
    this.pointerTarget?.removeEventListener("pointercancel", this.handlePointerRelease);
    this.pointerTarget?.removeEventListener("lostpointercapture", this.handlePointerRelease);
    this.pointerTarget?.removeEventListener("click", this.handleAccessibleClick);

    const currentWindow = browserWindow();
    currentWindow?.removeEventListener("blur", this.handleBlur);
    if (currentWindow && currentWindow !== this.pointerTarget) {
      currentWindow.removeEventListener("pointerup", this.handlePointerRelease);
      currentWindow.removeEventListener("pointercancel", this.handlePointerRelease);
    }

    browserDocument()?.removeEventListener("visibilitychange", this.handleVisibilityChange);
    this.releaseAll();
    this.attached = false;
  }

  public subscribe(listener: InputActionListener): () => void {
    if (this.destroyed) return () => undefined;
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public setModalActive(active: boolean): void {
    if (this.destroyed || this.modalActive === active) return;
    this.modalActive = active;
    if (active) this.releaseAll();
  }

  /** Alias useful for DOM overlay code. */
  public setModalOpen(open: boolean): void {
    this.setModalActive(open);
  }

  public isDirectionHeld(direction: MovementDirection): boolean {
    return (this.heldDirections.get(direction)?.size ?? 0) > 0;
  }

  public getHeldDirections(): readonly MovementDirection[] {
    return MOVEMENT_DIRECTIONS.filter((direction) => this.isDirectionHeld(direction));
  }

  public getMovementVector(): MovementVector {
    const horizontal = Number(this.isDirectionHeld("right")) - Number(this.isDirectionHeld("left"));
    const vertical = Number(this.isDirectionHeld("down")) - Number(this.isDirectionHeld("up"));
    return {
      x: Math.sign(horizontal) as -1 | 0 | 1,
      y: Math.sign(vertical) as -1 | 0 | 1,
    };
  }

  /** Fires a non-held action from application code through the same modal gate. */
  public trigger(type: TriggerInputActionName, source: InputSource = "programmatic"): boolean {
    if (this.destroyed || (this.modalActive && !MODAL_ACTIONS.has(type))) return false;
    this.publish({ type, phase: "trigger", source });
    return true;
  }

  /** Sets a virtual direction, useful for non-DOM touch adapters and tests. */
  public setDirectionHeld(
    direction: MovementDirection,
    active: boolean,
    token = `programmatic:${direction}`,
    source: InputSource = "programmatic",
  ): boolean {
    if (this.destroyed || (active && this.modalActive)) return false;
    return active
      ? this.pressDirection(direction, token, source)
      : this.releaseDirection(direction, token, source);
  }

  /** Sets virtual dash held state, useful for touch adapters without delegated DOM controls. */
  public setDashHeld(
    active: boolean,
    token = "programmatic:dash",
    source: InputSource = "programmatic",
  ): boolean {
    if (this.destroyed || (active && this.modalActive)) return false;
    return active ? this.pressDash(token, source) : this.releaseDash(token, source);
  }

  public releaseAll(): void {
    for (const direction of MOVEMENT_DIRECTIONS) {
      const tokens = this.heldDirections.get(direction);
      if (!tokens || tokens.size === 0) continue;
      tokens.clear();
      this.publish({ type: "move", direction, phase: "end", active: false, source: "programmatic" });
    }

    if (this.heldDashTokens.size > 0) {
      this.heldDashTokens.clear();
      this.publish({ type: "dash", phase: "end", active: false, source: "programmatic" });
    }

    this.heldPointers.clear();
  }

  public destroy(): void {
    if (this.destroyed) return;
    this.detach();
    this.releaseAll();
    this.listeners.clear();
    this.destroyed = true;
  }

  private readonly handleKeyDown = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || this.destroyed) return;
    if (isEditableTarget(event.target)) return;
    if ((event.code === "Enter" || event.code === "Space") && usesNativeKeyboardActivation(event.target)) {
      return;
    }

    const binding = getKeyboardBinding(event.code, this.modalActive);
    if (!binding) return;
    if (this.modalActive && !this.isBindingAllowedInModal(binding)) return;

    if (this.preventDefault) event.preventDefault();
    const token = `keyboard:${event.code}`;

    if (binding.type === "move") {
      if (!event.repeat) this.pressDirection(binding.direction, token, "keyboard");
      return;
    }

    if (binding.type === "dash") {
      if (!event.repeat) this.pressDash(token, "keyboard");
      return;
    }

    if (!event.repeat) this.trigger(binding.type, "keyboard");
  };

  private readonly handleKeyUp = (event: Event): void => {
    if (!(event instanceof KeyboardEvent) || this.destroyed) return;
    const binding = getKeyboardBinding(event.code, false);
    if (!binding) return;

    if (this.preventDefault && !isEditableTarget(event.target)) event.preventDefault();
    const token = `keyboard:${event.code}`;
    if (binding.type === "move") this.releaseDirection(binding.direction, token, "keyboard");
    if (binding.type === "dash") this.releaseDash(token, "keyboard");
  };

  private readonly handlePointerDown = (event: Event): void => {
    if (!(event instanceof PointerEvent) || this.destroyed) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const element = controlElementFromTarget(event.target);
    if (!element) return;
    const binding = bindingFromElement(element);
    if (!binding || (this.modalActive && !this.isBindingAllowedInModal(binding))) return;

    if (this.preventDefault) event.preventDefault();
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional (and absent in some test DOM implementations).
    }

    const token = `pointer:${event.pointerId}`;
    if (binding.type === "move") {
      this.releasePointer(event.pointerId);
      this.heldPointers.set(event.pointerId, { binding, token });
      this.pressDirection(binding.direction, token, "pointer");
      return;
    }

    if (binding.type === "dash") {
      this.releasePointer(event.pointerId);
      this.heldPointers.set(event.pointerId, { binding, token });
      this.pressDash(token, "pointer");
      return;
    }

    this.trigger(binding.type, "pointer");
  };

  private readonly handlePointerRelease = (event: Event): void => {
    if (!(event instanceof PointerEvent) || this.destroyed) return;
    this.releasePointer(event.pointerId);
  };

  private readonly handleAccessibleClick = (event: Event): void => {
    if (!(event instanceof MouseEvent) || event.detail !== 0 || this.destroyed) return;
    const element = controlElementFromTarget(event.target);
    if (!element) return;
    const binding = bindingFromElement(element);
    if (!binding || binding.type === "move" || binding.type === "dash") return;
    if (this.modalActive && !this.isBindingAllowedInModal(binding)) return;
    if (this.preventDefault) event.preventDefault();
    this.trigger(binding.type, "pointer");
  };

  private readonly handleBlur = (): void => {
    this.releaseAll();
  };

  private readonly handleVisibilityChange = (): void => {
    if (browserDocument()?.hidden) this.releaseAll();
  };

  private isBindingAllowedInModal(binding: ControlBinding): boolean {
    return binding.type !== "move" && binding.type !== "dash" && MODAL_ACTIONS.has(binding.type);
  }

  private pressDirection(direction: MovementDirection, token: string, source: InputSource): boolean {
    const tokens = this.heldDirections.get(direction);
    if (!tokens || tokens.has(token)) return false;
    const wasInactive = tokens.size === 0;
    tokens.add(token);
    if (wasInactive) {
      this.publish({ type: "move", direction, phase: "start", active: true, source });
    }
    return true;
  }

  private releaseDirection(direction: MovementDirection, token: string, source: InputSource): boolean {
    const tokens = this.heldDirections.get(direction);
    if (!tokens?.delete(token)) return false;
    if (tokens.size === 0) {
      this.publish({ type: "move", direction, phase: "end", active: false, source });
    }
    return true;
  }

  private pressDash(token: string, source: InputSource): boolean {
    if (this.heldDashTokens.has(token)) return false;
    const wasInactive = this.heldDashTokens.size === 0;
    this.heldDashTokens.add(token);
    if (wasInactive) this.publish({ type: "dash", phase: "start", active: true, source });
    return true;
  }

  private releaseDash(token: string, source: InputSource): boolean {
    if (!this.heldDashTokens.delete(token)) return false;
    if (this.heldDashTokens.size === 0) {
      this.publish({ type: "dash", phase: "end", active: false, source });
    }
    return true;
  }

  private releasePointer(pointerId: number): void {
    const held = this.heldPointers.get(pointerId);
    if (!held) return;
    this.heldPointers.delete(pointerId);
    if (held.binding.type === "move") {
      this.releaseDirection(held.binding.direction, held.token, "pointer");
    } else {
      this.releaseDash(held.token, "pointer");
    }
  }

  private publish(action: InputAction): void {
    for (const listener of [...this.listeners]) listener(action);
  }
}
