import { describe, expect, it } from "vitest";

import { AREA_DEFINITIONS } from "../../src/game/content/areas";
import {
  AREA_ART_LAYOUTS,
  getAreaArtLayout,
  isReachableOnGrid,
  isSafePoint,
  pointInPolygon,
  validateLayoutReachability,
} from "../../src/game/content/areaArtLayouts";

function polygonArea(points: readonly { readonly x: number; readonly y: number }[]): number {
  let twiceArea = 0;
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (current && next) twiceArea += current.x * next.y - next.x * current.y;
  }
  return Math.abs(twiceArea) / 2;
}

describe("area art layout data", () => {
  it("defines one stable 1120 x 630 layout for every content area", () => {
    expect(AREA_ART_LAYOUTS).toHaveLength(5);
    expect(new Set(AREA_ART_LAYOUTS.map((layout) => layout.areaId))).toHaveLength(5);
    expect(AREA_ART_LAYOUTS.map((layout) => layout.areaId)).toEqual(
      AREA_DEFINITIONS.map((area) => area.id),
    );

    for (const layout of AREA_ART_LAYOUTS) {
      expect(getAreaArtLayout(layout.areaId)).toBe(layout);
      expect(layout.worldSize).toEqual({ width: 1120, height: 630 });
      expect(layout.cameraSafeBounds).toEqual({ x: 0, y: 0, width: 1120, height: 630 });
      expect(polygonArea(layout.walkablePolygon)).toBeGreaterThan(20_000);
      expect(isSafePoint(layout, layout.safeSpawn)).toBe(true);
    }
  });

  it("maps every stable content hotspot ID to an art and approach anchor", () => {
    for (const area of AREA_DEFINITIONS) {
      const layout = getAreaArtLayout(area.id);
      expect(layout.hotspots.map((definition) => definition.id)).toEqual(
        area.hotspots.map((definition) => definition.id),
      );
      for (const definition of layout.hotspots) {
        expect(definition.interactionRadius).toBeGreaterThanOrEqual(44);
        expect(definition.revealRadius).toBeGreaterThan(definition.interactionRadius);
        expect(definition.artAnchor.x).toBeGreaterThanOrEqual(0);
        expect(definition.artAnchor.x).toBeLessThanOrEqual(layout.worldSize.width);
        expect(definition.artAnchor.y).toBeGreaterThanOrEqual(0);
        expect(definition.artAnchor.y).toBeLessThanOrEqual(layout.worldSize.height);
        expect(
          isSafePoint(layout, definition.approachPoint),
          `${layout.areaId}/${definition.id} approach must be walkable`,
        ).toBe(true);
      }
    }
  });

  it("keeps passenger approach points separated from actor feet and reachable", () => {
    for (const area of AREA_DEFINITIONS) {
      const layout = getAreaArtLayout(area.id);
      const passengerIds = area.hotspots
        .filter((definition) => definition.kind === "owner" || definition.kind === "mirror")
        .map((definition) => definition.id);

      for (const hotspotId of passengerIds) {
        const definition = layout.hotspots.find((candidate) => candidate.id === hotspotId);
        expect(definition, `${layout.areaId}/${hotspotId}`).toBeDefined();
        if (!definition) continue;

        const separation = Math.hypot(
          definition.approachPoint.x - definition.artAnchor.x,
          definition.approachPoint.y - definition.artAnchor.y,
        );
        expect(separation, `${layout.areaId}/${hotspotId} separation`).toBeGreaterThanOrEqual(44);
        expect(
          isSafePoint(layout, definition.approachPoint, 14),
          `${layout.areaId}/${hotspotId} clearance`,
        ).toBe(true);
        expect(
          isReachableOnGrid(layout, layout.safeSpawn, definition.approachPoint, {
            cellSize: 12,
            clearance: 14,
          }),
          `${layout.areaId}/${hotspotId} reachability`,
        ).toBe(true);
      }
    }
  });

  it("keeps every polygon finite, non-degenerate, and inside logical world bounds", () => {
    for (const layout of AREA_ART_LAYOUTS) {
      const polygons = [
        { id: "walkable", points: layout.walkablePolygon },
        ...layout.obstaclePolygons,
        ...layout.exits.map((exit) => ({ id: exit.id, points: exit.zone })),
        ...layout.rainRegions,
        ...layout.foregroundOccluders,
      ];
      for (const polygon of polygons) {
        expect(polygon.points.length, `${layout.areaId}/${polygon.id}`).toBeGreaterThanOrEqual(3);
        expect(polygonArea(polygon.points), `${layout.areaId}/${polygon.id}`).toBeGreaterThan(1);
        for (const point of polygon.points) {
          expect(Number.isFinite(point.x)).toBe(true);
          expect(Number.isFinite(point.y)).toBe(true);
          expect(point.x).toBeGreaterThanOrEqual(0);
          expect(point.x).toBeLessThanOrEqual(layout.worldSize.width);
          expect(point.y).toBeGreaterThanOrEqual(0);
          expect(point.y).toBeLessThanOrEqual(layout.worldSize.height);
        }
      }
    }
  });

  it("keeps exit approaches and target safe spawns valid", () => {
    for (const layout of AREA_ART_LAYOUTS) {
      for (const exit of layout.exits) {
        expect(
          isSafePoint(layout, exit.approachPoint),
          `${layout.areaId}/${exit.id} approach`,
        ).toBe(true);
        const targetLayout = getAreaArtLayout(exit.targetAreaId);
        expect(
          isSafePoint(targetLayout, exit.targetSafeSpawn),
          `${layout.areaId}/${exit.id} target`,
        ).toBe(true);
        expect(
          exit.zone.some((point) => pointInPolygon(point, layout.walkablePolygon))
            || pointInPolygon(exit.approachPoint, layout.walkablePolygon),
        ).toBe(true);
      }
    }
  });

  it("declares sane depth, lighting, rain, ripple, and occlusion data", () => {
    for (const layout of AREA_ART_LAYOUTS) {
      const profile = layout.depthProfile;
      expect(profile.nearY).toBeGreaterThan(profile.farY);
      expect(profile.farScale).toBeGreaterThan(0.3);
      expect(profile.nearScale).toBeGreaterThan(profile.farScale);
      expect(profile.nearScale).toBeLessThanOrEqual(0.7);
      expect(layout.lightZones.length).toBeGreaterThan(0);
      for (const zone of layout.lightZones) {
        expect(zone.intensity).toBeGreaterThan(0);
        expect(zone.intensity).toBeLessThanOrEqual(1);
        expect(zone.influence.radiusX).toBeGreaterThan(0);
        expect(zone.influence.radiusY).toBeGreaterThan(0);
        expect(zone.shadowOpacityMultiplier).toBeGreaterThan(0);
        expect(zone.shadowOpacityMultiplier).toBeLessThanOrEqual(1);
      }
      for (const region of layout.rippleRegions) {
        expect(region.radiusX).toBeGreaterThan(0);
        expect(region.radiusY).toBeGreaterThan(0);
        expect(region.intensity).toBeGreaterThan(0);
      }
      for (const definition of layout.foregroundOccluders) {
        expect(definition.baselineY).toBeGreaterThanOrEqual(0);
        expect(definition.baselineY).toBeLessThanOrEqual(631);
        expect(definition.sourceBounds.width).toBeGreaterThan(0);
        expect(definition.sourceBounds.height).toBeGreaterThan(0);
      }
    }
  });

  it("keeps every hotspot and exit reachable on the lightweight validation grid", () => {
    for (const layout of AREA_ART_LAYOUTS) {
      expect(
        validateLayoutReachability(layout, { cellSize: 12, clearance: 14 }),
        layout.areaId,
      ).toEqual({ unreachableHotspotIds: [], unreachableExitIds: [] });
    }
  });
});
