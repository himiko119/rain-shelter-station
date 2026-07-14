import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  holdKey,
  loadScenario,
  openGame,
  snapshot,
  stabilizeVisuals,
  waitForGameIdle,
} from "./helpers";

const runtime = globalThis as typeof globalThis & {
  readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> };
};
const requestedPhase = runtime.process?.env?.VISUAL_PHASE;
const requestedArtifactRoot = runtime.process?.env?.VISUAL_ARTIFACT_ROOT;
const phase = requestedPhase ?? "after";

if (phase !== "before" && phase !== "after") {
  throw new Error(`VISUAL_PHASE must be "before" or "after", received: ${phase}`);
}

const ARTIFACT_ROOT = requestedPhase
  ? requestedArtifactRoot ?? `artifacts/visual-overhaul/${phase}`
  : null;

test.setTimeout(240_000);

async function capture(
  page: Page,
  directory: "desktop" | "mobile",
  fileName: string,
  viewport: { readonly width: number; readonly height: number },
  waitForToast = true,
): Promise<void> {
  if (waitForToast) await expect(page.locator(".toast")).toBeHidden({ timeout: 3_000 });
  await stabilizeVisuals(page);
  expect(await page.evaluate(() => ({ width: window.innerWidth, height: window.innerHeight }))).toEqual(viewport);

  const screenshot = await page.screenshot({
    ...(ARTIFACT_ROOT ? { path: `${ARTIFACT_ROOT}/${directory}/${fileName}` } : {}),
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
}

async function holdUntilArea(page: Page, key: string, areaId: string, timeout = 10_000): Promise<void> {
  await page.keyboard.down(key);
  try {
    await expect.poll(async () => (await snapshot(page)).areaId, { timeout }).toBe(areaId);
  } catch (error) {
    const state = await snapshot(page);
    throw new Error(
      `Failed to enter ${areaId} with ${key}; remained in ${state.areaId} at ${JSON.stringify(state.playerPosition)}.`,
      { cause: error },
    );
  } finally {
    await page.keyboard.up(key);
  }
  await waitForGameIdle(page);
}

async function enterTicketGate(page: Page): Promise<void> {
  await enterFootbridge(page);
  await holdKey(page, "ArrowUp", 1_700);
  await holdUntilArea(page, "ArrowLeft", "area_concourse", 7_000);
}

async function enterFootbridge(page: Page): Promise<void> {
  await loadScenario(page, "rain-platform");
  await holdKey(page, "ArrowLeft", 450);
  await holdUntilArea(page, "ArrowUp", "area_footbridge");
}

async function reachFinalChoice(page: Page): Promise<void> {
  const finalChoice = page.getByRole("dialog", { name: "最後の選択" });
  for (let step = 0; step < 6 && !(await finalChoice.isVisible()); step += 1) {
    await holdKey(page, "ArrowRight", 350);
    await page.keyboard.press("KeyE");
  }
  await expect(finalChoice).toBeVisible();
}

test.describe("visual overhaul desktop baseline", () => {
  test("captures thirteen desktop states at 1280x720", async ({ page }) => {
    const viewport = { width: 1280, height: 720 } as const;

    await openGame(page);
    await expect(page).toHaveTitle("雨宿り駅の忘れもの");
    await expect(page.getByRole("heading", { name: /雨宿り駅の\s*忘れもの/ })).toBeVisible();
    await capture(page, "desktop", "01-title-1280x720.png", viewport);

    await loadScenario(page, "fresh-game");
    await expect(page.locator(".game-world canvas")).toBeVisible();
    await expect(page.getByText("待合室", { exact: true })).toBeVisible();
    expect((await snapshot(page)).areaId).toBe("area_waiting_room");
    await capture(page, "desktop", "02-waiting-room-1280x720.png", viewport);

    await enterTicketGate(page);
    await expect(page.getByText("改札口と券売機", { exact: true })).toBeVisible();
    expect((await snapshot(page)).areaId).toBe("area_concourse");
    await capture(page, "desktop", "03-ticket-gate-1280x720.png", viewport);

    await loadScenario(page, "photo-return-ready");
    await expect(page.getByText("駅員室", { exact: true })).toBeVisible();
    expect((await snapshot(page)).areaId).toBe("area_station_office");
    await capture(page, "desktop", "04-station-office-1280x720.png", viewport);

    await enterFootbridge(page);
    await expect(page.getByText("跨線橋", { exact: true })).toBeVisible();
    expect((await snapshot(page)).areaId).toBe("area_footbridge");
    await capture(page, "desktop", "05-footbridge-1280x720.png", viewport);

    await loadScenario(page, "rain-platform");
    await expect(page.getByText("雨のホーム", { exact: true })).toBeVisible();
    expect((await snapshot(page)).areaId).toBe("area_rain_platform");
    await capture(page, "desktop", "06-rain-platform-1280x720.png", viewport);

    await loadScenario(page, "umbrella-return-ready");
    await page.keyboard.press("KeyE");
    const dialogue = page.getByRole("dialog");
    await expect(dialogue).toBeVisible();
    await expect(dialogue.getByRole("heading", { name: "赤い長靴の子" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(dialogue.getByText(/おかあさん、明るいところで待っててって。/)).toBeVisible();
    await capture(page, "desktop", "07-dialogue-1280x720.png", viewport);

    await loadScenario(page, "after-umbrella");
    await page.keyboard.press("KeyN");
    const notebook = page.getByRole("dialog", { name: "ナギのノート" });
    await expect(notebook).toBeVisible();
    await notebook.getByRole("tab", { name: "手がかり" }).click();
    await expect(notebook.getByRole("heading", { name: "小さな濡れ足跡" })).toBeVisible();
    await capture(page, "desktop", "08-note-1280x720.png", viewport);

    await loadScenario(page, "umbrella-return-ready");
    await page.keyboard.press("KeyI");
    const inventory = page.getByRole("dialog", { name: "所持品" });
    await expect(inventory).toBeVisible();
    await expect(inventory.getByRole("heading", { name: "赤い傘" })).toBeVisible();
    await expect(inventory.getByText("所持中", { exact: true })).toBeVisible();
    await capture(page, "desktop", "09-inventory-1280x720.png", viewport);

    await loadScenario(page, "fresh-game");
    await holdKey(page, "ArrowLeft", 1_000);
    await page.keyboard.press("KeyE");
    await expect.poll(async () => (await snapshot(page)).inventoryItemIds).toContain("item_red_umbrella");
    const acquisition = page.getByRole("dialog");
    await expect(acquisition).toBeVisible();
    await expect(acquisition.getByRole("heading", { name: "ナギ" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator(".toast")).toHaveText("「赤い傘」を拾った");
    await expect(page.locator(".toast")).toBeVisible();
    await capture(page, "desktop", "10-item-acquired-1280x720.png", viewport, false);

    await loadScenario(page, "memory-red-pending");
    const memory = page.locator(".screen-layer--memory");
    await expect(memory).toBeVisible();
    await expect(memory.getByRole("heading", { name: "明かりの下の星" })).toBeVisible();
    await capture(page, "desktop", "11-memory-1280x720.png", viewport);

    await loadScenario(page, "ending-b-ready");
    await reachFinalChoice(page);
    const finalChoice = page.getByRole("dialog", { name: "最後の選択" });
    await expect(finalChoice.getByRole("button", { name: /始発を待つ/ })).toBeVisible();
    await expect(finalChoice.getByRole("button", { name: /ここに残る/ })).toBeVisible();
    await capture(page, "desktop", "12-final-choice-1280x720.png", viewport);

    await finalChoice.getByRole("button", { name: /始発を待つ/ }).click();
    const ending = page.locator(".screen-layer--ending_first_train");
    await expect(ending).toBeVisible();
    await expect(ending.getByRole("heading", { level: 1, name: "始発", exact: true })).toBeVisible();
    expect((await snapshot(page)).activeEndingId).toBe("ending_first_train");
    await capture(page, "desktop", "13-ending-b-1280x720.png", viewport);

    if (phase === "after") {
      await loadScenario(page, "fresh-game");
      await page.keyboard.press("Escape");
      const pauseMenu = page.locator(".modal-card");
      await expect(pauseMenu).toBeVisible();
      await pauseMenu.locator(".menu-button").nth(2).click();
      await expect(page.locator(".settings-form")).toBeVisible();
      await capture(page, "desktop", "16-settings-1280x720.png", viewport);

      await loadScenario(page, "ending-a-ready");
      await reachFinalChoice(page);
      await page.locator(".menu-list--final-choice .menu-button").nth(0).click();
      await expect(page.locator(".screen-layer--ending_last_train")).toBeVisible();
      expect((await snapshot(page)).activeEndingId).toBe("ending_last_train");
      await capture(page, "desktop", "17-ending-a-1280x720.png", viewport);

      await loadScenario(page, "ending-a-ready");
      await reachFinalChoice(page);
      await page.locator(".menu-list--final-choice .menu-button").nth(1).click();
      await expect(page.locator(".screen-layer--ending_rain_shelter")).toBeVisible();
      expect((await snapshot(page)).activeEndingId).toBe("ending_rain_shelter");
      await capture(page, "desktop", "18-ending-c-1280x720.png", viewport);
    }
  });
});

test.describe("visual overhaul mobile baseline", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("captures exploration and notebook at 390x844", async ({ page }) => {
    const viewport = { width: 390, height: 844 } as const;

    await loadScenario(page, "fresh-game");
    await expect(page.locator(".game-world canvas")).toBeVisible();
    const touchControls = page.locator(".touch-controls");
    await expect(touchControls).toBeVisible();
    await expect(touchControls.getByRole("button", { name: "調べる・決定" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await capture(page, "mobile", "14-mobile-exploration-390x844.png", viewport);

    await loadScenario(page, "after-umbrella");
    const noteButton = page.locator(".touch-controls").getByRole("button", { name: "ノート", exact: true });
    await expect(noteButton).toBeVisible();
    await noteButton.click();
    const notebook = page.getByRole("dialog", { name: "ナギのノート" });
    await expect(notebook).toBeVisible();
    await notebook.getByRole("tab", { name: "手がかり" }).click();
    await expect(notebook.getByRole("heading", { name: "小さな濡れ足跡" })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
    await capture(page, "mobile", "15-mobile-note-390x844.png", viewport);

    if (phase === "after") {
      await loadScenario(page, "umbrella-return-ready");
      await page.keyboard.press("KeyI");
      await expect(page.locator(".inventory-grid")).toBeVisible();
      await capture(page, "mobile", "19-mobile-inventory-390x844.png", viewport);

      await loadScenario(page, "umbrella-return-ready");
      await page.keyboard.press("KeyE");
      await expect(page.locator(".dialogue-layer")).toBeVisible();
      await capture(page, "mobile", "20-mobile-dialogue-390x844.png", viewport);
    }
  });
});
