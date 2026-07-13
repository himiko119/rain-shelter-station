import { expect, test } from "./fixtures";
import { loadScenario, snapshot } from "./helpers";

test("pause and accessibility settings update through the game UI", async ({ page }) => {
  await loadScenario(page, "fresh-game");

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "ポーズ" })).toBeVisible();
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "設定" })).toBeVisible();

  await page.getByRole("checkbox", { name: "すべての音をミュート" }).check();
  await page.getByRole("checkbox", { name: "文章を一括表示" }).check();
  await page.getByRole("checkbox", { name: "演出を軽減" }).check();
  await page.getByRole("combobox", { name: "文字表示速度" }).selectOption("instant");
  const settingsDialog = page.getByRole("dialog", { name: "設定" });
  await settingsDialog.getByRole("slider").nth(0).fill("0.25");
  await settingsDialog.getByRole("slider").nth(1).fill("0.4");

  const configured = await snapshot(page);
  expect(configured.settings).toMatchObject({
    muted: true,
    showAllText: true,
    reducedMotion: true,
    textSpeed: "instant",
    ambientVolume: 0.25,
    effectVolume: 0.4,
  });

  await page.getByRole("button", { name: "閉じる ×" }).click();
  await expect(page.getByRole("dialog", { name: "ポーズ" })).toBeVisible();
  await page.getByRole("button", { name: "ゲームに戻る" }).click();
  await expect(page.getByRole("dialog", { name: "ポーズ" })).toBeHidden();

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await expect(page.getByRole("checkbox", { name: "すべての音をミュート" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "文章を一括表示" })).toBeChecked();
  await expect(page.getByRole("checkbox", { name: "演出を軽減" })).toBeChecked();
  await expect(page.getByRole("combobox", { name: "文字表示速度" })).toHaveValue("instant");
});

test("deleting save data clears progress, settings, and ending records", async ({ page }) => {
  await loadScenario(page, "after-umbrella");
  expect((await snapshot(page)).returnedItemIds).toContain("item_red_umbrella");

  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "設定", exact: true }).click();
  await page.getByRole("button", { name: /セーブデータを削除/ }).click();
  await expect(page.getByRole("dialog", { name: "本当に削除しますか？" })).toBeVisible();

  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: "削除する", exact: true }).click(),
  ]);
  await page.waitForFunction(() => window.__RAIN_SHELTER_E2E__ !== undefined);
  await page.evaluate(async () => window.__RAIN_SHELTER_E2E__?.ready());

  await expect(page.getByRole("heading", { name: /雨宿り駅の\s*忘れもの/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /つづきから/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /記録.*0 \/ 3/ })).toBeVisible();
  const cleared = await snapshot(page);
  expect(cleared.started).toBe(false);
  expect(cleared.returnedItemIds).toEqual([]);
  expect(cleared.viewedEndingIds).toEqual([]);
  expect(cleared.settings.muted).toBe(false);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
