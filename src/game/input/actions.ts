export const MOVEMENT_DIRECTIONS = ["up", "down", "left", "right"] as const;

export type MovementDirection = (typeof MOVEMENT_DIRECTIONS)[number];

export const TRIGGER_INPUT_ACTIONS = [
  "interact",
  "open-note",
  "open-inventory",
  "pause",
  "confirm",
  "cancel",
] as const;

export type TriggerInputActionName = (typeof TRIGGER_INPUT_ACTIONS)[number];
export type InputActionName = "move" | TriggerInputActionName | "dash";
export type InputPhase = "start" | "end" | "trigger";
export type InputSource = "keyboard" | "pointer" | "programmatic";

export interface MoveInputAction {
  readonly type: "move";
  readonly direction: MovementDirection;
  readonly phase: "start" | "end";
  readonly active: boolean;
  readonly source: InputSource;
}

export interface DashInputAction {
  readonly type: "dash";
  readonly phase: "start" | "end";
  readonly active: boolean;
  readonly source: InputSource;
}

export interface TriggerInputAction {
  readonly type: TriggerInputActionName;
  readonly phase: "trigger";
  readonly source: InputSource;
}

export type InputAction = MoveInputAction | DashInputAction | TriggerInputAction;
export type InputActionListener = (action: InputAction) => void;

export interface MovementVector {
  readonly x: -1 | 0 | 1;
  readonly y: -1 | 0 | 1;
}

export interface MoveControlBinding {
  readonly type: "move";
  readonly direction: MovementDirection;
}

export interface DashControlBinding {
  readonly type: "dash";
}

export interface TriggerControlBinding {
  readonly type: TriggerInputActionName;
}

export type ControlBinding = MoveControlBinding | DashControlBinding | TriggerControlBinding;

const DIRECTION_SET: ReadonlySet<string> = new Set(MOVEMENT_DIRECTIONS);
const TRIGGER_ACTION_SET: ReadonlySet<string> = new Set(TRIGGER_INPUT_ACTIONS);

const ACTION_ALIASES: Readonly<Record<string, InputActionName | MovementDirection>> = {
  note: "open-note",
  notebook: "open-note",
  inventory: "open-inventory",
  items: "open-inventory",
  investigate: "interact",
  use: "interact",
  menu: "pause",
};

export function isMovementDirection(value: string): value is MovementDirection {
  return DIRECTION_SET.has(value);
}

export function isTriggerInputActionName(value: string): value is TriggerInputActionName {
  return TRIGGER_ACTION_SET.has(value);
}

/**
 * Converts a DOM control's data attributes to the same binding used by keyboard input.
 * Supported examples: `move-up`, `up`, `move` + `data-direction="up"`,
 * `interact`, `note`, `inventory`, `pause`, `confirm`, `cancel`, and `dash`.
 */
export function parseControlBinding(
  actionValue: string | null | undefined,
  directionValue?: string | null,
): ControlBinding | null {
  if (!actionValue) return null;

  const normalized = actionValue.trim().toLowerCase();
  const alias = ACTION_ALIASES[normalized] ?? normalized;

  if (alias === "move") {
    const direction = directionValue?.trim().toLowerCase() ?? "";
    return isMovementDirection(direction) ? { type: "move", direction } : null;
  }

  const moveMatch = /^(?:move-)?(up|down|left|right)$/.exec(alias);
  const matchedDirection = moveMatch?.[1];
  if (matchedDirection && isMovementDirection(matchedDirection)) {
    return { type: "move", direction: matchedDirection };
  }

  if (alias === "dash") return { type: "dash" };
  if (isTriggerInputActionName(alias)) return { type: alias };

  return null;
}
