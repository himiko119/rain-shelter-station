import { describe, expect, it } from "vitest";

import {
  CAMERA_WORLD_SIZE,
  classifyCameraLayout,
  resolveCameraLayout,
} from "../../src/phaser/view/CameraLayout";

describe("responsive camera layout", () => {
  it("keeps the simulation world fixed at 1120x630", () => {
    expect(CAMERA_WORLD_SIZE).toEqual({ width: 1_120, height: 630 });
    expect(Object.isFrozen(CAMERA_WORLD_SIZE)).toBe(true);
  });

  it("is deterministic and does not mutate its viewport input", () => {
    const viewport = Object.freeze({ width: 1_280, height: 720 });

    expect(resolveCameraLayout(viewport)).toEqual(resolveCameraLayout(viewport));
    expect(viewport).toEqual({ width: 1_280, height: 720 });
  });

  it.each([
    [{ width: 1_280, height: 720 }, "desktop"],
    [{ width: 1_920, height: 1_080 }, "desktop"],
    [{ width: 1_024, height: 768 }, "tablet"],
    [{ width: 820, height: 620 }, "tablet"],
    [{ width: 390, height: 844 }, "portrait"],
    [{ width: 768, height: 1_024 }, "portrait"],
  ] as const)("classifies %o as %s", (viewport, expected) => {
    expect(classifyCameraLayout(viewport)).toBe(expected);
  });

  it("shows the complete world on a 1280x720 desktop viewport", () => {
    const layout = resolveCameraLayout({ width: 1_280, height: 720 });

    expect(layout.mode).toBe("desktop");
    expect(layout.zoom.value).toBeLessThanOrEqual(layout.zoom.fitWorld);
    expect(layout.zoom.value).toBeGreaterThanOrEqual(layout.zoom.min);
    expect(layout.zoom.value).toBeLessThanOrEqual(layout.zoom.max);
    expect(layout.visibleWorld.width).toBeGreaterThanOrEqual(CAMERA_WORLD_SIZE.width);
    expect(layout.visibleWorld.height).toBeGreaterThanOrEqual(CAMERA_WORLD_SIZE.height);
    expect(layout.showsEntireWorld).toBe(true);
    expect(layout.tracking).toEqual({
      kind: "fixed",
      center: { x: 560, y: 315 },
    });
    expect(layout.safeArea.insets).toEqual({ top: 72, right: 20, bottom: 84, left: 20 });
  });

  it("caps a large desktop while retaining complete-world coverage", () => {
    const layout = resolveCameraLayout({ width: 1_920, height: 1_080 });

    expect(layout.zoom.value).toBe(1.2);
    expect(layout.zoom.max).toBe(1.2);
    expect(layout.showsEntireWorld).toBe(true);
  });

  it("uses a restrained follow and deadzone for tablet landscape", () => {
    const layout = resolveCameraLayout({ width: 1_024, height: 768 });

    expect(layout.mode).toBe("tablet");
    expect(layout.zoom.value).toBe(1.02);
    expect(layout.safeArea.width).toBe(992);
    expect(layout.safeArea.height).toBe(568);
    expect(layout.tracking.kind).toBe("follow");
    if (layout.tracking.kind !== "follow") throw new Error("Expected follow policy.");
    expect(layout.tracking.lerp).toEqual({ x: 0.09, y: 0.09 });
    expect(layout.tracking.deadzone).toEqual({
      width: 456.32,
      height: 215.84,
      unit: "screen-pixels",
    });
  });

  it("zooms and follows around the player on a 390x844 portrait viewport", () => {
    const layout = resolveCameraLayout({ width: 390, height: 844 });

    expect(layout.mode).toBe("portrait");
    expect(layout.zoom).toMatchObject({ value: 1.32, min: 1.25, max: 1.4 });
    expect(layout.visibleWorld.width).toBeLessThan(CAMERA_WORLD_SIZE.width);
    expect(layout.safeArea).toEqual({
      insets: { top: 62, right: 12, bottom: 303.84, left: 12 },
      x: 12,
      y: 62,
      width: 366,
      height: 478.16,
    });
    expect(layout.safeVisibleWorld.width).toBeCloseTo(277.273, 3);
    expect(layout.safeVisibleWorld.height).toBeCloseTo(362.242, 3);
    expect(layout.tracking.kind).toBe("follow");
    if (layout.tracking.kind !== "follow") throw new Error("Expected follow policy.");
    expect(layout.tracking.lerp).toEqual({ x: 0.12, y: 0.1 });
    expect(layout.tracking.deadzone).toEqual({
      width: 139.08,
      height: 114.758,
      unit: "screen-pixels",
    });
    expect(layout.tracking.screenFocusOffset).toEqual({ x: 0, y: -120.92 });
  });

  it("keeps portrait zoom within 1.25-1.4 across common phone widths", () => {
    expect(resolveCameraLayout({ width: 320, height: 568 }).zoom.value).toBe(1.25);
    expect(resolveCameraLayout({ width: 390, height: 844 }).zoom.value).toBe(1.32);
    expect(resolveCameraLayout({ width: 430, height: 932 }).zoom.value).toBe(1.4);
  });

  it("scales safety insets down without collapsing a tiny viewport", () => {
    const layout = resolveCameraLayout({ width: 200, height: 300 });

    expect(layout.safeArea.width).toBeGreaterThan(0);
    expect(layout.safeArea.height).toBeGreaterThan(0);
    expect(layout.safeArea.insets.top).toBeLessThanOrEqual(300 * 0.22);
    expect(layout.safeArea.insets.bottom).toBeLessThanOrEqual(300 * 0.36);
  });

  it.each([
    { width: 0, height: 720 },
    { width: 1_280, height: -1 },
    { width: Number.NaN, height: 720 },
    { width: 1_280, height: Number.POSITIVE_INFINITY },
  ])("rejects invalid viewport dimensions: %o", (viewport) => {
    expect(() => resolveCameraLayout(viewport)).toThrow(RangeError);
    expect(() => classifyCameraLayout(viewport)).toThrow(RangeError);
  });
});
