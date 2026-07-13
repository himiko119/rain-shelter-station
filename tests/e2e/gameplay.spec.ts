import { expect, test } from "./fixtures";
import {
  advanceDialogueUntil,
  closeCurrentDialogue,
  holdKey,
  openGame,
  snapshot,
  waitForGameIdle,
} from "./helpers";

test("returns the first lost item through normal keyboard play and restores the save", async ({ page }) => {
  await openGame(page);

  await expect(page.getByRole("heading", { name: /雨宿り駅の\s*忘れもの/ })).toBeVisible();
  await expect(page.getByText("名前を忘れた夜、終電だけが来なかった。")).toBeVisible();
  await expect(page.getByRole("button", { name: /つづきから/ })).toBeDisabled();

  await page.getByRole("button", { name: /はじめから/ }).click();
  await advanceDialogueUntil(
    page,
    page.getByRole("heading", { name: "操作方法" }),
  );
  await expect(page.getByRole("dialog", { name: "操作方法" })).toBeVisible();
  await page.getByRole("button", { name: /駅を歩き始める/ }).click();

  await expect(page.getByText("待合室", { exact: true })).toBeVisible();
  await expect(page.getByText("00:00", { exact: true })).toBeVisible();
  const initial = await snapshot(page);

  await holdKey(page, "ArrowLeft", 700);
  const besideUmbrella = await snapshot(page);
  expect(besideUmbrella.playerPosition.x).toBeLessThan(initial.playerPosition.x);

  await page.keyboard.press("KeyE");
  await expect.poll(async () => (await snapshot(page)).inventoryItemIds).toContain(
    "item_red_umbrella",
  );
  await closeCurrentDialogue(page);

  await page.keyboard.press("KeyI");
  await expect(page.getByRole("dialog", { name: "所持品" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "赤い傘" })).toBeVisible();
  await expect(page.getByText("所持中", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "閉じる ×" }).click();

  await page.keyboard.press("KeyN");
  await expect(page.getByRole("dialog", { name: "ナギのノート" })).toBeVisible();
  await page.getByRole("tab", { name: "忘れもの" }).click();
  await expect(page.getByRole("heading", { name: /赤い傘/ })).toBeVisible();
  await page.getByRole("tab", { name: "手がかり" }).click();
  await expect(page.getByRole("heading", { name: /白い星の補修/ })).toBeVisible();
  await page.getByRole("button", { name: "閉じる ×" }).click();

  await holdKey(page, "ArrowDown", 700);
  await holdKey(page, "ArrowRight", 300);
  await expect(page.getByRole("status").filter({ hasText: "床の足跡を見る" })).toBeVisible();
  await page.keyboard.press("KeyE");
  await expect.poll(async () => (await snapshot(page)).foundClueIds).toContain(
    "clue_umbrella_footprints",
  );
  await closeCurrentDialogue(page);

  const childPrompt = page
    .getByRole("status")
    .filter({ hasText: "声をかける" });
  await holdKey(page, "ArrowUp", 450);
  for (let step = 0; step < 28 && !(await childPrompt.isVisible()); step += 1) {
    await holdKey(page, "ArrowRight", 150);
  }
  await expect(childPrompt).toBeVisible();

  await page.keyboard.press("KeyE");
  const returnButton = page.getByRole("button", { name: /赤い傘.*返してみる/ });
  await advanceDialogueUntil(page, returnButton);
  await returnButton.locator(".menu-button__label").click();

  await advanceDialogueUntil(
    page,
    page.getByRole("heading", { name: "明かりの下の星" }),
  );
  await page.getByRole("button", { name: "記憶をたどる" }).click();
  await page.getByRole("button", { name: "記憶をたどる" }).click();
  await page.getByRole("button", { name: "駅へ戻る" }).click();

  await expect(page.getByText("00:18", { exact: true })).toBeVisible();
  const returned = await snapshot(page);
  expect(returned.returnedItemIds).toContain("item_red_umbrella");
  expect(returned.inventoryItemIds).not.toContain("item_red_umbrella");
  expect(returned.viewedMemoryIds).toContain("memory_red_umbrella");

  await page.reload();
  await page.waitForFunction(() => window.__RAIN_SHELTER_E2E__ !== undefined);
  await page.evaluate(async () => window.__RAIN_SHELTER_E2E__?.ready());
  await expect(page.getByRole("button", { name: /つづきから/ })).toBeEnabled();
  await page.getByRole("button", { name: /つづきから/ }).click();
  await waitForGameIdle(page);

  await expect(page.getByText("00:18", { exact: true })).toBeVisible();
  const restored = await snapshot(page);
  expect(restored.returnedItemIds).toContain("item_red_umbrella");
  expect(restored.viewedMemoryIds).toContain("memory_red_umbrella");
});
