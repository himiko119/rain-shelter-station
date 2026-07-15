import type Phaser from "phaser";

import type { AreaArtLayout } from "../../game/content";
import type { Point } from "../../game/core/types";

const COLORS = {
  walkable: 0x62e59b,
  obstacle: 0xff6470,
  exit: 0x58dbff,
  hotspot: 0xffd968,
  approach: 0xffffff,
  light: 0xc77dff,
  rain: 0x4f8cff,
  ripple: 0x78f3ed,
  occluder: 0xf4f4f4,
  depth: 0xffa95d,
} as const;

function strokePolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: readonly Point[],
  color: number,
  alpha: number,
  fillAlpha = 0,
): void {
  if (points.length < 3) return;
  const mutablePoints = points.map((point) => ({ x: point.x, y: point.y }));
  if (fillAlpha > 0) {
    graphics.fillStyle(color, fillAlpha);
    graphics.fillPoints(mutablePoints, true);
  }
  graphics.lineStyle(2, color, alpha);
  graphics.strokePoints(mutablePoints, true);
}

export class DebugGeometryOverlay {
  private readonly geometry: Phaser.GameObjects.Graphics;
  private readonly foot: Phaser.GameObjects.Graphics;
  private visible = false;

  public constructor(scene: Phaser.Scene, layout: AreaArtLayout) {
    this.geometry = scene.add.graphics().setName("debug-art-layout").setDepth(4_000);
    this.foot = scene.add.graphics().setName("debug-player-foot").setDepth(4_001);
    this.draw(layout);
    this.setVisible(false);
  }

  public get isVisible(): boolean {
    return this.visible;
  }

  public setVisible(visible: boolean): void {
    this.visible = visible;
    this.geometry.setVisible(visible);
    this.foot.setVisible(visible);
  }

  public updateFoot(point: Point): void {
    this.foot.clear();
    this.foot.fillStyle(COLORS.approach, 0.96);
    this.foot.fillCircle(point.x, point.y, 5);
    this.foot.lineStyle(1, 0x0a1320, 0.9);
    this.foot.strokeCircle(point.x, point.y, 7);
  }

  public destroy(): void {
    this.geometry.destroy();
    this.foot.destroy();
  }

  private draw(layout: AreaArtLayout): void {
    const graphics = this.geometry;
    graphics.clear();
    strokePolygon(graphics, layout.walkablePolygon, COLORS.walkable, 0.95, 0.08);
    for (const obstacle of layout.obstaclePolygons) {
      strokePolygon(graphics, obstacle.points, COLORS.obstacle, 0.95, 0.12);
    }
    for (const exit of layout.exits) {
      strokePolygon(graphics, exit.zone, COLORS.exit, 1, 0.13);
      graphics.lineStyle(1, COLORS.exit, 0.8);
      graphics.lineBetween(
        exit.approachPoint.x - 8,
        exit.approachPoint.y,
        exit.approachPoint.x + 8,
        exit.approachPoint.y,
      );
      graphics.lineBetween(
        exit.approachPoint.x,
        exit.approachPoint.y - 8,
        exit.approachPoint.x,
        exit.approachPoint.y + 8,
      );
    }
    for (const hotspot of layout.hotspots) {
      graphics.lineStyle(1, COLORS.hotspot, 0.65);
      graphics.lineBetween(
        hotspot.artAnchor.x,
        hotspot.artAnchor.y,
        hotspot.approachPoint.x,
        hotspot.approachPoint.y,
      );
      graphics.fillStyle(COLORS.hotspot, 0.96);
      graphics.fillCircle(hotspot.artAnchor.x, hotspot.artAnchor.y, 5);
      graphics.lineStyle(2, COLORS.approach, 0.9);
      graphics.strokeCircle(hotspot.approachPoint.x, hotspot.approachPoint.y, 7);
    }
    for (const zone of layout.lightZones) {
      graphics.lineStyle(2, COLORS.light, 0.72);
      graphics.strokeEllipse(
        zone.influence.center.x,
        zone.influence.center.y,
        zone.influence.radiusX * 2,
        zone.influence.radiusY * 2,
      );
      graphics.fillStyle(COLORS.light, 0.92);
      graphics.fillCircle(zone.source.x, zone.source.y, 4);
    }
    for (const region of layout.rainRegions) {
      strokePolygon(graphics, region.points, COLORS.rain, 0.78, 0.07);
    }
    for (const region of layout.rippleRegions) {
      graphics.lineStyle(2, COLORS.ripple, 0.75);
      graphics.strokeEllipse(
        region.center.x,
        region.center.y,
        region.radiusX * 2,
        region.radiusY * 2,
      );
    }
    for (const definition of layout.foregroundOccluders) {
      strokePolygon(graphics, definition.points, COLORS.occluder, 0.5);
      graphics.lineStyle(1, COLORS.occluder, 0.8);
      graphics.lineBetween(0, definition.baselineY, layout.worldSize.width, definition.baselineY);
    }
    graphics.lineStyle(2, COLORS.depth, 0.85);
    graphics.lineBetween(0, layout.depthProfile.farY, layout.worldSize.width, layout.depthProfile.farY);
    graphics.lineBetween(0, layout.depthProfile.nearY, layout.worldSize.width, layout.depthProfile.nearY);
  }
}
