import type { Page } from "@playwright/test";

import { getAreaArtLayout } from "../../src/game/content";
import type { ExplorationVisualProbe } from "../../src/phaser/scenes/ExplorationScene";
import { expect, test } from "./fixtures";
import { loadScenario } from "./helpers";

async function stabilizeAt(page: Page, time: number): Promise<void> {
  await page.evaluate(async (visualTime) => {
    const bridge = window.__RAIN_SHELTER_E2E__;
    if (!bridge) throw new Error("The E2E bridge is not mounted.");
    await bridge.stabilizeVisuals(visualTime);
  }, time);
}

async function readSceneProbe(page: Page): Promise<ExplorationVisualProbe> {
  return page.evaluate(() => {
    const probe = window.__RAIN_SHELTER_E2E__?.sceneProbe();
    if (!probe) throw new Error("Exploration scene probe is unavailable.");
    return probe;
  });
}

function isAvailableAtStage(
  definition: { readonly availableFromStage?: number; readonly availableUntilStage?: number },
  stage: number,
): boolean {
  return (definition.availableFromStage === undefined || stage >= definition.availableFromStage)
    && (definition.availableUntilStage === undefined || stage <= definition.availableUntilStage);
}

function expectStaticAreaEffects(probe: ExplorationVisualProbe): void {
  const effects = probe.effects;
  expect(effects).not.toBeNull();
  if (!effects) return;
  const layout = getAreaArtLayout(probe.areaId);
  const expectedRain = layout.rainRegions
    .filter((definition) => isAvailableAtStage(definition, probe.stage))
    .map((definition) => definition.id);
  const expectedRipples = layout.rippleRegions
    .filter((definition) => isAvailableAtStage(definition, probe.stage))
    .map((definition) => definition.id);
  const expectedLights = layout.lightZones
    .filter((definition) => isAvailableAtStage(definition, probe.stage))
    .map((definition) => definition.id);

  expect(effects.source).toBe("static");
  expect(effects.rainRegionIds).toEqual(expectedRain);
  expect(effects.rippleRegionIds).toEqual(expectedRipples);
  expect(effects.lightZoneIds).toEqual(expectedLights);
  expect(effects.rainMaskActive).toBe(expectedRain.length > 0);
  expect(effects.rainDropCount > 0).toBe(expectedRain.length > 0 && probe.stage < 6);

  const allEffectIds = [
    ...effects.rainRegionIds,
    ...effects.rippleRegionIds,
    ...effects.lightZoneIds,
  ];
  expect(allEffectIds.some((id) => id.startsWith("legacy-"))).toBe(false);
  expect(new Set(effects.rainRegionIds).size).toBe(effects.rainRegionIds.length);
  expect(new Set(effects.rippleRegionIds).size).toBe(effects.rippleRegionIds.length);
  expect(new Set(effects.lightZoneIds).size).toBe(effects.lightZoneIds.length);
}

test.describe("hotspot marker restraint", () => {
  test("waiting-near hides every marker while the player is outside reveal range", async ({ page }) => {
    await loadScenario(page, "waiting-near");
    await stabilizeAt(page, 2_400);
    const probe = await readSceneProbe(page);

    expect(probe.markers.length).toBeGreaterThan(0);
    expect(probe.markers.filter((marker) => marker.visible)).toEqual([]);
  });

  for (const scenario of [
    { id: "waiting-behind-umbrella-rack", markerId: "waiting_umbrella_stand" },
    { id: "waiting-under-lamp", markerId: "waiting_old_listener" },
    { id: "waiting-at-photo-booth", markerId: "waiting_photo_booth_dormant" },
  ] as const) {
    test(`${scenario.id} reveals only its nearest marker`, async ({ page }) => {
      await loadScenario(page, scenario.id);
      await stabilizeAt(page, 2_400);
      const probe = await readSceneProbe(page);
      const visible = probe.markers.filter((marker) => marker.visible);

      expect(visible).toHaveLength(1);
      expect(visible[0]?.id).toBe(scenario.markerId);
      expect(visible[0]?.distance).toBe(Math.min(...probe.markers.map((marker) => marker.distance)));
    });
  }
});

test.describe("static authored area effects", () => {
  test("rain-platform uses its stage-three light, rain, ripple, and mask definitions once", async ({ page }) => {
    await loadScenario(page, "rain-platform");
    await stabilizeAt(page, 1_375);
    const probe = await readSceneProbe(page);

    expect(probe.areaId).toBe("area_rain_platform");
    expect(probe.stage).toBe(3);
    expect(probe.effects?.time).toBe(1_375);
    expectStaticAreaEffects(probe);
  });

  test("ending-b-ready removes expired rain and selects dawn-only stage-six effects", async ({ page }) => {
    await loadScenario(page, "ending-b-ready");
    await stabilizeAt(page, 6_200);
    const probe = await readSceneProbe(page);

    expect(probe.areaId).toBe("area_rain_platform");
    expect(probe.stage).toBe(6);
    expect(probe.effects?.time).toBe(6_200);
    expectStaticAreaEffects(probe);
    expect(probe.effects?.rainRegionIds).toEqual([]);
    expect(probe.effects?.rippleRegionIds).toEqual([]);
    expect(probe.effects?.lightZoneIds).toContain("platform_dawn_ambient");
    expect(probe.effects?.lightZoneIds).not.toContain("platform_night_ambient");
    expect(probe.effects?.lightZoneIds).not.toContain("platform_train_headlights");
  });

  test("stabilizeVisuals seeks effects by absolute time and rewinds deterministically", async ({ page }) => {
    await loadScenario(page, "rain-platform");

    await stabilizeAt(page, 1_111);
    const first = await readSceneProbe(page);
    await stabilizeAt(page, 4_444);
    const advanced = await readSceneProbe(page);
    await stabilizeAt(page, 1_111);
    const rewound = await readSceneProbe(page);

    expect(first.effects?.time).toBe(1_111);
    expect(advanced.effects?.time).toBe(4_444);
    expect(rewound.effects).toEqual(first.effects);
    expectStaticAreaEffects(rewound);
  });
});
