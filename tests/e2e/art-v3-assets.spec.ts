import { expect, test as base } from "@playwright/test";

import { STATIC_ART_MANIFEST } from "../../src/game/assets";
import { test } from "./fixtures";
import { holdKey, loadScenario, openGame, snapshot } from "./helpers";

test("every art-v3 manifest image decodes at its declared dimensions", async ({ page }) => {
  await openGame(page);
  const definitions = STATIC_ART_MANIFEST.map((asset) => ({
    key: asset.key,
    path: asset.path,
    width: asset.dimensions.width,
    height: asset.dimensions.height,
  }));

  const results = await page.evaluate(async (assets) => Promise.all(assets.map(async (asset) => {
    const image = new Image();
    image.decoding = "async";
    image.src = new URL(asset.path, document.baseURI).toString();
    try {
      await image.decode();
      return {
        key: asset.key,
        width: image.naturalWidth,
        height: image.naturalHeight,
        error: null,
      };
    } catch (error) {
      return {
        key: asset.key,
        width: 0,
        height: 0,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  })), definitions);

  expect(results.filter((result) => result.error !== null)).toEqual([]);
  for (const [index, result] of results.entries()) {
    const expected = definitions[index];
    expect(result, expected?.key).toMatchObject({
      key: expected?.key,
      width: expected?.width,
      height: expected?.height,
      error: null,
    });
  }
});

base("a missing area illustration keeps procedural exploration playable", async ({ page }) => {
  await page.route("**/assets/art-v3/backgrounds/waiting-room.webp", async (route) => {
    await route.fulfill({ status: 404, contentType: "image/webp", body: "missing by test" });
  });

  await loadScenario(page, "fresh-game");
  await expect(page.locator(".game-world canvas")).toBeVisible();
  const before = await snapshot(page);
  await holdKey(page, "ArrowRight", 320);
  const after = await snapshot(page);

  expect(before.areaId).toBe("area_waiting_room");
  expect(after.areaId).toBe("area_waiting_room");
  expect(after.playerPosition.x).toBeGreaterThan(before.playerPosition.x);
});
