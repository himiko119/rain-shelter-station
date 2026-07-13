import type { Locator, Page } from "@playwright/test";

import type { GameState } from "../../src/game/core/types";
import type { ScenarioId } from "../../src/game/debug/e2eBridge";

export async function openGame(page: Page): Promise<void> {
  await page.goto("/");
  await page.waitForFunction(() => window.__RAIN_SHELTER_E2E__ !== undefined);
  await page.evaluate(async () => window.__RAIN_SHELTER_E2E__?.ready());
}

export async function loadScenario(page: Page, scenarioId: ScenarioId): Promise<void> {
  await openGame(page);
  await page.evaluate(
    async (id) => window.__RAIN_SHELTER_E2E__?.loadScenario(id),
    scenarioId,
  );
}

export async function snapshot(page: Page): Promise<Readonly<GameState>> {
  return page.evaluate(() => {
    const bridge = window.__RAIN_SHELTER_E2E__;
    if (!bridge) throw new Error("The E2E bridge is not mounted.");
    return bridge.snapshot();
  });
}

export async function waitForGameIdle(page: Page): Promise<void> {
  await page.evaluate(async () => window.__RAIN_SHELTER_E2E__?.waitForIdle());
}

export async function stabilizeVisuals(page: Page): Promise<void> {
  await page.evaluate(async () => window.__RAIN_SHELTER_E2E__?.stabilizeVisuals());
}

export async function holdKey(page: Page, key: string, durationMs: number): Promise<void> {
  await page.keyboard.down(key);
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    await page.keyboard.up(key);
  }
  await waitForGameIdle(page);
}

export async function advanceDialogueUntil(
  page: Page,
  target: Locator,
  maxPresses = 16,
): Promise<void> {
  for (let index = 0; index < maxPresses; index += 1) {
    if (await target.isVisible()) return;
    await page.keyboard.press("Enter");
    await page.waitForTimeout(35);
  }

  if (!(await target.isVisible())) {
    throw new Error(`Dialogue did not reach the expected target after ${maxPresses} advances.`);
  }
}

export async function closeCurrentDialogue(page: Page, maxPresses = 12): Promise<void> {
  const dialogue = page.locator(".dialogue-layer");
  for (let index = 0; index < maxPresses; index += 1) {
    if (!(await dialogue.isVisible())) return;
    await page.keyboard.press("Enter");
    await page.waitForTimeout(35);
  }

  if (await dialogue.isVisible()) {
    throw new Error(`Dialogue remained open after ${maxPresses} advances.`);
  }
}
