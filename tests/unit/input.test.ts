import { describe, expect, it } from "vitest";

import {
  ActionInput,
  MOVEMENT_DIRECTIONS,
  getKeyboardBinding,
  parseControlBinding,
} from "../../src/game/input";
import type { InputAction } from "../../src/game/input";

describe("input bindings", () => {
  it("normalizes pointer control values into semantic actions", () => {
    expect(parseControlBinding("move", "up")).toEqual({
      type: "move",
      direction: "up",
    });
    expect(parseControlBinding("move-left")).toEqual({
      type: "move",
      direction: "left",
    });
    expect(parseControlBinding("RIGHT")).toEqual({
      type: "move",
      direction: "right",
    });
    expect(parseControlBinding("investigate")).toEqual({ type: "interact" });
    expect(parseControlBinding("notebook")).toEqual({ type: "open-note" });
    expect(parseControlBinding("items")).toEqual({ type: "open-inventory" });
    expect(parseControlBinding("menu")).toEqual({ type: "pause" });
    expect(parseControlBinding("dash")).toEqual({ type: "dash" });

    expect(parseControlBinding("move", "diagonal")).toBeNull();
    expect(parseControlBinding("unknown-action")).toBeNull();
    expect(parseControlBinding(null)).toBeNull();
  });

  it("maps keyboard controls and switches confirm/cancel behavior for modals", () => {
    expect(MOVEMENT_DIRECTIONS).toEqual(["up", "down", "left", "right"]);
    expect(getKeyboardBinding("ArrowUp", false)).toEqual({
      type: "move",
      direction: "up",
    });
    expect(getKeyboardBinding("KeyD", false)).toEqual({
      type: "move",
      direction: "right",
    });
    expect(getKeyboardBinding("KeyN", false)).toEqual({ type: "open-note" });
    expect(getKeyboardBinding("KeyI", false)).toEqual({
      type: "open-inventory",
    });
    expect(getKeyboardBinding("ShiftLeft", false)).toEqual({ type: "dash" });

    expect(getKeyboardBinding("Enter", false)).toEqual({ type: "interact" });
    expect(getKeyboardBinding("Space", true)).toEqual({ type: "confirm" });
    expect(getKeyboardBinding("Escape", false)).toEqual({ type: "pause" });
    expect(getKeyboardBinding("Escape", true)).toEqual({ type: "cancel" });
    expect(getKeyboardBinding("Backspace", true)).toEqual({ type: "cancel" });
    expect(getKeyboardBinding("Backspace", false)).toBeNull();
    expect(getKeyboardBinding("F12", false)).toBeNull();
  });
});

describe("ActionInput programmatic controls", () => {
  it("deduplicates held tokens and derives an opposing-direction-safe vector", () => {
    const input = new ActionInput({
      autoAttach: false,
      keyboardTarget: null,
      pointerTarget: null,
    });
    const actions: InputAction[] = [];
    input.subscribe((action) => actions.push(action));

    expect(input.setDirectionHeld("right", true, "right-a")).toBe(true);
    expect(input.setDirectionHeld("right", true, "right-a")).toBe(false);
    expect(input.setDirectionHeld("right", true, "right-b")).toBe(true);
    expect(input.movementVector).toEqual({ x: 1, y: 0 });
    expect(actions).toHaveLength(1);

    expect(input.setDirectionHeld("left", true, "left-a")).toBe(true);
    expect(input.movementVector).toEqual({ x: 0, y: 0 });
    expect(input.getHeldDirections()).toEqual(["left", "right"]);

    expect(input.setDirectionHeld("right", false, "right-a")).toBe(true);
    expect(actions.filter((action) => action.type === "move")).toHaveLength(2);
    expect(input.setDirectionHeld("right", false, "right-b")).toBe(true);
    expect(input.movementVector).toEqual({ x: -1, y: 0 });
    expect(actions.at(-1)).toEqual({
      type: "move",
      direction: "right",
      phase: "end",
      active: false,
      source: "programmatic",
    });

    expect(input.setDirectionHeld("left", false, "left-a")).toBe(true);
    expect(input.movementVector).toEqual({ x: 0, y: 0 });
  });

  it("publishes dash and trigger actions and honors unsubscription", () => {
    const input = new ActionInput({ autoAttach: false });
    const actions: InputAction[] = [];
    const unsubscribe = input.subscribe((action) => actions.push(action));

    expect(input.setDashHeld(true, "dash-a")).toBe(true);
    expect(input.setDashHeld(true, "dash-a")).toBe(false);
    expect(input.isDashHeld).toBe(true);
    expect(input.trigger("open-note")).toBe(true);
    expect(input.setDashHeld(false, "dash-a")).toBe(true);
    expect(input.isDashHeld).toBe(false);

    expect(actions).toEqual([
      {
        type: "dash",
        phase: "start",
        active: true,
        source: "programmatic",
      },
      { type: "open-note", phase: "trigger", source: "programmatic" },
      {
        type: "dash",
        phase: "end",
        active: false,
        source: "programmatic",
      },
    ]);

    unsubscribe();
    unsubscribe();
    input.trigger("open-inventory");
    expect(actions).toHaveLength(3);
  });

  it("releases held controls and gates gameplay actions while a modal is active", () => {
    const input = new ActionInput({ autoAttach: false });
    const actions: InputAction[] = [];
    input.subscribe((action) => actions.push(action));
    input.setDirectionHeld("up", true, "up-a");
    input.setDashHeld(true, "dash-a");

    input.setModalActive(true);
    expect(input.isModalActive).toBe(true);
    expect(input.movementVector).toEqual({ x: 0, y: 0 });
    expect(input.isDashHeld).toBe(false);
    expect(input.setDirectionHeld("up", true, "blocked")).toBe(false);
    expect(input.setDashHeld(true, "blocked")).toBe(false);
    expect(input.trigger("interact")).toBe(false);
    expect(input.trigger("open-note")).toBe(false);
    expect(input.trigger("confirm")).toBe(true);
    expect(input.trigger("cancel")).toBe(true);

    expect(actions.slice(-4)).toEqual([
      {
        type: "move",
        direction: "up",
        phase: "end",
        active: false,
        source: "programmatic",
      },
      {
        type: "dash",
        phase: "end",
        active: false,
        source: "programmatic",
      },
      { type: "confirm", phase: "trigger", source: "programmatic" },
      { type: "cancel", phase: "trigger", source: "programmatic" },
    ]);

    input.setModalOpen(false);
    expect(input.trigger("interact")).toBe(true);
  });

  it("attaches idempotently and becomes inert after destruction", () => {
    const input = new ActionInput({
      autoAttach: false,
      keyboardTarget: null,
      pointerTarget: null,
    });

    expect(input.isAttached).toBe(false);
    input.attach();
    input.attach();
    expect(input.isAttached).toBe(true);
    input.detach();
    input.detach();
    expect(input.isAttached).toBe(false);

    input.destroy();
    input.destroy();
    expect(input.isDestroyed).toBe(true);
    expect(input.trigger("interact")).toBe(false);
    expect(input.setDirectionHeld("down", true)).toBe(false);
    input.attach();
    expect(input.isAttached).toBe(false);
  });
});
