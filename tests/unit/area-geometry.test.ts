import { describe, expect, it } from "vitest";

import {
  depthScaleAt,
  getAreaArtLayout,
  isReachableOnGrid,
  isSafePoint,
  lightInfluenceAt,
  pointInInflatedPolygon,
  pointInPolygon,
  projectToSafePoint,
  type AreaArtLayout,
} from "../../src/game/content/areaArtLayouts";

describe("area geometry helpers", () => {
  it("handles polygon interiors, boundaries, concavity, and obstacle inflation", () => {
    const concave = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 4 },
      { x: 4, y: 4 },
      { x: 4, y: 10 },
      { x: 0, y: 10 },
    ];
    expect(pointInPolygon({ x: 2, y: 8 }, concave)).toBe(true);
    expect(pointInPolygon({ x: 7, y: 7 }, concave)).toBe(false);
    expect(pointInPolygon({ x: 4, y: 7 }, concave)).toBe(true);
    expect(pointInInflatedPolygon({ x: 11.5, y: 2 }, concave, 2)).toBe(true);
    expect(pointInInflatedPolygon({ x: 13, y: 2 }, concave, 2)).toBe(false);
  });

  it("preserves valid points and deterministically repairs invalid legacy positions", () => {
    const waiting = getAreaArtLayout("area_waiting_room");
    const valid = { x: 350, y: 390 };
    expect(projectToSafePoint(waiting, valid)).toEqual(valid);

    const invalidWall = { x: 200, y: 100 };
    const first = projectToSafePoint(waiting, invalidWall);
    const second = projectToSafePoint(waiting, invalidWall);
    expect(first).toEqual(second);
    expect(isSafePoint(waiting, first, 14)).toBe(true);

    const platform = getAreaArtLayout("area_rain_platform");
    const invalidTrack = { x: 900, y: 500 };
    const repairedTrack = projectToSafePoint(platform, invalidTrack);
    expect(isSafePoint(platform, repairedTrack, 14)).toBe(true);
    expect(repairedTrack.x).toBeLessThan(700);
  });

  it("clamps and interpolates final actor scale by foot Y", () => {
    const footbridge = getAreaArtLayout("area_footbridge");
    const profile = footbridge.depthProfile;
    expect(depthScaleAt(footbridge, profile.farY - 100)).toBe(profile.farScale);
    expect(depthScaleAt(footbridge, profile.nearY + 100)).toBe(profile.nearScale);
    expect(depthScaleAt(footbridge, (profile.farY + profile.nearY) / 2)).toBeCloseTo(
      (profile.farScale + profile.nearScale) / 2,
      8,
    );
  });

  it("samples local light contributions and respects stage gates", () => {
    const waiting = getAreaArtLayout("area_waiting_room");
    const lit = lightInfluenceAt(waiting, { x: 635, y: 450 }, 0);
    const dark = lightInfluenceAt(waiting, { x: 20, y: 620 }, 0);
    expect(lit.intensity).toBeGreaterThan(dark.intensity);
    expect(lit.brightness).toBeGreaterThan(1);
    expect(lit.color).toMatch(/^#[0-9a-f]{6}$/u);
    expect(lit.contributions.map((entry) => entry.zoneId)).toContain("waiting_pendant");

    const platform = getAreaArtLayout("area_rain_platform");
    const beforeTrain = lightInfluenceAt(platform, { x: 610, y: 405 }, 4);
    const atTrain = lightInfluenceAt(platform, { x: 610, y: 405 }, 5);
    const atDawn = lightInfluenceAt(platform, { x: 610, y: 405 }, 6);
    expect(beforeTrain.contributions.map((entry) => entry.zoneId)).not.toContain(
      "platform_train_headlights",
    );
    expect(atTrain.contributions.map((entry) => entry.zoneId)).toContain(
      "platform_train_headlights",
    );
    expect(atDawn.contributions.map((entry) => entry.zoneId)).toContain(
      "platform_dawn_ambient",
    );
    expect(atDawn.contributions.map((entry) => entry.zoneId)).not.toContain(
      "platform_night_ambient",
    );
  });

  it("finds paths through intended corridors and rejects a sealed floor", () => {
    const concourse = getAreaArtLayout("area_concourse");
    expect(isReachableOnGrid(
      concourse,
      concourse.safeSpawn,
      { x: 570, y: 440 },
      { cellSize: 12, clearance: 0 },
    )).toBe(true);

    const base = getAreaArtLayout("area_waiting_room");
    const sealed: AreaArtLayout = {
      ...base,
      safeSpawn: { x: 100, y: 200, facing: "right" },
      walkablePolygon: [
        { x: 0, y: 0 }, { x: 400, y: 0 }, { x: 400, y: 400 }, { x: 0, y: 400 },
      ],
      obstaclePolygons: [{
        id: "wall",
        points: [
          { x: 190, y: 0 }, { x: 210, y: 0 }, { x: 210, y: 400 }, { x: 190, y: 400 },
        ],
      }],
      exits: [],
      hotspots: [],
    };
    expect(isReachableOnGrid(
      sealed,
      sealed.safeSpawn,
      { x: 300, y: 200 },
      { cellSize: 10, clearance: 0 },
    )).toBe(false);
  });
});
