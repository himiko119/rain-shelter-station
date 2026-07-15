import type { Page } from "@playwright/test";

import { depthScaleAt, getAreaArtLayout } from "../../src/game/content";
import type { ExplorationVisualProbe } from "../../src/phaser/scenes/ExplorationScene";
import { expect, test } from "./fixtures";
import { loadScenario, stabilizeVisuals } from "./helpers";

async function readSceneProbe(page: Page): Promise<ExplorationVisualProbe> {
  return page.evaluate(() => {
    const probe = window.__RAIN_SHELTER_E2E__?.sceneProbe();
    if (!probe) throw new Error("Exploration scene probe is unavailable.");
    return probe;
  });
}

test.describe("actor perspective and grounded depth", () => {
  test("waiting-far, waiting-mid, and waiting-near scale naturally from their feet", async ({ page }) => {
    const layout = getAreaArtLayout("area_waiting_room");
    const scenarios = [
      { id: "waiting-far", x: 420, y: 352 },
      { id: "waiting-mid", x: 560, y: 470 },
      { id: "waiting-near", x: 650, y: 578 },
    ] as const;
    const probes: ExplorationVisualProbe[] = [];

    for (const scenario of scenarios) {
      await loadScenario(page, scenario.id);
      await stabilizeVisuals(page);
      const probe = await readSceneProbe(page);
      probes.push(probe);

      expect(probe.areaId, scenario.id).toBe("area_waiting_room");
      expect(probe.player.safe, scenario.id).toBe(true);
      expect(probe.player.x, scenario.id).toBeCloseTo(scenario.x, 4);
      expect(probe.player.y, scenario.id).toBeCloseTo(scenario.y, 4);
      expect(probe.player.scale, scenario.id).toBeCloseTo(depthScaleAt(layout, probe.player.y), 5);
      expect(probe.player.depth, scenario.id).toBeCloseTo(probe.player.y + 40, 5);
    }

    const [far, mid, near] = probes;
    if (!far || !mid || !near) throw new Error("Perspective scenarios did not produce three probes.");
    expect(far.player.scale).toBeLessThan(mid.player.scale);
    expect(mid.player.scale).toBeLessThan(near.player.scale);
    expect(far.player.depth).toBeLessThan(mid.player.depth);
    expect(mid.player.depth).toBeLessThan(near.player.depth);
  });

  test("waiting-room passengers use authored foot anchors, depth, and perspective scale", async ({ page }) => {
    await loadScenario(page, "fresh-game");
    await stabilizeVisuals(page);
    const probe = await readSceneProbe(page);
    const layout = getAreaArtLayout("area_waiting_room");
    const expectedPassengers = [
      { ownerId: "owner_red_boots_child", hotspotId: "waiting_red_boots_child" },
      { ownerId: "owner_old_listener", hotspotId: "waiting_old_listener" },
    ] as const;

    expect(probe.passengers.map((passenger) => passenger.ownerId).sort()).toEqual(
      expectedPassengers.map((passenger) => passenger.ownerId).sort(),
    );
    for (const expected of expectedPassengers) {
      const passenger = probe.passengers.find((candidate) => candidate.ownerId === expected.ownerId);
      const hotspot = layout.hotspots.find((candidate) => candidate.id === expected.hotspotId);
      expect(passenger, expected.ownerId).toBeDefined();
      expect(hotspot, expected.hotspotId).toBeDefined();
      if (!passenger || !hotspot) continue;

      expect(passenger.safe, expected.ownerId).toBe(true);
      expect(passenger.x, expected.ownerId).toBeCloseTo(hotspot.artAnchor.x, 5);
      expect(passenger.y, expected.ownerId).toBeCloseTo(hotspot.artAnchor.y, 5);
      expect(passenger.depth, expected.ownerId).toBeCloseTo(passenger.y + 40, 5);
      expect(passenger.scale, expected.ownerId).toBeCloseTo(depthScaleAt(layout, passenger.y), 5);
    }
  });

  test("waiting-room foreground occluders are present at authored baseline depths", async ({ page }) => {
    await loadScenario(page, "waiting-behind-umbrella-rack");
    await stabilizeVisuals(page);
    const probe = await readSceneProbe(page);
    const layout = getAreaArtLayout("area_waiting_room");

    expect(probe.foregroundOccluders.map((occluder) => occluder.id).sort()).toEqual(
      layout.foregroundOccluders.map((occluder) => occluder.id).sort(),
    );
    for (const definition of layout.foregroundOccluders) {
      const occluder = probe.foregroundOccluders.find((candidate) => candidate.id === definition.id);
      expect(occluder, definition.id).toBeDefined();
      if (!occluder) continue;
      expect(occluder.visible, definition.id).toBe(true);
      expect(occluder.depth, definition.id).toBe(
        definition.alwaysForeground ? 2_000 : definition.baselineY + 40,
      );
    }
  });
});
