import type { Page } from "@playwright/test";

import { expect, test } from "./fixtures";
import {
  advanceDialogueUntil,
  holdKey,
  loadScenario,
  openGame,
  snapshot,
  stabilizeVisuals,
} from "./helpers";

const ARTIFACT_DIRECTORY = "artifacts/playtest";

test.setTimeout(60_000);

async function capture(page: Page, fileName: string): Promise<void> {
  await expect(page.locator(".toast")).toBeHidden({ timeout: 3_000 });
  await stabilizeVisuals(page);
  const screenshot = await page.screenshot({
    path: `${ARTIFACT_DIRECTORY}/${fileName}`,
    animations: "disabled",
    caret: "hide",
    fullPage: false,
  });
  expect(screenshot.byteLength).toBeGreaterThan(10_000);
}

async function reachFinalChoice(page: Page): Promise<void> {
  const finalChoice = page.getByRole("dialog", { name: "最後の選択" });

  for (let step = 0; step < 6 && !(await finalChoice.isVisible()); step += 1) {
    await holdKey(page, "ArrowRight", 350);
    await page.keyboard.press("KeyE");
  }

  await expect(finalChoice).toBeVisible();
}

test.describe("desktop playtest captures", () => {
  test("captures the nine representative 1280x720 screens", async ({ page }) => {
    await openGame(page);
    await expect(page).toHaveTitle("雨宿り駅の忘れもの");
    await expect(page.getByRole("heading", { name: /雨宿り駅の\s*忘れもの/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /はじめから/ })).toBeVisible();
    await capture(page, "01-title-1280x720.png");

    await loadScenario(page, "fresh-game");
    await expect(page.locator(".game-world canvas")).toBeVisible();
    await expect(page.getByText("待合室", { exact: true })).toBeVisible();
    expect((await snapshot(page)).areaId).toBe("area_waiting_room");
    await capture(page, "02-waiting-room-1280x720.png");

    await loadScenario(page, "umbrella-return-ready");
    await page.keyboard.press("KeyE");
    const passengerDialogue = page.getByRole("dialog");
    await expect(passengerDialogue).toBeVisible();
    await expect(passengerDialogue.getByRole("heading", { name: "赤い長靴の子" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(
      passengerDialogue.getByText("おかあさん、明るいところで待っててって。雨、まだやまないね。", {
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, "03-dialogue-1280x720.png");

    await loadScenario(page, "after-umbrella");
    await page.keyboard.press("KeyN");
    const notebook = page.getByRole("dialog", { name: "ナギのノート" });
    await expect(notebook).toBeVisible();
    await notebook.getByRole("tab", { name: "手がかり" }).click();
    await expect(notebook.getByRole("tab", { name: "手がかり" })).toHaveAttribute("aria-selected", "true");
    await expect(notebook.getByRole("heading", { name: "小さな濡れ足跡" })).toBeVisible();
    await expect(notebook.getByRole("heading", { name: "白い星の補修" })).toBeVisible();
    await capture(page, "04-note-1280x720.png");

    await loadScenario(page, "umbrella-return-ready");
    await page.keyboard.press("KeyE");
    const returnButton = page.getByRole("button", { name: /「赤い傘」を返してみる/ });
    await advanceDialogueUntil(page, returnButton);
    await returnButton.locator(".menu-button__label").click();
    await expect.poll(async () => (await snapshot(page)).pendingMemoryId).toBe("memory_red_umbrella");
    const returnDialogue = page.getByRole("dialog");
    await expect(returnDialogue).toBeVisible();
    await expect(returnDialogue.getByRole("heading", { name: "赤い長靴の子" })).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(
      returnDialogue.getByText("これ、わたしの。ほら、白い星が同じ。", { exact: true }),
    ).toBeVisible();
    await capture(page, "05-item-return-1280x720.png");

    await loadScenario(page, "memory-red-pending");
    const memory = page.locator(".screen-layer--memory");
    await expect(memory).toBeVisible();
    await expect(memory.getByRole("heading", { name: "明かりの下の星" })).toBeVisible();
    await expect(
      memory.getByText("玄関の灯りの下で、母の針が赤い傘の裂け目を行き来する。", {
        exact: true,
      }),
    ).toBeVisible();
    await capture(page, "06-memory-1280x720.png");

    await loadScenario(page, "rain-platform");
    await expect(page.locator(".game-world canvas")).toBeVisible();
    await expect(page.getByText("雨のホーム", { exact: true })).toBeVisible();
    const platformState = await snapshot(page);
    expect(platformState.areaId).toBe("area_rain_platform");
    expect(platformState.returnedItemIds).toHaveLength(3);
    await capture(page, "07-rain-platform-1280x720.png");

    await loadScenario(page, "ending-b-ready");
    await reachFinalChoice(page);
    const finalChoice = page.getByRole("dialog", { name: "最後の選択" });
    await expect(finalChoice.getByRole("button", { name: /始発を待つ/ })).toBeVisible();
    await expect(finalChoice.getByRole("button", { name: /ここに残る/ })).toBeVisible();
    await capture(page, "08-final-choice-1280x720.png");

    await finalChoice.getByRole("button", { name: /始発を待つ/ }).click();
    const ending = page.locator(".screen-layer--ending_first_train");
    await expect(ending).toBeVisible();
    await expect(ending.getByRole("heading", { level: 1, name: "始発", exact: true })).toBeVisible();
    expect((await snapshot(page)).activeEndingId).toBe("ending_first_train");
    await capture(page, "09-ending-b-1280x720.png");
  });
});

test.describe("mobile playtest capture", () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });

  test("captures the 390x844 touch exploration screen", async ({ page }) => {
    await loadScenario(page, "fresh-game");
    await expect(page.locator(".game-world canvas")).toBeVisible();
    await expect(page.getByText("待合室", { exact: true })).toBeVisible();
    const touchControls = page.locator(".touch-controls");
    await expect(touchControls).toBeVisible();
    await expect(touchControls.getByRole("button", { name: "上へ移動" })).toBeVisible();
    await expect(touchControls.getByRole("button", { name: "調べる・決定" })).toBeVisible();

    const dimensions = await page.evaluate(() => ({
      width: window.innerWidth,
      height: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions).toEqual({ width: 390, height: 844, scrollWidth: 390 });
    await capture(page, "10-mobile-exploration-390x844.png");
  });
});
