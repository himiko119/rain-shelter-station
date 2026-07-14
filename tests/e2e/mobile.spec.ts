import { expect, test } from "./fixtures";
import { loadScenario, snapshot, stabilizeVisuals, waitForGameIdle } from "./helpers";

test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});

test("390x844 layout stays in bounds and supports touch movement and menus", async ({ page }) => {
  await loadScenario(page, "fresh-game");

  const touchControls = page.locator(".touch-controls");
  await expect(touchControls).toBeVisible();
  await expect(touchControls.getByRole("button", { name: "上へ移動" })).toBeVisible();
  await expect(touchControls.getByRole("button", { name: "調べる・決定" })).toBeVisible();

  const before = await snapshot(page);
  const left = touchControls.getByRole("button", { name: "左へ移動" });
  await left.dispatchEvent("pointerdown", {
    pointerId: 7,
    pointerType: "touch",
    button: 0,
  });
  await page.waitForTimeout(700);
  await left.dispatchEvent("pointerup", {
    pointerId: 7,
    pointerType: "touch",
    button: 0,
  });
  await waitForGameIdle(page);
  expect((await snapshot(page)).playerPosition.x).toBeLessThan(before.playerPosition.x);

  await touchControls.getByRole("button", { name: "ノート", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "ナギのノート" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "目的" })).toBeVisible();
  await page.getByRole("button", { name: "閉じる ×" }).click();

  const beforeOutsideCameraTap = await snapshot(page);
  await page.mouse.click(195, 670);
  await page.waitForTimeout(350);
  await waitForGameIdle(page);
  expect((await snapshot(page)).playerPosition).toEqual(beforeOutsideCameraTap.playerPosition);

  const layout = await page.evaluate(() => {
    const rect = (selector: string): DOMRect => {
      const node = document.querySelector<HTMLElement>(selector);
      if (!node) throw new Error(`Missing layout node: ${selector}`);
      return node.getBoundingClientRect();
    };
    const objective = rect(".objective-chip");
    const controls = rect(".touch-controls");
    const world = rect(".game-world canvas");
    const touchTargets = [...document.querySelectorAll<HTMLElement>(".touch-controls button")]
      .map((node) => node.getBoundingClientRect())
      .map(({ width, height }) => ({ width, height }));

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      objective: { top: objective.top, right: objective.right, bottom: objective.bottom, left: objective.left },
      controls: { top: controls.top, right: controls.right, bottom: controls.bottom, left: controls.left },
      world: { top: world.top, right: world.right, bottom: world.bottom, left: world.left },
      touchTargets,
    };
  });

  expect(layout.viewport).toEqual({ width: 390, height: 844 });
  expect(layout.documentWidth).toBeLessThanOrEqual(390);
  expect(layout.bodyWidth).toBeLessThanOrEqual(390);
  for (const box of [layout.objective, layout.controls, layout.world]) {
    expect(box.left).toBeGreaterThanOrEqual(0);
    expect(box.right).toBeLessThanOrEqual(390);
    expect(box.top).toBeGreaterThanOrEqual(0);
    expect(box.bottom).toBeLessThanOrEqual(844);
  }
  expect(layout.objective.bottom).toBeLessThanOrEqual(layout.controls.top);
  for (const target of layout.touchTargets) {
    expect(target.width).toBeGreaterThanOrEqual(44);
    expect(target.height).toBeGreaterThanOrEqual(44);
  }

  await stabilizeVisuals(page);
  expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);
});
