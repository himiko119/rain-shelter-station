import type { Page } from "@playwright/test";

import {
  getAreaArtLayout,
  isSafePoint,
  projectToSafePoint,
} from "../../src/game/content";
import type { AreaId, Point } from "../../src/game/core/types";
import type { ScenarioId } from "../../src/game/debug/e2eBridge";
import type { ExplorationVisualProbe } from "../../src/phaser/scenes/ExplorationScene";
import { expect, test } from "./fixtures";
import { loadScenario, snapshot, waitForGameIdle } from "./helpers";

// The shared fixture is intentional: it fails every test on console.error,
// pageerror, failed requests, or HTTP error responses.
test.setTimeout(120_000);

async function sceneProbe(page: Page): Promise<ExplorationVisualProbe> {
  return page.evaluate(() => {
    const probe = window.__RAIN_SHELTER_E2E__?.sceneProbe();
    if (!probe) throw new Error("The exploration scene probe is unavailable.");
    return probe;
  });
}

async function worldToScreen(page: Page, point: Point): Promise<Point> {
  return page.evaluate((worldPoint) => {
    const bridge = window.__RAIN_SHELTER_E2E__;
    if (!bridge) throw new Error("The E2E bridge is unavailable.");
    return bridge.worldToScreen(worldPoint);
  }, point);
}

function distance(left: Point, right: Point): number {
  return Math.hypot(left.x - right.x, left.y - right.y);
}

function expectSafeProbe(probe: ExplorationVisualProbe, context: string): void {
  const layout = getAreaArtLayout(probe.areaId);
  const feet = { x: probe.player.x, y: probe.player.y };
  expect(probe.player.safe, `${context}: scene probe marked the logical feet unsafe`).toBe(true);
  expect(
    isSafePoint(layout, feet, 14),
    `${context}: feet ${JSON.stringify(feet)} penetrated authored geometry`,
  ).toBe(true);
  for (const waypoint of probe.pointerPath) {
    expect(
      isSafePoint(layout, waypoint, 14),
      `${context}: pointer waypoint ${JSON.stringify(waypoint)} was unsafe`,
    ).toBe(true);
  }
}

async function holdKeyAndSample(
  page: Page,
  key: string,
  durationMs: number,
  context: string,
): Promise<readonly ExplorationVisualProbe[]> {
  const samples: ExplorationVisualProbe[] = [];
  const sampleCount = Math.max(1, Math.ceil(durationMs / 35));
  await page.keyboard.down(key);
  try {
    for (let index = 0; index < sampleCount; index += 1) {
      await page.waitForTimeout(35);
      const probe = await sceneProbe(page);
      expectSafeProbe(probe, `${context}, sample ${index}`);
      samples.push(probe);
    }
  } finally {
    await page.keyboard.up(key);
  }
  await waitForGameIdle(page);
  const finalProbe = await sceneProbe(page);
  expectSafeProbe(finalProbe, `${context}, final`);
  samples.push(finalProbe);
  return samples;
}

async function navigateByPointer(
  page: Page,
  clickPoint: Point,
  intendedGoal: Point,
  context: string,
  timeoutMs = 12_000,
): Promise<{ readonly maxPathLength: number; readonly finalProbe: ExplorationVisualProbe }> {
  const initialProbe = await sceneProbe(page);
  const layout = getAreaArtLayout(initialProbe.areaId);
  const safeGoal = projectToSafePoint(layout, intendedGoal, { clearance: 14 });
  const screenPoint = await worldToScreen(page, clickPoint);
  await page.mouse.click(screenPoint.x, screenPoint.y);

  const deadline = Date.now() + timeoutMs;
  let maxPathLength = 0;
  while (Date.now() < deadline) {
    const probe = await sceneProbe(page);
    expect(probe.areaId, `${context}: pointer movement changed area unexpectedly`).toBe(layout.areaId);
    expectSafeProbe(probe, context);
    maxPathLength = Math.max(maxPathLength, probe.pointerPath.length);
    const feet = { x: probe.player.x, y: probe.player.y };
    if (probe.pointerPath.length === 0 && distance(feet, safeGoal) <= 10) {
      return { maxPathLength, finalProbe: probe };
    }
    await page.waitForTimeout(40);
  }

  const finalProbe = await sceneProbe(page);
  throw new Error(
    `${context}: pointer route did not reach ${JSON.stringify(safeGoal)}; `
      + `feet=${JSON.stringify(finalProbe.player)}, path=${JSON.stringify(finalProbe.pointerPath)}`,
  );
}

async function holdUntilArea(
  page: Page,
  key: string,
  targetAreaId: AreaId,
  context: string,
  timeoutMs = 8_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  await page.keyboard.down(key);
  try {
    while (Date.now() < deadline) {
      const state = await snapshot(page);
      if (state.areaId === targetAreaId) break;
      expectSafeProbe(await sceneProbe(page), context);
      await page.waitForTimeout(35);
    }
  } finally {
    await page.keyboard.up(key);
  }

  await expect.poll(async () => (await snapshot(page)).areaId).toBe(targetAreaId);
  await waitForGameIdle(page);
  expectSafeProbe(await sceneProbe(page), `${context}, destination`);
}

test("keyboard feet cannot penetrate walls, windows, furniture, railings, or track edges", async ({ page }) => {
  const barriers: readonly {
    readonly scenario: ScenarioId;
    readonly key: string;
    readonly durationMs: number;
    readonly label: string;
  }[] = [
    { scenario: "waiting-far", key: "ArrowUp", durationMs: 650, label: "waiting-room window wall" },
    { scenario: "waiting-behind-umbrella-rack", key: "ArrowLeft", durationMs: 750, label: "umbrella rack" },
    { scenario: "waiting-at-photo-booth", key: "ArrowRight", durationMs: 750, label: "photo booth" },
    { scenario: "office-behind-desk", key: "ArrowLeft", durationMs: 750, label: "station-office desk" },
    { scenario: "footbridge-near-railing", key: "ArrowLeft", durationMs: 850, label: "footbridge railing" },
    { scenario: "platform-near-edge", key: "ArrowRight", durationMs: 1_200, label: "platform track edge" },
  ];

  for (const barrier of barriers) {
    await loadScenario(page, barrier.scenario);
    const before = await sceneProbe(page);
    expectSafeProbe(before, `${barrier.label}, initial`);
    const samples = await holdKeyAndSample(
      page,
      barrier.key,
      barrier.durationMs,
      barrier.label,
    );
    expect(samples.length).toBeGreaterThan(2);
  }
});

test("pointer routing remains safe while detouring around concourse furniture", async ({ page }) => {
  await loadScenario(page, "concourse-near-gates");
  const target = { x: 205, y: 375 };
  const result = await navigateByPointer(
    page,
    target,
    target,
    "concourse gate-to-attendant route",
  );

  expect(result.maxPathLength, "the furniture route should require an intermediate waypoint").toBeGreaterThanOrEqual(2);
  expectSafeProbe(result.finalProbe, "concourse pointer arrival");
});

test("pointer input reaches hotspot approach points across four areas", async ({ page }) => {
  const hotspotRoutes: readonly {
    readonly scenario: ScenarioId;
    readonly hotspotId: string;
    readonly label: string;
  }[] = [
    { scenario: "waiting-far", hotspotId: "waiting_umbrella_stand", label: "waiting-room umbrella stand" },
    { scenario: "office-behind-desk", hotspotId: "office_refrigerator", label: "office refrigerator" },
    { scenario: "footbridge-near-railing", hotspotId: "footbridge_cassette_bench", label: "footbridge cassette bench" },
    { scenario: "platform-near-edge", hotspotId: "platform_vending_machine", label: "platform vending machine" },
  ];

  for (const route of hotspotRoutes) {
    await loadScenario(page, route.scenario);
    const probe = await sceneProbe(page);
    const layout = getAreaArtLayout(probe.areaId);
    const hotspot = layout.hotspots.find((candidate) => candidate.id === route.hotspotId);
    if (!hotspot) throw new Error(`Missing art hotspot ${route.hotspotId}`);

    const result = await navigateByPointer(
      page,
      hotspot.artAnchor,
      hotspot.approachPoint,
      route.label,
    );
    expect(result.maxPathLength, `${route.label}: no pointer path was created`).toBeGreaterThan(0);
  }
});

test("pointer approach plus keyboard movement reaches authored exit polygons", async ({ page }) => {
  const exits: readonly {
    readonly scenario: ScenarioId;
    readonly exitId: string;
    readonly key: string;
    readonly targetAreaId: AreaId;
    readonly label: string;
  }[] = [
    {
      scenario: "waiting-far",
      exitId: "exit_waiting_to_concourse",
      key: "ArrowRight",
      targetAreaId: "area_concourse",
      label: "waiting room to concourse",
    },
    {
      scenario: "office-behind-desk",
      exitId: "exit_office_to_concourse",
      key: "ArrowUp",
      targetAreaId: "area_concourse",
      label: "office to concourse",
    },
    {
      scenario: "rain-platform",
      exitId: "exit_platform_to_footbridge",
      key: "ArrowLeft",
      targetAreaId: "area_footbridge",
      label: "platform to footbridge",
    },
  ];

  for (const route of exits) {
    await loadScenario(page, route.scenario);
    const probe = await sceneProbe(page);
    const layout = getAreaArtLayout(probe.areaId);
    const exit = layout.exits.find((candidate) => candidate.id === route.exitId);
    if (!exit) throw new Error(`Missing art exit ${route.exitId}`);

    await navigateByPointer(page, exit.approachPoint, exit.approachPoint, route.label);
    await holdUntilArea(page, route.key, route.targetAreaId, route.label);
  }
});
