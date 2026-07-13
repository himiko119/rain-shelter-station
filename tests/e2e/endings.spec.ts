import { expect, test } from "./fixtures";
import { holdKey, loadScenario, snapshot, stabilizeVisuals } from "./helpers";

const endings = [
  {
    name: "A — 終電",
    scenario: "ending-a-ready",
    choice: "終電に乗る",
    title: "終電",
    endingId: "ending_last_train",
  },
  {
    name: "B — 始発",
    scenario: "ending-b-ready",
    choice: "始発を待つ",
    title: "始発",
    endingId: "ending_first_train",
  },
  {
    name: "C — 雨宿り",
    scenario: "ending-a-ready",
    choice: "ここに残る",
    title: "雨宿り",
    endingId: "ending_rain_shelter",
  },
] as const;

for (const ending of endings) {
  test(`reaches ending ${ending.name} through the final UI choice`, async ({ page }) => {
    await loadScenario(page, ending.scenario);
    const finalChoice = page.getByRole("dialog", { name: "最後の選択" });
    for (let step = 0; step < 6; step += 1) {
      await holdKey(page, "ArrowRight", 350);
      await page.keyboard.press("KeyE");
      if (await finalChoice.isVisible()) break;
    }

    await expect(finalChoice).toBeVisible();
    await page.getByRole("button", { name: new RegExp(ending.choice) }).click();

    await expect(page.getByRole("heading", { level: 1, name: ending.title, exact: true })).toBeVisible();
    const state = await snapshot(page);
    expect(state.activeEndingId).toBe(ending.endingId);
    expect(state.viewedEndingIds).toContain(ending.endingId);

    await stabilizeVisuals(page);
    expect((await page.screenshot()).byteLength).toBeGreaterThan(10_000);

    await page.getByRole("button", { name: "クレジットへ" }).click();
    await expect(page.getByRole("heading", { name: /雨宿り駅の\s*忘れもの/ })).toBeVisible();
    await page.getByRole("button", { name: "タイトルへ戻る" }).click();
    await expect(page.getByRole("button", { name: /記録.*1 \/ 3/ })).toBeVisible();
  });
}
