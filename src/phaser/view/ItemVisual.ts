import type Phaser from "phaser";

import type { LostItemDefinition } from "../../game/content/types";
import type { Point } from "../../game/core/types";

export type ItemVisualDefinition = LostItemDefinition["visual"];
export type ItemVisualShape = ItemVisualDefinition["shape"];

export const SUPPORTED_ITEM_VISUAL_SHAPES = [
  "umbrella",
  "bento",
  "cassette",
  "hairclip",
  "photo",
  "ticket",
] as const satisfies readonly ItemVisualShape[];

export interface WorldItemVisualOptions {
  readonly depth?: number;
  readonly scale?: number;
  readonly alpha?: number;
  readonly showHalo?: boolean;
}

interface ItemDrawContext {
  readonly primary: number;
  readonly secondary: number;
  readonly outline: number;
}

type ItemShapeRenderer = (
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
) => void;

const OUTLINE = 0x071326;

function parseHexColor(value: string): number {
  const normalized = value.startsWith("#") ? value.slice(1) : value;
  if (!/^[0-9a-f]{6}$/iu.test(normalized)) {
    throw new Error(`Invalid item visual color: ${value}`);
  }
  return Number.parseInt(normalized, 16);
}

function starPoints(
  centerX: number,
  centerY: number,
  outerRadius: number,
  innerRadius: number,
  pointCount = 5,
): { x: number; y: number }[] {
  return Array.from({ length: pointCount * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index * Math.PI) / pointCount;
    return {
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    };
  });
}

function drawUmbrella(
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
): void {
  const canopy = [
    { x: -19, y: 0 },
    { x: -17, y: -8 },
    { x: -12, y: -15 },
    { x: -6, y: -18 },
    { x: 0, y: -19 },
    { x: 6, y: -18 },
    { x: 12, y: -15 },
    { x: 17, y: -8 },
    { x: 19, y: 0 },
    { x: 13, y: -3 },
    { x: 7, y: 0 },
    { x: 1, y: -3 },
    { x: 0, y: 0 },
    { x: -1, y: -3 },
    { x: -7, y: 0 },
    { x: -13, y: -3 },
  ];
  graphics.fillStyle(context.primary, 1);
  graphics.fillPoints(canopy, true, true);
  graphics.lineStyle(2, context.outline, 0.9);
  graphics.strokePoints(canopy, true, true);

  graphics.lineStyle(1, context.secondary, 0.72);
  graphics.lineBetween(0, -18, -7, 0);
  graphics.lineBetween(0, -18, 7, 0);
  graphics.lineStyle(3, context.secondary, 0.96);
  graphics.strokePoints([
    { x: 0, y: -18 },
    { x: 0, y: 14 },
    { x: -1, y: 17 },
    { x: -4, y: 19 },
    { x: -8, y: 18 },
  ]);

  graphics.fillStyle(context.secondary, 1);
  graphics.fillPoints(starPoints(-9, -8, 4.3, 2), true);
}

function drawBento(
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
): void {
  graphics.fillStyle(context.primary, 1);
  graphics.fillRoundedRect(-19, -11, 38, 24, 6);
  graphics.lineStyle(2, context.outline, 0.9);
  graphics.strokeRoundedRect(-19, -11, 38, 24, 6);

  graphics.fillStyle(context.secondary, 0.16);
  graphics.fillRoundedRect(-15, -8, 30, 16, 4);
  graphics.lineStyle(1, context.secondary, 0.85);
  graphics.strokeRoundedRect(-15, -8, 30, 16, 4);
  graphics.lineBetween(-18, 1, 18, 1);

  graphics.fillStyle(context.secondary, 1);
  graphics.fillPoints(starPoints(-8, -2, 3.4, 1.25, 4), true);
  graphics.fillPoints(starPoints(2, 5, 2.8, 1.05, 4), true);
  graphics.fillPoints(starPoints(9, -4, 2.4, 0.9, 4), true);
  graphics.fillTriangle(-5, -10, 0, -17, 2, -10);
  graphics.fillTriangle(0, -17, 7, -11, 2, -9);
}

function drawCassette(
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
): void {
  graphics.fillStyle(context.primary, 1);
  graphics.fillRoundedRect(-19, -13, 38, 27, 5);
  graphics.lineStyle(2, context.outline, 0.92);
  graphics.strokeRoundedRect(-19, -13, 38, 27, 5);

  graphics.fillStyle(context.outline, 0.72);
  graphics.fillRoundedRect(-14, -8, 28, 14, 3);
  graphics.lineStyle(2, context.secondary, 0.95);
  graphics.strokeCircle(-7, -1, 4.5);
  graphics.strokeCircle(7, -1, 4.5);
  graphics.lineBetween(-3, -1, 3, -1);

  graphics.fillStyle(context.secondary, 0.9);
  graphics.fillCircle(-7, -1, 1.5);
  graphics.fillCircle(7, -1, 1.5);
  graphics.lineStyle(2, context.secondary, 1);
  graphics.strokePoints([
    { x: -17, y: 8 },
    { x: -11, y: 11 },
    { x: -5, y: 12 },
    { x: 4, y: 9 },
    { x: 12, y: 7 },
    { x: 18, y: 10 },
  ]);
  graphics.fillTriangle(-8, 9, 8, 9, 11, 14);
}

function drawHairclip(
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
): void {
  graphics.fillStyle(context.outline, 0.5);
  graphics.fillRoundedRect(-20, -6, 40, 12, 6);
  graphics.fillStyle(context.primary, 1);
  graphics.fillRoundedRect(-18, -4, 36, 8, 4);
  graphics.lineStyle(1, context.outline, 0.9);
  graphics.strokeRoundedRect(-18, -4, 36, 8, 4);
  graphics.lineBetween(-15, 1, 14, 1);

  graphics.lineStyle(1.5, context.secondary, 1);
  graphics.lineBetween(-7, -2, -7, 2);
  graphics.lineBetween(-7, 0, -3, -3);
  graphics.lineBetween(-7, 0, -3, 3);
  graphics.fillStyle(context.secondary, 1);
  graphics.fillEllipse(8, -1, 8, 5);
  graphics.fillTriangle(5, 0, 12, 0, 8, 6);
  graphics.fillPoints(starPoints(18, -7, 4, 1.3, 4), true);
}

function drawPhoto(
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
): void {
  graphics.fillStyle(context.primary, 1);
  graphics.fillRoundedRect(-15, -18, 30, 36, 3);
  graphics.lineStyle(2, context.outline, 0.88);
  graphics.strokeRoundedRect(-15, -18, 30, 36, 3);

  graphics.fillStyle(context.secondary, 0.28);
  graphics.fillRoundedRect(-11, -14, 22, 23, 2);
  graphics.fillStyle(context.outline, 0.78);
  graphics.fillCircle(-4, -6, 3.2);
  graphics.fillCircle(4, -5, 3.2);
  graphics.fillEllipse(-4, 3, 8, 9);
  graphics.fillEllipse(4, 3, 8, 9);

  graphics.fillStyle(context.secondary, 1);
  graphics.fillCircle(8, -10, 4);
  graphics.fillStyle(context.primary, 1);
  graphics.fillCircle(10, -11, 3.7);
  graphics.lineStyle(1, context.secondary, 0.85);
  graphics.lineBetween(-10, 13, 9, 13);
  graphics.lineBetween(-10, 16, 3, 16);
}

function drawTicket(
  graphics: Phaser.GameObjects.Graphics,
  context: ItemDrawContext,
): void {
  graphics.fillStyle(context.primary, 1);
  graphics.fillRoundedRect(-20, -11, 40, 22, 4);
  graphics.lineStyle(2, context.outline, 0.9);
  graphics.strokeRoundedRect(-20, -11, 40, 22, 4);

  graphics.fillStyle(context.outline, 1);
  graphics.fillCircle(-20, 0, 3.3);
  graphics.fillCircle(20, 0, 3.3);
  graphics.lineStyle(1, context.secondary, 0.86);
  for (let y = -8; y <= 8; y += 4) graphics.lineBetween(7, y, 7, y + 2);
  graphics.lineStyle(2, context.secondary, 0.96);
  graphics.lineBetween(-13, 1, 1, 1);
  graphics.lineBetween(-13, 5, -4, 5);
  graphics.fillStyle(context.secondary, 1);
  graphics.fillTriangle(1, -3, 1, 5, 6, 1);
}

const ITEM_SHAPE_RENDERERS: Readonly<Record<ItemVisualShape, ItemShapeRenderer>> = {
  umbrella: drawUmbrella,
  bento: drawBento,
  cassette: drawCassette,
  hairclip: drawHairclip,
  photo: drawPhoto,
  ticket: drawTicket,
};

export function isSupportedItemVisualShape(
  value: string,
): value is ItemVisualShape {
  return Object.hasOwn(ITEM_SHAPE_RENDERERS, value);
}

export function drawItemShape(
  graphics: Phaser.GameObjects.Graphics,
  visual: ItemVisualDefinition,
): void {
  ITEM_SHAPE_RENDERERS[visual.shape](graphics, {
    primary: parseHexColor(visual.primaryColor),
    secondary: parseHexColor(visual.secondaryColor),
    outline: OUTLINE,
  });
}

export function createWorldItemVisual(
  scene: Phaser.Scene,
  position: Point,
  visual: ItemVisualDefinition,
  options: WorldItemVisualOptions = {},
): Phaser.GameObjects.Container {
  const secondary = parseHexColor(visual.secondaryColor);
  const shadow = scene.add.ellipse(1, 11, 38, 12, OUTLINE, 0.38);
  const art = scene.add.graphics();
  drawItemShape(art, visual);

  const children: Phaser.GameObjects.GameObject[] = [shadow];
  if (options.showHalo !== false) {
    const halo = scene.add.circle(0, 0, 25, secondary, 0.07);
    halo.setStrokeStyle(1, secondary, 0.34);
    children.unshift(halo);
  }
  children.push(art);

  const container = scene.add.container(position.x, position.y, children);
  container.setName(`item-visual:${visual.shape}`);
  container.setSize(50, 50);
  container.setDepth(options.depth ?? position.y + 20);
  container.setScale(options.scale ?? 1);
  container.setAlpha(options.alpha ?? 1);
  container.setData("itemVisualShape", visual.shape);
  return container;
}
