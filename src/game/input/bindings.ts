import type { ControlBinding, MovementDirection } from "./actions";

export const KEYBOARD_DIRECTIONS: Readonly<Record<string, MovementDirection>> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
};

export const KEYBOARD_ACTIONS: Readonly<Record<string, ControlBinding>> = {
  KeyE: { type: "interact" },
  KeyN: { type: "open-note" },
  KeyI: { type: "open-inventory" },
  KeyB: { type: "open-inventory" },
  KeyP: { type: "pause" },
  ShiftLeft: { type: "dash" },
  ShiftRight: { type: "dash" },
};

export function getKeyboardBinding(code: string, modalActive: boolean): ControlBinding | null {
  const direction = KEYBOARD_DIRECTIONS[code];
  if (direction) return { type: "move", direction };

  if (code === "Enter" || code === "Space" || code === "KeyE") {
    return { type: modalActive ? "confirm" : "interact" };
  }

  if (code === "Escape" || (modalActive && code === "Backspace")) {
    return { type: modalActive ? "cancel" : "pause" };
  }

  return KEYBOARD_ACTIONS[code] ?? null;
}
