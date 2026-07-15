import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import { loadScenario } from "./helpers";

interface RectSnapshot {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly right: number;
  readonly bottom: number;
}

const VIEWPORTS = [
  { width: 1_280, height: 720 },
  { width: 1_366, height: 768 },
  { width: 1_536, height: 864 },
  { width: 1_920, height: 1_080 },
  { width: 2_560, height: 1_440 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
] as const;

async function readStageGeometry(page: Page): Promise<{
  readonly stage: RectSnapshot;
  readonly world: RectSnapshot;
  readonly canvas: RectSnapshot;
  readonly ui: RectSnapshot;
  readonly hud: RectSnapshot;
  readonly intrinsic: { readonly width: number; readonly height: number };
  readonly documentWidth: number;
}> {
  return page.evaluate(() => {
    const rect = (selector: string): RectSnapshot => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) throw new Error(`Missing ${selector}`);
      const bounds = node.getBoundingClientRect();
      return {
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        right: bounds.right,
        bottom: bounds.bottom,
      };
    };
    const canvas = document.querySelector<HTMLCanvasElement>(".game-world canvas");
    if (!canvas) throw new Error("Missing game canvas");
    return {
      stage: rect(".game-stage"),
      world: rect(".game-world"),
      canvas: rect(".game-world canvas"),
      ui: rect(".game-stage-ui"),
      hud: rect(".game-hud"),
      intrinsic: { width: canvas.width, height: canvas.height },
      documentWidth: document.documentElement.scrollWidth,
    };
  });
}

function expectContained(inner: RectSnapshot, outer: RectSnapshot, tolerance = 1): void {
  expect(inner.x).toBeGreaterThanOrEqual(outer.x - tolerance);
  expect(inner.y).toBeGreaterThanOrEqual(outer.y - tolerance);
  expect(inner.right).toBeLessThanOrEqual(outer.right + tolerance);
  expect(inner.bottom).toBeLessThanOrEqual(outer.bottom + tolerance);
}

test.describe("shared Canvas and DOM game stage", () => {
  for (const viewport of VIEWPORTS) {
    test(`${viewport.width}x${viewport.height} stays centered and synchronized`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loadScenario(page, "waiting-mid");
      const geometry = await readStageGeometry(page);

      const left = geometry.stage.x;
      const right = viewport.width - geometry.stage.right;
      const top = geometry.stage.y;
      const bottom = viewport.height - geometry.stage.bottom;
      expect(Math.abs(left - right)).toBeLessThanOrEqual(2);
      if (viewport.width > viewport.height) {
        expect(Math.abs(top - bottom)).toBeLessThanOrEqual(2);
        expect(geometry.stage.width / geometry.stage.height).toBeCloseTo(16 / 9, 2);
      } else {
        expect(geometry.stage).toMatchObject({ x: 0, y: 0, width: viewport.width, height: viewport.height });
      }

      for (const layer of [geometry.world, geometry.canvas, geometry.ui]) {
        expect(layer.x).toBeCloseTo(geometry.stage.x, 0);
        expect(layer.y).toBeCloseTo(geometry.stage.y, 0);
        expect(layer.width).toBeCloseTo(geometry.stage.width, 0);
        expect(layer.height).toBeCloseTo(geometry.stage.height, 0);
      }
      expectContained(geometry.hud, geometry.stage);
      expect(geometry.intrinsic.width).toBeGreaterThanOrEqual(Math.floor(geometry.canvas.width));
      expect(geometry.intrinsic.height).toBeGreaterThanOrEqual(Math.floor(geometry.canvas.height));
      expect(geometry.documentWidth).toBe(viewport.width);

      if (viewport.width === 1_920 && viewport.height === 1_080) {
        expect(geometry.stage.height).toBeGreaterThanOrEqual(972);
      }
    });
  }

  for (const viewport of [{ width: 1_280, height: 720 }, { width: 390, height: 844 }] as const) {
    test(`dialogue remains inside the ${viewport.width}x${viewport.height} stage`, async ({ page }) => {
      await page.setViewportSize(viewport);
      await loadScenario(page, "mobile-dialogue");
      await page.keyboard.press("KeyE");
      const dialogue = page.locator(".dialogue-layer");
      await expect(dialogue).toBeVisible();
      const [stageBounds, dialogueBounds] = await Promise.all([
        page.locator(".game-stage").boundingBox(),
        dialogue.boundingBox(),
      ]);
      expect(stageBounds).not.toBeNull();
      expect(dialogueBounds).not.toBeNull();
      if (!stageBounds || !dialogueBounds) return;
      expectContained(
        { ...dialogueBounds, right: dialogueBounds.x + dialogueBounds.width, bottom: dialogueBounds.y + dialogueBounds.height },
        { ...stageBounds, right: stageBounds.x + stageBounds.width, bottom: stageBounds.y + stageBounds.height },
      );
    });
  }
});
