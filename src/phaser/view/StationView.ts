import Phaser from "phaser";

import { getAreaStaticArtKey } from "../../game/assets";
import { OWNER_DEFINITIONS } from "../../game/content";
import type { AreaId, Facing, OwnerId, Point } from "../../game/core/types";
import {
  NAGI_SPRITE_FRAME_COUNTS,
  NAGI_SPRITE_TEXTURE_KEYS,
  PASSENGER_SPRITE_TEXTURE_KEYS,
  getNagiActionAnimationKey,
  getNagiAnimationKey,
  getNagiLocomotionTextureKey,
  getPassengerIdleAnimationKey,
  type NagiActionAnimation,
} from "./ArtV3TextureKeys";

export const WORLD_WIDTH = 1_120;
export const WORLD_HEIGHT = 630;

const PALETTE = {
  night: 0x06111f,
  nightSoft: 0x10283c,
  wall: 0x1a3448,
  wallLight: 0x294a5d,
  rain: 0x8bcdd0,
  lamp: 0xf0d58d,
  lampDim: 0xd0ad65,
  ink: 0xe8efdf,
  shadow: 0x07101b,
  memory: 0xeea07e,
  wood: 0x5c493d,
  woodLight: 0x7d624b,
  silver: 0x91a4aa,
} as const;

const CLOCK_MINUTES_BY_STAGE = [0, 18, 47, 95, 151, 236, 298] as const;

interface RainRegion {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface RainDrop {
  x: number;
  y: number;
  readonly length: number;
  readonly speed: number;
  readonly regionIndex: number;
}

interface PaintContext {
  readonly scene: Phaser.Scene;
  readonly graphics: Phaser.GameObjects.Graphics;
  readonly labels: Phaser.GameObjects.Text[];
  readonly stage: number;
}

interface AreaPaintResult {
  readonly outdoor: boolean;
  readonly rainRegions: readonly RainRegion[];
  readonly rippleBands: readonly { readonly x: number; readonly y: number; readonly width: number }[];
}

export interface AreaVisual {
  readonly update: (time: number, delta: number) => void;
  readonly destroy: () => void;
}

function dawnAmount(stage: number): number {
  return Phaser.Math.Clamp((stage - 3) / 3, 0, 1);
}

function dawnColor(stage: number, night: number, dawn: number): number {
  return Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(night),
    Phaser.Display.Color.ValueToColor(dawn),
    100,
    Math.round(dawnAmount(stage) * 100),
  ).color;
}

function addLabel(
  context: PaintContext,
  x: number,
  y: number,
  text: string,
  size = 14,
  options: { readonly color?: string; readonly letterSpacing?: number; readonly depth?: number } = {},
): Phaser.GameObjects.Text {
  const label = context.scene.add.text(x, y, text, {
    color: options.color ?? "#e8efdf",
    fontFamily: '"Yu Mincho", "Hiragino Mincho ProN", "Yu Gothic UI", serif',
    fontSize: `${size}px`,
    fontStyle: "bold",
    stroke: "#06111f",
    strokeThickness: 4,
  }).setOrigin(0.5).setDepth(options.depth ?? 40);
  if (options.letterSpacing !== undefined) label.setLetterSpacing(options.letterSpacing);
  context.labels.push(label);
  return label;
}

function drawOuterFrame(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x06111f, 0.97);
  graphics.fillRect(0, 0, WORLD_WIDTH, 48);
  graphics.fillRect(0, WORLD_HEIGHT - 34, WORLD_WIDTH, 34);
  graphics.fillRect(0, 0, 32, WORLD_HEIGHT);
  graphics.fillRect(WORLD_WIDTH - 32, 0, 32, WORLD_HEIGHT);
  graphics.lineStyle(2, 0x4d6b77, 0.28);
  graphics.strokeRect(32, 48, WORLD_WIDTH - 64, WORLD_HEIGHT - 82);
}

function drawWoodFloor(graphics: Phaser.GameObjects.Graphics, top = 184, bottom = 596): void {
  graphics.fillStyle(0x263b40, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.fillStyle(0x4f4038, 1);
  graphics.fillRect(32, top, WORLD_WIDTH - 64, bottom - top);
  for (let row = 0, y = top; y < bottom; row += 1, y += 31) {
    graphics.fillStyle(row % 2 === 0 ? 0x58473c : 0x4c3d36, 0.96);
    graphics.fillRect(32, y, WORLD_WIDTH - 64, 29);
    graphics.lineStyle(1, 0x221e20, 0.48);
    graphics.lineBetween(32, y + 30, WORLD_WIDTH - 32, y + 30);
    const offset = row % 3 === 0 ? 126 : row % 3 === 1 ? 292 : 454;
    for (let x = offset; x < WORLD_WIDTH - 32; x += 320) {
      graphics.lineBetween(x, y + 1, x, y + 29);
    }
    graphics.lineStyle(1, 0xa6825c, 0.12);
    graphics.lineBetween(54, y + 6, WORLD_WIDTH - 64, y + 6);
  }
}

function drawTerrazzoFloor(graphics: Phaser.GameObjects.Graphics, top = 176): void {
  graphics.fillStyle(0x1d3541, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.fillStyle(0x5b6160, 1);
  graphics.fillRect(32, top, WORLD_WIDTH - 64, WORLD_HEIGHT - top - 34);
  graphics.fillStyle(0x67706d, 0.36);
  graphics.fillRect(32, top, WORLD_WIDTH - 64, 12);
  for (let index = 0; index < 168; index += 1) {
    const x = 43 + ((index * 83) % 1_032);
    const y = top + 17 + ((index * 47) % Math.max(1, WORLD_HEIGHT - top - 70));
    const color = index % 4 === 0 ? 0xc4b483 : index % 3 === 0 ? 0x263b45 : 0x8a8c82;
    graphics.fillStyle(color, 0.18 + (index % 3) * 0.06);
    graphics.fillCircle(x, y, 1 + (index % 2));
  }
  graphics.lineStyle(2, 0x30393b, 0.28);
  graphics.lineBetween(32, 430, WORLD_WIDTH - 32, 430);
}

function drawOfficeFloor(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x26343b, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.fillStyle(0x6a685d, 1);
  graphics.fillRect(32, 176, WORLD_WIDTH - 64, 420);
  for (let y = 188; y < 596; y += 44) {
    graphics.fillStyle(y % 88 === 12 ? 0x777267 : 0x5e6058, 0.34);
    graphics.fillRect(32, y, WORLD_WIDTH - 64, 5);
  }
  graphics.lineStyle(1, 0xd8c38d, 0.07);
  graphics.lineBetween(45, 212, 1_070, 576);
  graphics.lineBetween(150, 176, 1_000, 596);
}

function drawMetalFloor(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(0x142838, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.fillStyle(0x334953, 1);
  graphics.fillRect(32, 234, WORLD_WIDTH - 64, 362);
  for (let x = 42; x < WORLD_WIDTH - 32; x += 86) {
    graphics.fillStyle((x / 86) % 2 === 0 ? 0x394f58 : 0x30454f, 0.88);
    graphics.fillRect(x, 234, 82, 362);
    graphics.lineStyle(1, 0x78919a, 0.16);
    graphics.lineBetween(x, 234, x, 596);
    for (let y = 252; y < 590; y += 82) {
      graphics.fillStyle(0xa4b0b2, 0.3);
      graphics.fillCircle(x + 7, y, 1.5);
    }
  }
  graphics.fillStyle(0x152935, 0.72);
  graphics.fillRect(32, 468, WORLD_WIDTH - 64, 128);
}

function drawWetConcrete(graphics: Phaser.GameObjects.Graphics, stage: number): void {
  const dawn = dawnAmount(stage);
  graphics.fillGradientStyle(
    dawnColor(stage, 0x071427, 0x839b9a),
    dawnColor(stage, 0x0a1d32, 0x91aaa5),
    0x163343,
    0x1d3e48,
    1,
  );
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.fillStyle(0x36515a, 1);
  graphics.fillRect(0, 168, WORLD_WIDTH, 316);
  graphics.fillStyle(0x445f65, 0.58 + dawn * 0.12);
  graphics.fillRect(0, 183, WORLD_WIDTH, 282);
  graphics.lineStyle(1, 0xa5bdba, 0.12);
  for (const y of [246, 338, 421]) graphics.lineBetween(0, y, WORLD_WIDTH, y);
  for (const x of [128, 352, 626, 884]) graphics.lineBetween(x, 183, x + 24, 465);
}

function drawWindow(
  context: PaintContext,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const { graphics, stage } = context;
  const sky = dawnColor(stage, 0x061327, 0x789895);
  graphics.fillStyle(0x0a1824, 1);
  graphics.fillRoundedRect(x - 7, y - 7, width + 14, height + 14, 8);
  graphics.fillGradientStyle(sky, sky, 0x10283c, dawnColor(stage, 0x18394a, 0x9ca99c), 1);
  graphics.fillRoundedRect(x, y, width, height, 4);
  graphics.fillStyle(0x07111c, 0.82);
  graphics.fillRect(x, y + height * 0.68, width, height * 0.32);
  for (let offset = 0; offset < width; offset += 36) {
    const buildingHeight = 12 + ((offset * 7) % Math.max(16, Math.floor(height * 0.22)));
    graphics.fillStyle(offset % 72 === 0 ? 0x102231 : 0x0b1a27, 0.96);
    graphics.fillRect(x + offset, y + height - buildingHeight, 31, buildingHeight);
    if ((offset / 36) % 3 === 0) {
      graphics.fillStyle(PALETTE.lamp, 0.28 + dawnAmount(stage) * -0.1);
      graphics.fillRect(x + offset + 8, y + height - buildingHeight + 5, 3, 3);
    }
  }
  graphics.lineStyle(5, 0x344f5c, 1);
  graphics.strokeRoundedRect(x, y, width, height, 4);
  graphics.lineStyle(3, 0x344f5c, 0.95);
  graphics.lineBetween(x + width / 2, y, x + width / 2, y + height);
  graphics.lineStyle(1, 0xc4e1df, 0.16);
  graphics.lineBetween(x + 11, y + 9, x + width * 0.35, y + height - 11);
  graphics.fillStyle(PALETTE.rain, 0.09);
  graphics.fillEllipse(x + width * 0.53, y + height * 0.8, width * 0.72, 11);
}

function drawLamp(graphics: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean): void {
  graphics.lineStyle(3, 0x354c58, 1);
  graphics.lineBetween(x, 0, x, y - 14);
  graphics.fillStyle(0x0a1722, 0.8);
  graphics.fillEllipse(x, y + 10, 92, 34);
  graphics.fillStyle(lit ? PALETTE.lamp : 0x53616a, 0.97);
  graphics.fillRoundedRect(x - 31, y - 12, 62, 20, 6);
  graphics.fillStyle(lit ? 0xffedb0 : 0x6a7479, 0.82);
  graphics.fillRoundedRect(x - 23, y - 6, 46, 8, 4);
  if (lit) {
    graphics.fillStyle(PALETTE.lamp, 0.045);
    graphics.fillEllipse(x, y + 103, 250, 178);
    graphics.fillStyle(PALETTE.lamp, 0.07);
    graphics.fillEllipse(x, y + 168, 190, 42);
  }
}

function drawBench(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number): void {
  graphics.fillStyle(PALETTE.shadow, 0.52);
  graphics.fillEllipse(x + width / 2, y + 50, width + 40, 24);
  graphics.fillStyle(0x46352d, 1);
  graphics.fillRoundedRect(x - 2, y - 5, width + 4, 27, 6);
  graphics.fillStyle(0x765742, 1);
  graphics.fillRoundedRect(x, y, width, 16, 5);
  graphics.fillStyle(0x342925, 1);
  graphics.fillRect(x + 13, y + 16, 11, 35);
  graphics.fillRect(x + width - 24, y + 16, 11, 35);
  graphics.lineStyle(2, 0xa98461, 0.48);
  for (let offset = 24; offset < width; offset += 46) graphics.lineBetween(x + offset, y + 1, x + offset, y + 15);
}

function drawWallPanel(graphics: Phaser.GameObjects.Graphics, color = 0x263f4d, height = 184): void {
  graphics.fillStyle(color, 1);
  graphics.fillRect(32, 48, WORLD_WIDTH - 64, height - 48);
  graphics.fillStyle(0x0a1825, 0.42);
  graphics.fillRect(32, height - 10, WORLD_WIDTH - 64, 10);
}

function drawUmbrellaRack(graphics: Phaser.GameObjects.Graphics): void {
  graphics.fillStyle(PALETTE.shadow, 0.45);
  graphics.fillEllipse(220, 435, 148, 22);
  graphics.fillStyle(0x293e46, 1);
  graphics.fillRoundedRect(162, 326, 116, 106, 7);
  graphics.lineStyle(4, 0x75888b, 0.9);
  graphics.strokeRoundedRect(162, 326, 116, 106, 7);
  for (const x of [184, 210, 236, 262]) graphics.lineBetween(x, 338, x, 419);
  graphics.lineStyle(3, 0xa0b1af, 0.4);
  graphics.beginPath();
  graphics.arc(188, 352, 14, Math.PI, 0, false);
  graphics.strokePath();
  graphics.lineBetween(188, 352, 188, 401);
  graphics.beginPath();
  graphics.arc(237, 360, 15, Math.PI, 0, false);
  graphics.strokePath();
  graphics.lineBetween(237, 360, 237, 409);
  graphics.fillStyle(0x324952, 1);
  graphics.fillRoundedRect(154, 420, 132, 18, 5);
}

function drawWaitingRoom(context: PaintContext): AreaPaintResult {
  const { graphics, stage } = context;
  drawWoodFloor(graphics);
  drawWallPanel(graphics, 0x203b48, 192);
  drawWindow(context, 78, 68, 258, 104);
  drawWindow(context, 362, 68, 258, 104);
  drawWindow(context, 646, 68, 214, 104);
  drawLamp(graphics, 335, 75, stage >= 1);
  drawLamp(graphics, 735, 75, true);
  drawBench(graphics, 482, 190, 270);
  drawBench(graphics, 742, 332, 194);
  drawUmbrellaRack(graphics);

  graphics.fillStyle(PALETTE.shadow, 0.45);
  graphics.fillEllipse(949, 285, 152, 26);
  graphics.fillStyle(0x122632, 1);
  graphics.fillRoundedRect(884, 82, 130, 194, 10);
  graphics.lineStyle(5, 0x526d76, 1);
  graphics.strokeRoundedRect(884, 82, 130, 194, 10);
  graphics.fillStyle(stage >= 4 ? 0x6b4b49 : 0x1b333e, 1);
  graphics.fillRoundedRect(900, 100, 98, 87, 5);
  graphics.fillStyle(0x07121e, 0.86);
  graphics.fillRect(912, 244, 74, 9);
  graphics.fillStyle(PALETTE.memory, stage >= 4 ? 0.76 : 0.16);
  graphics.fillRoundedRect(932, 255, 34, 7, 3);
  addLabel(context, 949, 63, stage >= 4 ? "写真機　稼働中" : "写真機", 13, { letterSpacing: 2 });
  addLabel(context, 220, 454, "傘立て", 13, { letterSpacing: 2 });

  graphics.fillStyle(0x071421, 1);
  graphics.fillCircle(554, 90, 35);
  graphics.lineStyle(4, PALETTE.lampDim, 0.84);
  graphics.strokeCircle(554, 90, 35);
  const clockMinutes = CLOCK_MINUTES_BY_STAGE[Math.min(stage, CLOCK_MINUTES_BY_STAGE.length - 1)] ?? 0;
  const minuteAngle = ((clockMinutes % 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = ((clockMinutes / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  graphics.lineStyle(2, 0xf5df9c, 0.95);
  graphics.lineBetween(554, 90, 554 + Math.cos(minuteAngle) * 23, 90 + Math.sin(minuteAngle) * 23);
  graphics.lineBetween(554, 90, 554 + Math.cos(hourAngle) * 16, 90 + Math.sin(hourAngle) * 16);
  graphics.fillStyle(0xf5df9c, 1);
  graphics.fillCircle(554, 90, 3);

  graphics.fillStyle(0x102330, 1);
  graphics.fillRoundedRect(1_035, 270, 85, 92, 6);
  graphics.lineStyle(2, 0x62818c, 0.6);
  graphics.strokeRoundedRect(1_035, 270, 85, 92, 6);
  addLabel(context, 1_070, 315, "改札 →", 13);

  graphics.fillStyle(PALETTE.rain, 0.08);
  graphics.fillEllipse(548, 470, 320, 46);
  graphics.fillEllipse(218, 448, 130, 21);
  for (const [x, y] of [[425, 476], [461, 488], [496, 476]] as const) {
    graphics.fillStyle(0x0d2029, 0.3);
    graphics.fillEllipse(x, y, 12, 27);
  }
  drawOuterFrame(graphics);
  return {
    outdoor: false,
    rainRegions: [
      { x: 80, y: 70, width: 254, height: 100 },
      { x: 364, y: 70, width: 254, height: 100 },
      { x: 648, y: 70, width: 210, height: 100 },
    ],
    rippleBands: [{ x: 550, y: 470, width: 290 }],
  };
}

function drawTicketGate(context: PaintContext): AreaPaintResult {
  const { graphics, stage } = context;
  drawTerrazzoFloor(graphics);
  drawWallPanel(graphics, 0x183343, 176);

  graphics.fillStyle(0x071421, 1);
  graphics.fillRoundedRect(324, 62, 472, 84, 8);
  graphics.lineStyle(3, 0x587582, 0.72);
  graphics.strokeRoundedRect(324, 62, 472, 84, 8);
  addLabel(context, 560, 92, "雨ノ間駅　AMENO-MA", 21, { color: "#f0dfad", letterSpacing: 2 });
  addLabel(context, 560, 128, stage >= 5 ? "まもなく、終電がまいります" : "時刻表は、まだ眠っています", 12, { letterSpacing: 1 });

  graphics.fillStyle(0x2a3537, 1);
  graphics.fillRoundedRect(438, 108, 226, 88, 6);
  graphics.fillStyle(0x8da9a4, 0.24);
  graphics.fillRoundedRect(449, 118, 204, 54, 4);
  graphics.lineStyle(2, PALETTE.lampDim, 0.46);
  graphics.strokeRoundedRect(438, 108, 226, 88, 6);
  graphics.fillStyle(0x111e25, 1);
  graphics.fillRect(470, 151, 162, 6);
  addLabel(context, 551, 128, "きっぷ・案内", 12);

  graphics.fillStyle(0x203a45, 1);
  graphics.fillRoundedRect(714, 96, 118, 162, 9);
  graphics.lineStyle(3, 0x526e78, 1);
  graphics.strokeRoundedRect(714, 96, 118, 162, 9);
  graphics.fillStyle(stage >= 5 ? PALETTE.lamp : 0x41616a, stage >= 5 ? 0.8 : 1);
  graphics.fillRoundedRect(731, 116, 84, 58, 5);
  for (let row = 0; row < 2; row += 1) {
    for (let col = 0; col < 3; col += 1) {
      graphics.fillStyle(col === 1 && stage >= 5 ? 0xf3d88b : 0x7c9699, 0.55);
      graphics.fillCircle(744 + col * 25, 194 + row * 20, 4);
    }
  }
  graphics.fillStyle(0x081521, 1);
  graphics.fillRoundedRect(736, 230, 74, 9, 3);
  addLabel(context, 773, 79, "券売機", 13, { letterSpacing: 2 });

  graphics.fillStyle(0x203944, 1);
  graphics.fillRoundedRect(924, 98, 88, 134, 7);
  graphics.fillStyle(0x9bc8c9, 0.28);
  graphics.fillRoundedRect(940, 116, 56, 50, 4);
  graphics.lineStyle(3, 0x0d1c27, 0.7);
  graphics.strokeCircle(968, 195, 15);
  addLabel(context, 968, 80, "電話", 12);

  drawBench(graphics, 704, 336, 244);
  for (let index = 0; index < 5; index += 1) {
    const x = 324 + index * 92;
    graphics.fillStyle(0x1b3037, 1);
    graphics.fillRoundedRect(x, 456, 66, 68, 7);
    graphics.fillStyle(stage >= index + 1 ? 0x85c8c7 : 0x4d5b5e, 0.78);
    graphics.fillCircle(x + 33, 474, 6);
    graphics.fillStyle(0x071421, 0.7);
    graphics.fillRect(x + 12, 493, 42, 7);
  }
  graphics.fillStyle(PALETTE.lampDim, 0.3);
  graphics.fillRect(324, 529, 434, 4);
  addLabel(context, 554, 552, "改札口", 14, { letterSpacing: 4 });

  graphics.fillStyle(0x0d1d2a, 1);
  graphics.fillRoundedRect(34, 245, 162, 102, 7);
  graphics.fillStyle(0x6d91a0, 0.23);
  graphics.fillRoundedRect(51, 260, 128, 58, 4);
  addLabel(context, 115, 296, "← 待合室", 15);
  graphics.fillStyle(0x0d1d2a, 1);
  graphics.fillRoundedRect(276, 39, 126, 91, 6);
  addLabel(context, 339, 83, stage >= 1 ? "駅員室" : "駅員室　施錠", 13);
  graphics.fillStyle(0x0d1d2a, 1);
  graphics.fillRoundedRect(1_035, 154, 85, 100, 6);
  addLabel(context, 1_071, 204, stage >= 2 ? "跨線橋 →" : "消灯", 12);
  drawLamp(graphics, 290, 77, true);
  drawLamp(graphics, 690, 77, stage >= 2);
  drawOuterFrame(graphics);
  return {
    outdoor: false,
    rainRegions: [{ x: 449, y: 118, width: 204, height: 54 }],
    rippleBands: [{ x: 405, y: 411, width: 190 }],
  };
}

function drawStationOffice(context: PaintContext): AreaPaintResult {
  const { graphics, stage } = context;
  drawOfficeFloor(graphics);
  drawWallPanel(graphics, 0x343d3c, 176);

  graphics.fillStyle(PALETTE.shadow, 0.5);
  graphics.fillEllipse(555, 455, 380, 40);
  graphics.fillStyle(0x594b40, 1);
  graphics.fillRoundedRect(392, 258, 326, 124, 9);
  graphics.fillStyle(0x836c52, 0.7);
  graphics.fillRoundedRect(404, 270, 302, 21, 6);
  graphics.fillStyle(0x382f2b, 1);
  graphics.fillRect(412, 380, 18, 88);
  graphics.fillRect(682, 380, 18, 88);
  graphics.fillStyle(0xe6ddc2, 0.88);
  graphics.fillRoundedRect(466, 238, 174, 70, 4);
  graphics.lineStyle(1, 0x7f765e, 0.45);
  for (let y = 250; y < 298; y += 10) graphics.lineBetween(480, y, 625, y);
  graphics.fillStyle(PALETTE.memory, 0.32);
  graphics.fillCircle(610, 277, 13);
  addLabel(context, 553, 221, "忘れもの台帳", 13, { color: "#f4e6bd", letterSpacing: 2 });

  graphics.fillStyle(0x26363a, 1);
  graphics.fillRoundedRect(112, 104, 148, 198, 8);
  graphics.lineStyle(3, 0x738284, 1);
  graphics.strokeRoundedRect(112, 104, 148, 198, 8);
  graphics.fillStyle(0xc8ded8, 0.2);
  graphics.fillRoundedRect(129, 128, 114, 69, 4);
  graphics.fillStyle(PALETTE.lamp, stage >= 1 ? 0.25 : 0.05);
  graphics.fillRoundedRect(137, 137, 98, 52, 3);
  graphics.lineStyle(2, 0x99a4a1, 0.7);
  graphics.lineBetween(126, 218, 246, 218);
  graphics.fillStyle(0x9aa6a5, 0.75);
  graphics.fillCircle(235, 258, 4);
  addLabel(context, 186, 87, "冷蔵庫", 13);

  graphics.fillStyle(0x12232b, 1);
  graphics.fillRoundedRect(492, 48, 124, 122, 12);
  graphics.fillStyle(stage >= 5 ? 0x84999a : 0x405d63, 0.8);
  graphics.fillRoundedRect(506, 61, 96, 96, 48);
  graphics.lineStyle(4, PALETTE.lampDim, stage >= 5 ? 0.9 : 0.32);
  graphics.strokeRoundedRect(506, 61, 96, 96, 48);
  graphics.fillStyle(0xe9c7aa, 0.13);
  graphics.fillCircle(554, 91, 13);
  graphics.fillStyle(0x1c3148, 0.24);
  graphics.fillRoundedRect(540, 104, 28, 38, 8);
  addLabel(context, 554, 188, "古い鏡", 13);

  graphics.fillStyle(0x25343c, 1);
  graphics.fillRect(858, 92, 142, 218);
  graphics.lineStyle(2, 0x738286, 0.62);
  for (let y = 125; y < 300; y += 38) graphics.lineBetween(866, y, 992, y);
  for (let slot = 0; slot < 16; slot += 1) {
    const x = 871 + (slot % 4) * 29;
    const y = 105 + Math.floor(slot / 4) * 38;
    graphics.fillStyle(slot % 3 === 0 ? PALETTE.lampDim : 0x8b938c, 0.45);
    graphics.fillRoundedRect(x, y, 17, 20, 3);
  }

  graphics.fillStyle(0x463f38, 1);
  graphics.fillRoundedRect(520, 408, 76, 64, 7);
  graphics.fillStyle(0x66584a, 0.9);
  graphics.fillRoundedRect(529, 414, 58, 18, 5);
  drawLamp(graphics, 520, 78, true);
  graphics.fillStyle(0x0d1d29, 1);
  graphics.fillRoundedRect(470, 530, 180, 58, 6);
  addLabel(context, 560, 559, "改札へ戻る ↓", 14);
  drawOuterFrame(graphics);
  return {
    outdoor: false,
    rainRegions: [{ x: 129, y: 128, width: 114, height: 69 }],
    rippleBands: [{ x: 260, y: 484, width: 120 }],
  };
}

function drawFootbridge(context: PaintContext): AreaPaintResult {
  const { graphics, stage } = context;
  drawMetalFloor(graphics);
  graphics.fillStyle(0x132b3d, 1);
  graphics.fillRect(32, 48, WORLD_WIDTH - 64, 186);
  drawWindow(context, 68, 68, 286, 142);
  drawWindow(context, 382, 68, 286, 142);
  drawWindow(context, 696, 68, 286, 142);
  for (const x of [210, 524, 838]) {
    graphics.fillStyle(0x091824, 0.72);
    graphics.fillRect(x, 167, 86, 38);
    graphics.lineStyle(3, 0x7a8586, 0.28);
    graphics.lineBetween(x + 8, 198, x + 78, 172);
    graphics.lineBetween(x + 8, 172, x + 78, 198);
  }
  drawBench(graphics, 216, 340, 226);
  drawBench(graphics, 690, 218, 218);
  drawLamp(graphics, 280, 76, true);
  drawLamp(graphics, 560, 76, stage >= 2);
  drawLamp(graphics, 840, 76, stage >= 3);

  graphics.lineStyle(5, 0x71868d, 0.85);
  graphics.lineBetween(74, 506, 834, 506);
  graphics.lineBetween(1_000, 506, 1_082, 506);
  graphics.lineStyle(3, 0x4f6872, 0.82);
  for (let x = 88; x < 834; x += 68) graphics.lineBetween(x, 506, x, 540);
  for (let x = 1_010; x < 1_082; x += 34) graphics.lineBetween(x, 506, x, 540);
  graphics.fillStyle(0x071420, 0.94);
  graphics.fillRoundedRect(834, 492, 166, 138, 4);
  for (let y = 508; y < 625; y += 18) {
    graphics.fillStyle(0x405966, 0.85);
    graphics.fillRect(844, y, 146, 8);
  }
  graphics.fillStyle(PALETTE.lamp, stage >= 3 ? 0.13 : 0.03);
  graphics.fillRect(844, 506, 146, 112);
  addLabel(context, 918, 570, stage >= 3 ? "ホーム ↓" : "ホーム　閉鎖", 13);

  graphics.fillStyle(0x0c1d29, 1);
  graphics.fillRoundedRect(36, 493, 162, 75, 6);
  addLabel(context, 117, 530, "← 改札口", 15);
  graphics.fillStyle(PALETTE.rain, 0.08 + stage * 0.01);
  graphics.fillEllipse(530, 484, 520, 32);
  drawOuterFrame(graphics);
  return {
    outdoor: false,
    rainRegions: [
      { x: 70, y: 70, width: 282, height: 138 },
      { x: 384, y: 70, width: 282, height: 138 },
      { x: 698, y: 70, width: 282, height: 138 },
    ],
    rippleBands: [{ x: 530, y: 484, width: 500 }],
  };
}

function drawPlatform(context: PaintContext): AreaPaintResult {
  const { graphics, stage } = context;
  drawWetConcrete(graphics, stage);
  const dawn = dawnAmount(stage);
  graphics.fillStyle(0x07121e, 0.72 - dawn * 0.38);
  for (let index = 0; index < 12; index += 1) {
    const x = index * 104 - 20;
    const height = 22 + ((index * 19) % 44);
    graphics.fillRect(x, 168 - height, 88, height);
    if (index % 3 === 0) {
      graphics.fillStyle(PALETTE.lamp, 0.28 - dawn * 0.18);
      graphics.fillRect(x + 20, 155 - height, 4, 4);
      graphics.fillStyle(0x07121e, 0.72 - dawn * 0.38);
    }
  }

  graphics.fillStyle(0x0b1c29, 1);
  graphics.fillRect(0, 101, WORLD_WIDTH, 67);
  graphics.fillStyle(0x182f3b, 1);
  graphics.fillRect(0, 101, WORLD_WIDTH, 13);
  graphics.lineStyle(5, 0x45606b, 1);
  for (const x of [100, 360, 620, 880]) graphics.lineBetween(x, 105, x, 448);
  graphics.lineStyle(2, 0x7a9195, 0.22);
  for (let x = 0; x < WORLD_WIDTH; x += 92) graphics.lineBetween(x, 101, x + 62, 168);
  drawLamp(graphics, 220, 145, true);
  drawLamp(graphics, 560, 145, stage >= 4);
  drawLamp(graphics, 900, 145, stage >= 5);

  graphics.fillStyle(0xe3ca72, 0.88);
  graphics.fillRect(0, 447, WORLD_WIDTH, 16);
  for (let x = 8; x < WORLD_WIDTH; x += 22) {
    graphics.fillStyle(0x6b5d36, 0.34);
    graphics.fillCircle(x, 455, 3);
  }
  graphics.fillStyle(0x07111c, 1);
  graphics.fillRect(0, 486, WORLD_WIDTH, 144);
  graphics.fillStyle(0x1d252a, 1);
  for (let y = 498; y < 630; y += 30) graphics.fillRect(0, y, WORLD_WIDTH, 13);
  graphics.lineStyle(7, 0x899092, 1);
  graphics.lineBetween(0, 518, WORLD_WIDTH, 518);
  graphics.lineBetween(0, 594, WORLD_WIDTH, 594);
  graphics.lineStyle(2, 0x3a4146, 1);
  for (let x = -15; x < WORLD_WIDTH; x += 62) graphics.lineBetween(x, 490, x + 58, 628);

  drawBench(graphics, 248, 254, 248);
  graphics.fillStyle(PALETTE.shadow, 0.5);
  graphics.fillEllipse(951, 285, 150, 24);
  graphics.fillStyle(0x244752, 1);
  graphics.fillRoundedRect(892, 92, 118, 184, 8);
  graphics.lineStyle(3, 0x587680, 1);
  graphics.strokeRoundedRect(892, 92, 118, 184, 8);
  graphics.fillStyle(PALETTE.lampDim, 0.5);
  graphics.fillRoundedRect(909, 114, 84, 98, 5);
  for (let row = 0; row < 3; row += 1) {
    graphics.fillStyle(row === 1 ? 0xb75a51 : 0xbfc7bc, 0.62);
    graphics.fillRoundedRect(921, 125 + row * 25, 24, 17, 3);
    graphics.fillRoundedRect(956, 125 + row * 25, 24, 17, 3);
  }
  graphics.fillStyle(PALETTE.lamp, 0.17);
  graphics.fillRect(914, 275, 74, 126);
  addLabel(context, 951, 77, "飲みもの", 12);

  graphics.fillStyle(0xe0ded2, 0.94);
  graphics.fillRoundedRect(490, 91, 144, 78, 5);
  graphics.fillStyle(0x172836, 1);
  graphics.fillRoundedRect(501, 104, 122, 49, 3);
  addLabel(context, 562, 129, "雨ノ間", 18, { color: "#f2e7c7", letterSpacing: 4 });
  graphics.lineStyle(6, 0x4d6872, 1);
  graphics.lineBetween(562, 169, 562, 238);
  graphics.fillStyle(0x102332, 1);
  graphics.fillRoundedRect(158, 0, 126, 112, 5);
  addLabel(context, 221, 76, "跨線橋 ↑", 13);

  for (const reflection of [
    { x: 470, y: 407, width: 380, color: PALETTE.rain },
    { x: 840, y: 350, width: 210, color: PALETTE.lamp },
    { x: 951, y: 388, width: 116, color: PALETTE.lampDim },
  ]) {
    graphics.fillStyle(reflection.color, 0.09 + dawn * 0.02);
    graphics.fillEllipse(reflection.x, reflection.y, reflection.width, Math.max(20, reflection.width * 0.1));
    graphics.lineStyle(2, reflection.color, 0.16);
    graphics.strokeEllipse(reflection.x, reflection.y, reflection.width, Math.max(20, reflection.width * 0.1));
  }

  if (stage >= 5) {
    graphics.fillStyle(0x0b121a, 0.72);
    graphics.fillEllipse(865, 602, 560, 48);
    graphics.fillStyle(stage >= 6 ? 0x8b9794 : 0x30414c, 1);
    graphics.fillRoundedRect(600, 466, 548, 166, 17);
    graphics.lineStyle(5, stage >= 6 ? 0xb9c2ba : 0x71838a, 0.82);
    graphics.strokeRoundedRect(600, 466, 548, 166, 17);
    graphics.fillStyle(stage >= 6 ? 0xd4d6ca : 0x132332, 0.85);
    graphics.fillRoundedRect(608, 476, 531, 19, 8);
    for (let x = 636; x < 1_100; x += 114) {
      graphics.fillStyle(0x091522, 1);
      graphics.fillRoundedRect(x, 505, 82, 63, 5);
      graphics.fillStyle(PALETTE.lamp, stage >= 6 ? 0.17 : 0.27);
      graphics.fillRoundedRect(x + 5, 510, 72, 53, 3);
      graphics.lineStyle(1, 0xc1c6b9, 0.3);
      graphics.lineBetween(x + 41, 510, x + 41, 563);
    }
    graphics.fillStyle(stage >= 6 ? 0xe9deaf : PALETTE.lamp, 0.95);
    graphics.fillCircle(622, 587, 8);
    graphics.fillStyle(0xba5048, 0.9);
    graphics.fillCircle(1_116, 587, 7);
    addLabel(context, 860, 473, stage >= 6 ? "始発　朝の向こうへ" : "行き先のない終電", 14, { color: "#fff0c7" });
  }
  drawOuterFrame(graphics);
  return {
    outdoor: true,
    rainRegions: [{ x: 0, y: 0, width: WORLD_WIDTH, height: stage >= 5 ? 470 : WORLD_HEIGHT }],
    rippleBands: [
      { x: 470, y: 407, width: 350 },
      { x: 840, y: 350, width: 190 },
      { x: 1_010, y: 426, width: 120 },
    ],
  };
}

function activeLampPositions(areaId: AreaId, stage: number): readonly Point[] {
  switch (areaId) {
    case "area_waiting_room": return stage >= 1 ? [{ x: 335, y: 75 }, { x: 735, y: 75 }] : [{ x: 735, y: 75 }];
    case "area_concourse": return stage >= 2 ? [{ x: 290, y: 77 }, { x: 690, y: 77 }] : [{ x: 290, y: 77 }];
    case "area_station_office": return [{ x: 520, y: 78 }];
    case "area_footbridge": return [{ x: 280, y: 76 }, ...(stage >= 2 ? [{ x: 560, y: 76 }] : []), ...(stage >= 3 ? [{ x: 840, y: 76 }] : [])];
    case "area_rain_platform": return [{ x: 220, y: 145 }, ...(stage >= 4 ? [{ x: 560, y: 145 }] : []), ...(stage >= 5 ? [{ x: 900, y: 145 }] : [])];
  }
}

function createDrops(regions: readonly RainRegion[], count: number): RainDrop[] {
  if (regions.length === 0) return [];
  return Array.from({ length: count }, (_, index) => {
    const regionIndex = index % regions.length;
    const region = regions[regionIndex] as RainRegion;
    return {
      x: region.x + ((index * 173 + 41) % Math.max(1, Math.floor(region.width))),
      y: region.y + ((index * 89 + 23) % Math.max(1, Math.floor(region.height))),
      length: 7 + (index % 5) * 3,
      speed: 150 + (index % 7) * 19,
      regionIndex,
    };
  });
}

export function paintArea(
  scene: Phaser.Scene,
  areaId: AreaId,
  stage: number,
  reducedMotion: boolean,
): AreaVisual {
  const graphics = scene.add.graphics().setDepth(0);
  const labels: Phaser.GameObjects.Text[] = [];
  const context: PaintContext = { scene, graphics, labels, stage };
  const paintResult = areaId === "area_waiting_room"
    ? drawWaitingRoom(context)
    : areaId === "area_concourse"
      ? drawTicketGate(context)
      : areaId === "area_station_office"
        ? drawStationOffice(context)
        : areaId === "area_footbridge"
          ? drawFootbridge(context)
          : drawPlatform(context);

  const staticBackgroundKey = getAreaStaticArtKey(areaId, stage);
  const staticBackground = scene.textures.exists(staticBackgroundKey)
    ? scene.add.image(0, 0, staticBackgroundKey)
      .setName(`static-background:${areaId}`)
      .setOrigin(0)
      .setDisplaySize(WORLD_WIDTH, WORLD_HEIGHT)
      .setDepth(-100)
    : null;
  if (staticBackground) graphics.setVisible(false);

  const farRain = scene.add.graphics().setDepth(1);
  const lampGlow = scene.add.graphics().setDepth(2);
  const puddle = scene.add.graphics().setDepth(3);
  const nearRain = scene.add.graphics().setDepth(900);
  const rainCount = stage >= 6
    ? 0
    : reducedMotion
      ? (paintResult.outdoor ? 38 : 14)
      : (paintResult.outdoor ? 94 : 30);
  const drops = createDrops(paintResult.rainRegions, rainCount);

  const update = (time: number, delta: number): void => {
    lampGlow.clear();
    for (const [index, lamp] of activeLampPositions(areaId, stage).entries()) {
      const pulse = reducedMotion ? 0.036 : 0.038 + Math.sin(time * 0.0017 + index * 1.9) * 0.009;
      lampGlow.fillStyle(PALETTE.lamp, pulse);
      lampGlow.fillEllipse(lamp.x, lamp.y + 92, 230, 190);
      lampGlow.fillStyle(PALETTE.lamp, pulse * 1.45);
      lampGlow.fillEllipse(lamp.x, lamp.y + 177, 190, 35);
    }

    farRain.clear();
    nearRain.clear();
    const intensity = paintResult.outdoor ? 0.36 : 0.18;
    farRain.lineStyle(1, PALETTE.rain, intensity);
    nearRain.lineStyle(2, 0xb8e2df, reducedMotion ? 0.07 : 0.13);
    for (const [index, drop] of drops.entries()) {
      const region = paintResult.rainRegions[drop.regionIndex] as RainRegion;
      drop.y += (drop.speed * delta) / 1_000;
      if (drop.y > region.y + region.height + 16) drop.y = region.y - 16;
      farRain.lineBetween(drop.x, drop.y, drop.x - 4, drop.y + drop.length);
      if (paintResult.outdoor && index % 5 === 0) {
        nearRain.lineBetween(drop.x + 5, drop.y - 14, drop.x - 2, drop.y + drop.length + 11);
      }
    }

    puddle.clear();
    puddle.lineStyle(1, PALETTE.rain, stage >= 6 ? 0.08 : 0.14);
    const rippleCount = reducedMotion ? 1 : 3;
    for (const [bandIndex, band] of paintResult.rippleBands.entries()) {
      for (let index = 0; index < rippleCount; index += 1) {
        const phase = ((time * 0.00085 + index * 0.31 + bandIndex * 0.17) % 1);
        const x = band.x - band.width / 2 + ((index + 1) * band.width) / (rippleCount + 1);
        puddle.strokeEllipse(x, band.y + (index % 2) * 6, 7 + phase * 34, 2 + phase * 9);
      }
    }
  };
  update(0, 0);

  return {
    update,
    destroy: () => {
      staticBackground?.destroy();
      graphics.destroy();
      farRain.destroy();
      lampGlow.destroy();
      puddle.destroy();
      nearRain.destroy();
      for (const label of labels) label.destroy();
    },
  };
}

const NAGI_SPRITE_NAME = "nagi-art-v3-sprite";
const NAGI_ACTION_ACTIVE_DATA_KEY = "nagiArtV3ActionActive";
const NAGI_ACTION_UNTIL_DATA_KEY = "nagiArtV3ActionUntil";

function ensureNagiLocomotionAnimations(scene: Phaser.Scene): void {
  for (const motion of ["idle", "walk"] as const) {
    const frameCount = NAGI_SPRITE_FRAME_COUNTS[motion];
    const frameRate = motion === "walk" ? 9 : 3;
    for (const facing of ["down", "up", "left", "right"] as const) {
      const textureKey = NAGI_SPRITE_TEXTURE_KEYS[motion][facing];
      const animationKey = getNagiAnimationKey(motion, facing);
      if (!scene.textures.exists(textureKey) || scene.anims.exists(animationKey)) continue;
      scene.anims.create({
        key: animationKey,
        frames: scene.anims.generateFrameNumbers(textureKey, {
          start: 0,
          end: frameCount - 1,
        }),
        frameRate,
        repeat: -1,
      });
    }
  }
}

function ensureNagiActionAnimations(scene: Phaser.Scene): void {
  for (const action of ["inspect", "acquire"] as const) {
    const textureKey = NAGI_SPRITE_TEXTURE_KEYS[action];
    const animationKey = getNagiActionAnimationKey(action);
    if (!scene.textures.exists(textureKey) || scene.anims.exists(animationKey)) continue;
    scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(textureKey, {
        start: 0,
        end: NAGI_SPRITE_FRAME_COUNTS[action] - 1,
      }),
      frameRate: action === "inspect" ? 8 : 10,
      repeat: 0,
    });
  }
}

function getNagiSprite(
  container: Phaser.GameObjects.Container,
): Phaser.GameObjects.Sprite | null {
  return container.getByName(NAGI_SPRITE_NAME) as Phaser.GameObjects.Sprite | null;
}

export function createNagi(
  scene: Phaser.Scene,
  position: Point,
  reducedMotion = false,
): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 19, 42, 15, PALETTE.shadow, 0.5).setName("nagi-shadow");
  const leftLeg = scene.add.rectangle(-7, 13, 8, 21, 0x18263c, 1).setOrigin(0.5, 0).setName("nagi-left-leg");
  const rightLeg = scene.add.rectangle(7, 13, 8, 21, 0x18263c, 1).setOrigin(0.5, 0).setName("nagi-right-leg");
  const leftShoe = scene.add.ellipse(-7, 35, 11, 6, 0x09111f, 1).setName("nagi-left-shoe");
  const rightShoe = scene.add.ellipse(7, 35, 11, 6, 0x09111f, 1).setName("nagi-right-shoe");
  const coat = scene.add.rectangle(0, 3, 35, 47, 0x294a69, 1).setOrigin(0.5, 0.35);
  coat.setStrokeStyle(2, 0x82a4ba, 0.82);
  const coatPanel = scene.add.rectangle(0, 9, 2, 30, 0xb5cbd2, 0.42);
  const collarLeft = scene.add.triangle(-7, -8, 0, 0, 12, 0, 6, 12, 0xd7e1d9, 0.86);
  const collarRight = scene.add.triangle(7, -8, 0, 0, -12, 0, -6, 12, 0xd7e1d9, 0.86);
  const scarf = scene.add.rectangle(2, -12, 31, 7, PALETTE.memory, 0.96).setRotation(-0.08).setName("nagi-scarf");
  const scarfTail = scene.add.rectangle(14, -5, 7, 20, 0xc96f61, 0.92).setRotation(-0.16);
  const face = scene.add.circle(0, -31, 13, 0xe9c9aa, 1);
  const ear = scene.add.circle(12, -29, 3, 0xd9ad8d, 1);
  const hairBack = scene.add.circle(0, -34, 15, 0x11192b, 1);
  const faceFront = scene.add.ellipse(1, -29, 22, 20, 0xe9c9aa, 1);
  const fringe = scene.add.arc(-2, -35, 15, 182, 356, false, 0x11192b, 1);
  const eye = scene.add.circle(8, -29, 1.4, 0x17202b, 1);
  const hairClip = scene.add.rectangle(-10, -39, 7, 2, PALETTE.lamp, 0.76).setRotation(-0.4);
  const visual = scene.add.container(0, 0, [
    leftLeg,
    rightLeg,
    leftShoe,
    rightShoe,
    coat,
    coatPanel,
    collarLeft,
    collarRight,
    scarfTail,
    scarf,
    hairBack,
    face,
    ear,
    faceFront,
    fringe,
    eye,
    hairClip,
  ]).setName("nagi-visual");
  const staticSprite = scene.textures.exists(NAGI_SPRITE_TEXTURE_KEYS.idle.down)
    ? scene.add.sprite(0, 40, NAGI_SPRITE_TEXTURE_KEYS.idle.down, 0)
      .setName(NAGI_SPRITE_NAME)
      .setOrigin(0.5, 1)
      .setScale(0.82)
    : null;
  if (staticSprite) {
    ensureNagiLocomotionAnimations(scene);
    ensureNagiActionAnimations(scene);
    visual.setVisible(false);
    if (!reducedMotion) {
      const idleAnimation = getNagiAnimationKey("idle", "down");
      if (scene.anims.exists(idleAnimation)) staticSprite.play(idleAnimation);
    }
  }

  const children: Phaser.GameObjects.GameObject[] = [shadow, visual];
  if (staticSprite) children.push(staticSprite);
  const container = scene.add.container(position.x, position.y, children);
  container.setName("nagi");
  container.setDepth(position.y + 40);
  container.setSize(28, 32);
  scene.physics.add.existing(container);
  const body = container.body as Phaser.Physics.Arcade.Body;
  body.setSize(25, 23);
  body.setOffset(-12, -2);
  body.setCollideWorldBounds(true);
  return container;
}

export function setNagiMotion(
  container: Phaser.GameObjects.Container,
  facing: Facing,
  moving: boolean,
  time: number,
  reducedMotion: boolean,
): void {
  const staticSprite = getNagiSprite(container);
  if (staticSprite) {
    const actionActive = staticSprite.getData(NAGI_ACTION_ACTIVE_DATA_KEY) === true;
    const actionUntil = staticSprite.getData(NAGI_ACTION_UNTIL_DATA_KEY) as number | undefined;
    if (actionActive && (actionUntil === undefined || time < actionUntil)) return;
    if (actionActive) {
      staticSprite.setData(NAGI_ACTION_ACTIVE_DATA_KEY, false);
      staticSprite.setData(NAGI_ACTION_UNTIL_DATA_KEY, undefined);
    }

    const motion = moving ? "walk" : "idle";
    const requestedTextureKey = getNagiLocomotionTextureKey(facing, moving);
    const facingIdleTextureKey = getNagiLocomotionTextureKey(facing, false);
    const textureKey = container.scene.textures.exists(requestedTextureKey)
      ? requestedTextureKey
      : container.scene.textures.exists(facingIdleTextureKey)
        ? facingIdleTextureKey
        : NAGI_SPRITE_TEXTURE_KEYS.idle.down;
    if (reducedMotion) {
      staticSprite.anims.stop();
      staticSprite.setTexture(textureKey, 0);
    } else {
      const animationKey = getNagiAnimationKey(motion, facing);
      if (
        textureKey === requestedTextureKey
        && container.scene.anims.exists(animationKey)
      ) {
        staticSprite.play(animationKey, true);
      } else {
        staticSprite.anims.stop();
        staticSprite.setTexture(textureKey, 0);
      }
    }
    staticSprite.setData("facing", facing);
    staticSprite.setData("moving", moving);
    return;
  }

  const visual = container.getByName("nagi-visual") as Phaser.GameObjects.Container | null;
  if (!visual) return;
  const direction = facing === "left" ? -1 : 1;
  visual.setScale(direction, 1);
  const stride = moving && !reducedMotion ? Math.sin(time * 0.02) : 0;
  visual.y = moving && !reducedMotion ? Math.abs(Math.sin(time * 0.02)) * -1.8 : 0;
  const leftLeg = visual.getByName("nagi-left-leg") as Phaser.GameObjects.Rectangle | null;
  const rightLeg = visual.getByName("nagi-right-leg") as Phaser.GameObjects.Rectangle | null;
  const leftShoe = visual.getByName("nagi-left-shoe") as Phaser.GameObjects.Ellipse | null;
  const rightShoe = visual.getByName("nagi-right-shoe") as Phaser.GameObjects.Ellipse | null;
  const scarf = visual.getByName("nagi-scarf") as Phaser.GameObjects.Rectangle | null;
  if (leftLeg) leftLeg.setRotation(stride * 0.18);
  if (rightLeg) rightLeg.setRotation(-stride * 0.18);
  if (leftShoe) leftShoe.y = 35 + stride * 2;
  if (rightShoe) rightShoe.y = 35 - stride * 2;
  if (scarf) scarf.setRotation(-0.08 + (moving && !reducedMotion ? Math.sin(time * 0.011) * 0.06 : 0));
  visual.setAlpha(facing === "up" ? 0.97 : 1);
}

export function playNagiAction(
  container: Phaser.GameObjects.Container,
  action: NagiActionAnimation,
  reducedMotion: boolean,
): boolean {
  const staticSprite = getNagiSprite(container);
  if (!staticSprite) return false;
  const textureKey = NAGI_SPRITE_TEXTURE_KEYS[action];
  if (!container.scene.textures.exists(textureKey)) return false;

  staticSprite.setData(NAGI_ACTION_ACTIVE_DATA_KEY, true);
  if (reducedMotion) {
    staticSprite.anims.stop();
    staticSprite.setTexture(
      textureKey,
      Math.min(2, NAGI_SPRITE_FRAME_COUNTS[action] - 1),
    );
    staticSprite.setData(
      NAGI_ACTION_UNTIL_DATA_KEY,
      container.scene.time.now + 180,
    );
    return true;
  }

  const animationKey = getNagiActionAnimationKey(action);
  if (!container.scene.anims.exists(animationKey)) {
    staticSprite.setTexture(textureKey, 0);
    staticSprite.setData(
      NAGI_ACTION_UNTIL_DATA_KEY,
      container.scene.time.now + 180,
    );
    return true;
  }

  staticSprite.setData(NAGI_ACTION_UNTIL_DATA_KEY, undefined);
  staticSprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
    if (!staticSprite.active) return;
    staticSprite.setData(NAGI_ACTION_ACTIVE_DATA_KEY, false);
    staticSprite.setData(NAGI_ACTION_UNTIL_DATA_KEY, undefined);
  });
  staticSprite.play(animationKey, true);
  return true;
}

function ownerDefinition(ownerId: OwnerId) {
  const owner = OWNER_DEFINITIONS.find((candidate) => candidate.id === ownerId);
  if (!owner) throw new Error(`Unknown owner visual: ${ownerId}`);
  return owner;
}

function createPassengerStaticSprite(
  scene: Phaser.Scene,
  ownerId: OwnerId,
  reducedMotion: boolean,
): Phaser.GameObjects.Sprite | null {
  const textureKey = PASSENGER_SPRITE_TEXTURE_KEYS[ownerId];
  if (!textureKey || !scene.textures.exists(textureKey)) return null;

  const sprite = scene.add.sprite(0, 43, textureKey, 0)
    .setName("passenger-art-v3-sprite")
    .setOrigin(0.5, 1)
    .setScale(0.82);
  const animationKey = getPassengerIdleAnimationKey(ownerId);
  if (!scene.anims.exists(animationKey)) {
    scene.anims.create({
      key: animationKey,
      frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 2 }),
      frameRate: 3,
      repeat: -1,
    });
  }
  if (!reducedMotion) sprite.play(animationKey);
  sprite.setData("ownerId", ownerId);
  return sprite;
}

export function createPassenger(
  scene: Phaser.Scene,
  ownerId: OwnerId,
  position: Point,
  returned: boolean,
  reducedMotion = false,
): Phaser.GameObjects.Container {
  const owner = ownerDefinition(ownerId);
  const bodyColor = Phaser.Display.Color.HexStringToColor(owner.visual.silhouetteColor).color;
  const accent = Phaser.Display.Color.HexStringToColor(owner.visual.accentColor).color;
  const isChild = ownerId === "owner_red_boots_child";
  const heightScale = isChild ? 0.82 : ownerId === "owner_old_listener" ? 0.94 : 1;
  const shadow = scene.add.ellipse(0, 20, isChild ? 34 : 44, 14, PALETTE.shadow, 0.52);
  const warmHalo = scene.add.ellipse(0, 15, isChild ? 44 : 58, 28, PALETTE.lamp, returned ? 0.13 : 0);
  const visual = scene.add.graphics();
  visual.fillStyle(0x111924, 0.98);
  visual.fillCircle(0, -29, isChild ? 12 : 14);
  visual.fillStyle(0xe1bca0, 0.56);
  visual.fillEllipse(1, -26, isChild ? 17 : 20, isChild ? 13 : 15);
  visual.fillStyle(bodyColor, 1);
  visual.fillRoundedRect(isChild ? -14 : -17, -14, isChild ? 28 : 34, isChild ? 40 : 50, 8);
  visual.fillStyle(accent, returned ? 0.95 : 0.72);
  visual.fillRect(isChild ? -12 : -15, -8, isChild ? 24 : 30, 4);
  visual.fillStyle(0x111924, 1);
  visual.fillRoundedRect(-13, isChild ? 25 : 33, 10, 21, 4);
  visual.fillRoundedRect(3, isChild ? 25 : 33, 10, 21, 4);
  visual.lineStyle(returned ? 2 : 1, returned ? PALETTE.lamp : accent, returned ? 0.7 : 0.25);
  visual.strokeRoundedRect(isChild ? -14 : -17, -14, isChild ? 28 : 34, isChild ? 40 : 50, 8);

  switch (ownerId) {
    case "owner_station_attendant":
      visual.fillStyle(0x202a31, 1);
      visual.fillRect(-16, -44, 32, 8);
      visual.fillStyle(PALETTE.lampDim, 0.9);
      visual.fillRect(-11, -36, 22, 4);
      visual.fillStyle(0xe1e5da, 0.72);
      visual.fillRect(-11, -5, 6, 12);
      break;
    case "owner_red_boots_child":
      visual.fillStyle(0xbe4b4c, 1);
      visual.fillRoundedRect(-14, 39, 11, 14, 4);
      visual.fillRoundedRect(3, 39, 11, 14, 4);
      visual.fillStyle(0xf2e3b7, 0.95);
      visual.fillCircle(10, -5, 4);
      visual.fillTriangle(10, -12, 12, -7, 17, -7);
      break;
    case "owner_navy_bag_commuter":
      visual.fillStyle(0x142d4d, 1);
      visual.fillRoundedRect(17, -2, 25, 38, 5);
      visual.lineStyle(3, 0x7894ae, 0.9);
      visual.strokeRoundedRect(17, -2, 25, 38, 5);
      visual.beginPath();
      visual.arc(29, -2, 9, Math.PI, 0, false);
      visual.strokePath();
      break;
    case "owner_old_listener":
      visual.lineStyle(5, accent, 0.95);
      visual.beginPath();
      visual.arc(0, -30, 18, Math.PI, 0, false);
      visual.strokePath();
      visual.fillStyle(accent, 1);
      visual.fillCircle(-16, -28, 6);
      visual.fillCircle(16, -28, 6);
      visual.lineStyle(2, accent, 0.7);
      visual.lineBetween(17, -23, 19, 1);
      break;
    case "owner_ginkgo_student":
      visual.fillStyle(0x6c5136, 1);
      visual.fillRoundedRect(17, -4, 23, 39, 3);
      visual.fillStyle(0xe3d4ae, 0.86);
      visual.fillRoundedRect(20, 0, 17, 31, 2);
      visual.fillStyle(accent, 1);
      visual.fillTriangle(26, -10, 31, -3, 21, -3);
      visual.fillCircle(23, -8, 4);
      break;
    case "owner_crescent_youth":
      visual.fillStyle(0x263349, 1);
      visual.fillTriangle(-17, 36, 0, -10, 17, 36);
      visual.fillStyle(accent, 1);
      visual.beginPath();
      visual.arc(12, -3, 8, -1.1, 1.7, false);
      visual.lineTo(10, -3);
      visual.closePath();
      visual.fillPath();
      visual.fillStyle(0xd0bda7, 0.72);
      visual.fillRoundedRect(20, 8, 20, 28, 3);
      break;
    case "owner_nagi":
      visual.fillStyle(0xdbe5df, 0.52);
      visual.fillRoundedRect(20, 1, 19, 30, 3);
      visual.lineStyle(1, accent, 0.72);
      visual.lineBetween(23, 7, 36, 7);
      break;
  }

  const staticSprite = createPassengerStaticSprite(scene, ownerId, reducedMotion);
  if (staticSprite) visual.setVisible(false);
  const visualContainer = scene.add.container(0, 0, [visual]).setScale(1, heightScale);
  if (returned) {
    const relief = scene.add.star(-21, -31, 4, 2, 6, PALETTE.lamp, 0.85);
    visualContainer.add(relief);
  }
  const children: Phaser.GameObjects.GameObject[] = [shadow, warmHalo, visualContainer];
  if (staticSprite) children.push(staticSprite);
  const container = scene.add.container(position.x, position.y, children);
  container.setName(`passenger:${ownerId}`);
  container.setDepth(position.y + 35);
  container.setData("ownerId", ownerId);
  container.setData("artSource", staticSprite ? "art-v3" : "procedural");
  return container;
}

export function createHotspotMarker(
  scene: Phaser.Scene,
  position: Point,
  color: number = PALETTE.lamp,
  reducedMotion = false,
): Phaser.GameObjects.Container {
  const stem = scene.add.rectangle(0, 10, 1, 11, color, 0.34);
  const halo = scene.add.circle(0, 0, 11, color, 0.035).setStrokeStyle(1, color, 0.52);
  const core = scene.add.rectangle(0, 0, 5, 5, color, 0.92).setRotation(Math.PI / 4);
  const glint = scene.add.circle(-4, -4, 1.5, 0xffffff, 0.7);
  const container = scene.add.container(position.x, position.y - 28, [stem, halo, core, glint]).setDepth(position.y + 80);
  container.setName("hotspot-marker");
  if (!reducedMotion) {
    scene.tweens.add({
      targets: container,
      y: position.y - 33,
      alpha: 0.72,
      duration: 1_250,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }
  return container;
}
