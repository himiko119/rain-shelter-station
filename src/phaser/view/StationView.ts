import Phaser from "phaser";

import type { AreaId, OwnerId, Point } from "../../game/core/types";

export const WORLD_WIDTH = 1_120;
export const WORLD_HEIGHT = 630;

const PALETTE = {
  night: 0x071326,
  nightSoft: 0x10283c,
  wall: 0x1a3448,
  wallLight: 0x294a5d,
  floor: 0x203a48,
  floorDark: 0x162d3b,
  rain: 0x8bcdd0,
  lamp: 0xf0d58d,
  lampDim: 0xd0ad65,
  ink: 0xe8efdf,
  shadow: 0x09111f,
  memory: 0xeea07e,
} as const;

const CLOCK_MINUTES_BY_STAGE = [0, 18, 47, 95, 151, 236, 298] as const;

interface RainDrop {
  x: number;
  y: number;
  readonly length: number;
  readonly speed: number;
}

export interface AreaVisual {
  readonly update: (time: number, delta: number) => void;
  readonly destroy: () => void;
}

function addLabel(scene: Phaser.Scene, x: number, y: number, text: string, size = 16): Phaser.GameObjects.Text {
  return scene.add.text(x, y, text, {
    color: "#e8efdf",
    fontFamily: '"Yu Gothic UI", "Hiragino Sans", sans-serif',
    fontSize: `${size}px`,
    stroke: "#071326",
    strokeThickness: 3,
  }).setOrigin(0.5).setDepth(4);
}

function drawFloor(graphics: Phaser.GameObjects.Graphics, color: number = PALETTE.floor): void {
  graphics.fillStyle(color, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.lineStyle(1, 0x7894a0, 0.08);
  for (let x = 0; x <= WORLD_WIDTH; x += 56) graphics.lineBetween(x, 0, x, WORLD_HEIGHT);
  for (let y = 0; y <= WORLD_HEIGHT; y += 56) graphics.lineBetween(0, y, WORLD_WIDTH, y);
  graphics.fillStyle(0x091622, 0.88);
  graphics.fillRect(0, 0, WORLD_WIDTH, 54);
  graphics.fillRect(0, WORLD_HEIGHT - 45, WORLD_WIDTH, 45);
  graphics.fillRect(0, 0, 42, WORLD_HEIGHT);
  graphics.fillRect(WORLD_WIDTH - 42, 0, 42, WORLD_HEIGHT);
}

function drawWindow(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  stage: number,
): void {
  const dawn = Math.max(0, stage - 3) / 3;
  graphics.fillStyle(Phaser.Display.Color.Interpolate.ColorWithColor(
    Phaser.Display.Color.ValueToColor(0x071427),
    Phaser.Display.Color.ValueToColor(0x7ba3a2),
    100,
    Math.round(dawn * 100),
  ).color, 1);
  graphics.fillRoundedRect(x, y, width, height, 5);
  graphics.lineStyle(5, 0x304b5c, 1);
  graphics.strokeRoundedRect(x, y, width, height, 5);
  graphics.lineStyle(2, 0x304b5c, 0.9);
  graphics.lineBetween(x + width / 2, y, x + width / 2, y + height);
  graphics.fillStyle(PALETTE.rain, 0.12 + dawn * 0.09);
  graphics.fillEllipse(x + width * 0.5, y + height * 0.73, width * 0.7, 13);
}

function drawLamp(graphics: Phaser.GameObjects.Graphics, x: number, y: number, lit: boolean): void {
  graphics.lineStyle(3, 0x314657, 1);
  graphics.lineBetween(x, 0, x, y - 10);
  graphics.fillStyle(lit ? PALETTE.lamp : 0x55616a, 0.95);
  graphics.fillRoundedRect(x - 28, y - 10, 56, 20, 5);
  if (lit) {
    graphics.fillStyle(PALETTE.lamp, 0.07);
    graphics.fillTriangle(x - 23, y + 8, x + 23, y + 8, x + 100, y + 210);
    graphics.fillTriangle(x - 23, y + 8, x - 100, y + 210, x + 23, y + 8);
  }
}

function activeLampPositions(areaId: AreaId, stage: number): readonly Point[] {
  switch (areaId) {
    case "area_waiting_room":
      return stage >= 1 ? [{ x: 335, y: 80 }, { x: 735, y: 80 }] : [{ x: 735, y: 80 }];
    case "area_concourse":
      return stage >= 2 ? [{ x: 290, y: 80 }, { x: 690, y: 80 }] : [{ x: 290, y: 80 }];
    case "area_station_office":
      return [{ x: 520, y: 80 }];
    case "area_footbridge":
      return [
        { x: 280, y: 76 },
        ...(stage >= 2 ? [{ x: 560, y: 76 }] : []),
        ...(stage >= 3 ? [{ x: 840, y: 76 }] : []),
      ];
    case "area_rain_platform":
      return [
        { x: 220, y: 146 },
        ...(stage >= 4 ? [{ x: 560, y: 146 }] : []),
        ...(stage >= 5 ? [{ x: 900, y: 146 }] : []),
      ];
  }
}

function drawBench(graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number): void {
  graphics.fillStyle(0x172638, 0.8);
  graphics.fillEllipse(x + width / 2, y + 43, width + 28, 23);
  graphics.fillStyle(0x755c48, 1);
  graphics.fillRoundedRect(x, y, width, 24, 5);
  graphics.fillStyle(0x493b35, 1);
  graphics.fillRect(x + 14, y + 22, 9, 25);
  graphics.fillRect(x + width - 23, y + 22, 9, 25);
  graphics.lineStyle(2, 0xa38664, 0.4);
  for (let offset = 18; offset < width; offset += 44) graphics.lineBetween(x + offset, y + 2, x + offset, y + 21);
}

function paintWaitingRoom(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, stage: number): void {
  drawFloor(graphics, 0x263e47);
  graphics.fillStyle(0x243d4c, 1);
  graphics.fillRect(42, 54, WORLD_WIDTH - 84, 138);
  drawWindow(graphics, 115, 76, 236, 100, stage);
  drawWindow(graphics, 385, 76, 236, 100, stage);
  drawWindow(graphics, 655, 76, 236, 100, stage);
  drawLamp(graphics, 335, 80, stage >= 1);
  drawLamp(graphics, 735, 80, true);
  drawBench(graphics, 482, 190, 270);
  drawBench(graphics, 742, 332, 194);

  graphics.fillStyle(0x1b2c38, 1);
  graphics.fillRoundedRect(884, 82, 130, 194, 8);
  graphics.lineStyle(4, 0x3c5965, 1);
  graphics.strokeRoundedRect(884, 82, 130, 194, 8);
  graphics.fillStyle(stage >= 4 ? PALETTE.memory : 0x20323d, stage >= 4 ? 0.75 : 1);
  graphics.fillRoundedRect(902, 104, 94, 78, 5);
  graphics.fillStyle(0x0c1925, 1);
  graphics.fillRect(914, 246, 70, 8);
  addLabel(scene, 949, 66, stage >= 4 ? "写真機　稼働中" : "写真機", 13);

  graphics.fillStyle(0x263d4a, 1);
  graphics.fillRoundedRect(162, 326, 116, 106, 6);
  graphics.lineStyle(3, 0x60747c, 1);
  graphics.strokeRoundedRect(162, 326, 116, 106, 6);
  for (let x = 185; x < 270; x += 28) graphics.lineBetween(x, 338, x, 421);
  graphics.fillStyle(0x324856, 1);
  graphics.fillRoundedRect(154, 420, 132, 18, 5);
  addLabel(scene, 220, 454, "傘立て", 13);

  graphics.fillStyle(0x111e2a, 1);
  graphics.fillRoundedRect(1_035, 270, 85, 92, 6);
  graphics.lineStyle(2, 0x62818c, 0.6);
  graphics.strokeRoundedRect(1_035, 270, 85, 92, 6);
  addLabel(scene, 1_070, 315, "改札 →", 13);

  graphics.fillStyle(0x101b27, 1);
  graphics.fillCircle(554, 86, 33);
  graphics.lineStyle(3, PALETTE.lampDim, 0.8);
  graphics.strokeCircle(554, 86, 33);
  const clockMinutes = CLOCK_MINUTES_BY_STAGE[Math.min(stage, CLOCK_MINUTES_BY_STAGE.length - 1)] ?? 0;
  const minuteAngle = ((clockMinutes % 60) / 60) * Math.PI * 2 - Math.PI / 2;
  const hourAngle = ((clockMinutes / 60) / 12) * Math.PI * 2 - Math.PI / 2;
  graphics.lineBetween(554, 86, 554 + Math.cos(minuteAngle) * 21, 86 + Math.sin(minuteAngle) * 21);
  graphics.lineBetween(554, 86, 554 + Math.cos(hourAngle) * 15, 86 + Math.sin(hourAngle) * 15);

  graphics.fillStyle(PALETTE.rain, 0.1);
  graphics.fillEllipse(550, 470, 310, 42);
  graphics.lineStyle(2, PALETTE.rain, 0.14);
  graphics.strokeEllipse(550, 470, 310, 42);
}

function paintConcourse(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, stage: number): void {
  drawFloor(graphics, 0x233d4a);
  graphics.fillStyle(0x172d3d, 1);
  graphics.fillRect(42, 54, WORLD_WIDTH - 84, 122);
  graphics.fillStyle(0x0c1927, 1);
  graphics.fillRoundedRect(340, 70, 440, 82, 7);
  graphics.lineStyle(2, 0x557681, 0.7);
  graphics.strokeRoundedRect(340, 70, 440, 82, 7);
  addLabel(scene, 560, 96, "雨ノ間駅　AMENO-MA", 21);
  addLabel(scene, 560, 132, stage >= 5 ? "まもなく　終電がまいります" : "時計は、まだ眠っています", 12);

  graphics.fillStyle(0x1a2f3e, 1);
  graphics.fillRoundedRect(714, 96, 118, 162, 8);
  graphics.lineStyle(3, 0x476571, 1);
  graphics.strokeRoundedRect(714, 96, 118, 162, 8);
  graphics.fillStyle(stage >= 5 ? PALETTE.lamp : 0x34505b, stage >= 5 ? 0.8 : 1);
  graphics.fillRoundedRect(732, 118, 82, 58, 4);
  graphics.fillStyle(0x091622, 1);
  graphics.fillRect(736, 220, 74, 10);
  addLabel(scene, 773, 80, "券売機", 14);

  graphics.fillStyle(0x192d3b, 1);
  graphics.fillRoundedRect(438, 108, 226, 88, 6);
  graphics.lineStyle(2, PALETTE.lampDim, 0.42);
  graphics.strokeRoundedRect(438, 108, 226, 88, 6);
  addLabel(scene, 551, 132, "きっぷ・案内", 13);

  graphics.fillStyle(0x1f3b48, 1);
  graphics.fillRoundedRect(924, 98, 88, 134, 6);
  graphics.fillStyle(PALETTE.rain, 0.35);
  graphics.fillRoundedRect(940, 118, 56, 52, 4);
  addLabel(scene, 968, 82, "電話", 12);

  drawBench(graphics, 704, 336, 244);

  for (let index = 0; index < 5; index += 1) {
    const x = 324 + index * 92;
    graphics.fillStyle(0x172d3b, 1);
    graphics.fillRoundedRect(x, 456, 66, 68, 7);
    graphics.fillStyle(stage >= index + 1 ? PALETTE.rain : 0x394c56, 0.7);
    graphics.fillCircle(x + 33, 474, 6);
  }
  addLabel(scene, 554, 548, "改札", 14);

  graphics.fillStyle(0x111f2e, 1);
  graphics.fillRoundedRect(45, 250, 144, 92, 6);
  addLabel(scene, 117, 296, "← 待合室", 15);
  graphics.fillRoundedRect(276, 40, 126, 90, 6);
  addLabel(scene, 339, 84, stage >= 1 ? "駅員室" : "駅員室　施錠", 13);
  graphics.fillRoundedRect(1_035, 158, 85, 96, 6);
  addLabel(scene, 1_071, 206, stage >= 2 ? "跨線橋 →" : "消灯", 12);

  drawLamp(graphics, 290, 80, true);
  drawLamp(graphics, 690, 80, stage >= 2);
}

function paintStationOffice(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, stage: number): void {
  drawFloor(graphics, 0x30414a);
  graphics.fillStyle(0x2b3c43, 1);
  graphics.fillRect(42, 54, WORLD_WIDTH - 84, 122);
  graphics.fillStyle(0x5e5145, 1);
  graphics.fillRoundedRect(392, 258, 326, 124, 8);
  graphics.fillStyle(0x372f2d, 1);
  graphics.fillRect(412, 380, 18, 88);
  graphics.fillRect(682, 380, 18, 88);
  graphics.lineStyle(2, 0xa08564, 0.45);
  graphics.lineBetween(407, 284, 703, 284);
  graphics.fillStyle(0x0b1824, 1);
  graphics.fillRoundedRect(455, 232, 180, 74, 5);
  addLabel(scene, 545, 258, "忘れもの台帳", 14);

  graphics.fillStyle(0x1f333d, 1);
  graphics.fillRoundedRect(112, 104, 148, 198, 7);
  graphics.lineStyle(3, 0x5e7378, 1);
  graphics.strokeRoundedRect(112, 104, 148, 198, 7);
  graphics.fillStyle(0xbcd5d3, 0.18);
  graphics.fillRoundedRect(130, 130, 112, 68, 3);
  addLabel(scene, 186, 88, "冷蔵庫", 13);

  graphics.fillStyle(0x14242f, 1);
  graphics.fillRoundedRect(492, 48, 124, 122, 10);
  graphics.fillStyle(stage >= 5 ? 0x7b8f91 : 0x415b63, 0.72);
  graphics.fillRoundedRect(506, 61, 96, 96, 48);
  graphics.lineStyle(4, PALETTE.lampDim, stage >= 5 ? 0.8 : 0.3);
  graphics.strokeRoundedRect(506, 61, 96, 96, 48);
  addLabel(scene, 554, 188, "古い鏡", 14);

  graphics.fillStyle(0x25343c, 1);
  graphics.fillRect(858, 92, 142, 218);
  graphics.lineStyle(2, 0x60757c, 0.7);
  for (let x = 880; x < 990; x += 28) graphics.lineBetween(x, 104, x, 298);
  for (let y = 128; y < 300; y += 36) graphics.lineBetween(866, y, 992, y);

  drawLamp(graphics, 520, 80, true);
  graphics.fillStyle(0x111f2e, 1);
  graphics.fillRoundedRect(470, 530, 180, 58, 6);
  addLabel(scene, 560, 559, "改札へ戻る ↓", 14);
}

function paintFootbridge(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, stage: number): void {
  drawFloor(graphics, 0x1c3645);
  graphics.fillStyle(0x142b3d, 1);
  graphics.fillRect(42, 54, WORLD_WIDTH - 84, 180);
  drawWindow(graphics, 78, 76, 272, 132, stage);
  drawWindow(graphics, 382, 76, 272, 132, stage);
  drawWindow(graphics, 686, 76, 272, 132, stage);
  graphics.lineStyle(4, 0x56717b, 0.7);
  graphics.lineBetween(74, 506, 1_082, 506);
  for (let x = 90; x < 1_070; x += 72) graphics.lineBetween(x, 506, x, 534);
  drawBench(graphics, 216, 340, 226);
  drawBench(graphics, 690, 218, 218);
  drawLamp(graphics, 280, 76, true);
  drawLamp(graphics, 560, 76, stage >= 2);
  drawLamp(graphics, 840, 76, stage >= 3);

  graphics.fillStyle(0x111f2e, 1);
  graphics.fillRoundedRect(42, 493, 155, 75, 6);
  addLabel(scene, 120, 530, "← 改札", 15);
  graphics.fillRoundedRect(854, 535, 130, 95, 6);
  addLabel(scene, 919, 570, stage >= 3 ? "ホーム ↓" : "ホーム　閉鎖", 13);

  graphics.fillStyle(PALETTE.rain, 0.08 + stage * 0.01);
  graphics.fillEllipse(530, 484, 520, 32);
}

function paintPlatform(scene: Phaser.Scene, graphics: Phaser.GameObjects.Graphics, stage: number): void {
  graphics.fillGradientStyle(0x0a192d, 0x0a192d, stage >= 6 ? 0x71949a : 0x142d40, stage >= 6 ? 0x71949a : 0x142d40, 1);
  graphics.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  graphics.fillStyle(0x203a46, 1);
  graphics.fillRect(0, 175, WORLD_WIDTH, 315);
  graphics.lineStyle(1, 0x819399, 0.09);
  for (let x = 0; x < WORLD_WIDTH; x += 56) graphics.lineBetween(x, 175, x, 490);
  for (let y = 175; y < 490; y += 56) graphics.lineBetween(0, y, WORLD_WIDTH, y);

  graphics.fillStyle(0xe2c66f, 0.85);
  graphics.fillRect(0, 448, WORLD_WIDTH, 13);
  graphics.fillStyle(0x0a111c, 1);
  graphics.fillRect(0, 490, WORLD_WIDTH, 140);
  graphics.lineStyle(6, 0x777c7e, 1);
  graphics.lineBetween(0, 525, WORLD_WIDTH, 525);
  graphics.lineBetween(0, 592, WORLD_WIDTH, 592);
  graphics.lineStyle(3, 0x3e4449, 1);
  for (let x = 0; x < WORLD_WIDTH; x += 72) graphics.lineBetween(x, 502, x + 38, 620);

  graphics.fillStyle(0x101f2c, 1);
  graphics.fillRect(0, 105, WORLD_WIDTH, 62);
  graphics.lineStyle(5, 0x38515e, 1);
  for (let x = 100; x < WORLD_WIDTH; x += 260) graphics.lineBetween(x, 105, x, 448);
  drawLamp(graphics, 220, 146, true);
  drawLamp(graphics, 560, 146, stage >= 4);
  drawLamp(graphics, 900, 146, stage >= 5);

  drawBench(graphics, 248, 254, 248);
  graphics.fillStyle(0x264650, 1);
  graphics.fillRoundedRect(892, 92, 118, 184, 7);
  graphics.fillStyle(PALETTE.lampDim, 0.48);
  graphics.fillRoundedRect(910, 116, 82, 96, 4);
  addLabel(scene, 951, 78, "飲みもの", 12);
  graphics.fillStyle(0xd6d4c7, 0.9);
  graphics.fillRoundedRect(490, 94, 144, 76, 4);
  addLabel(scene, 562, 132, "雨 ノ 間", 17);
  graphics.lineStyle(5, 0x4d6872, 1);
  graphics.lineBetween(562, 170, 562, 238);
  graphics.fillStyle(0x1a3040, 1);
  graphics.fillRoundedRect(158, 0, 126, 112, 5);
  addLabel(scene, 221, 78, "跨線橋 ↑", 13);

  graphics.fillStyle(PALETTE.rain, stage >= 6 ? 0.08 : 0.2);
  graphics.fillEllipse(470, 406, 380, 46);
  graphics.fillEllipse(840, 350, 210, 30);
  graphics.lineStyle(2, PALETTE.rain, 0.18);
  graphics.strokeEllipse(470, 406, 380, 46);
  graphics.strokeEllipse(840, 350, 210, 30);

  if (stage >= 5) {
    graphics.fillStyle(stage >= 6 ? 0x879494 : 0x283846, 1);
    graphics.fillRoundedRect(600, 466, 520, 166, 16);
    graphics.lineStyle(4, 0x71838a, 0.8);
    graphics.strokeRoundedRect(600, 466, 520, 166, 16);
    for (let x = 636; x < 1_090; x += 114) {
      graphics.fillStyle(0x0b1724, 1);
      graphics.fillRoundedRect(x, 492, 82, 68, 4);
      graphics.fillStyle(PALETTE.lamp, stage >= 6 ? 0.1 : 0.2);
      graphics.fillRect(x + 5, 497, 72, 58);
    }
    graphics.fillStyle(PALETTE.lamp, 0.82);
    graphics.fillCircle(622, 584, 8);
    addLabel(scene, 860, 472, stage >= 6 ? "夜明けを待つ列車" : "行き先のない終電", 14);
  }

  graphics.fillStyle(0x111f2e, 1);
}

export function paintArea(
  scene: Phaser.Scene,
  areaId: AreaId,
  stage: number,
  reducedMotion: boolean,
): AreaVisual {
  const graphics = scene.add.graphics().setDepth(0);
  switch (areaId) {
    case "area_waiting_room": paintWaitingRoom(scene, graphics, stage); break;
    case "area_concourse": paintConcourse(scene, graphics, stage); break;
    case "area_station_office": paintStationOffice(scene, graphics, stage); break;
    case "area_footbridge": paintFootbridge(scene, graphics, stage); break;
    case "area_rain_platform": paintPlatform(scene, graphics, stage); break;
  }

  const rain = scene.add.graphics().setDepth(20);
  const lampGlow = scene.add.graphics().setDepth(1);
  const outdoor = areaId === "area_rain_platform";
  const rainCount = stage >= 6 ? 0 : reducedMotion ? (outdoor ? 38 : 16) : (outdoor ? 92 : 34);
  const drops: RainDrop[] = Array.from({ length: rainCount }, (_, index) => ({
    x: (index * 173 + 41) % WORLD_WIDTH,
    y: (index * 89 + 23) % WORLD_HEIGHT,
    length: 7 + (index % 5) * 3,
    speed: 150 + (index % 7) * 19,
  }));

  const puddle = scene.add.graphics().setDepth(2);
  const update = (time: number, delta: number): void => {
    lampGlow.clear();
    for (const [index, lamp] of activeLampPositions(areaId, stage).entries()) {
      const pulse = reducedMotion ? 0.045 : 0.042 + Math.sin(time * 0.0017 + index * 1.9) * 0.012;
      lampGlow.fillStyle(PALETTE.lamp, pulse);
      lampGlow.fillCircle(lamp.x, lamp.y + 22, 68);
    }
    rain.clear();
    puddle.clear();
    if (stage >= 6) return;
    const intensity = outdoor ? 0.43 : 0.13;
    rain.lineStyle(1, PALETTE.rain, intensity);
    for (const drop of drops) {
      drop.y += (drop.speed * delta) / 1_000;
      if (drop.y > WORLD_HEIGHT + 20) drop.y = -20;
      rain.lineBetween(drop.x, drop.y, drop.x - 4, drop.y + drop.length);
    }
    puddle.lineStyle(1, PALETTE.rain, 0.12);
    const rippleCount = reducedMotion ? 2 : 5;
    for (let index = 0; index < rippleCount; index += 1) {
      const phase = ((time * 0.001 + index * 0.31) % 1);
      const x = 320 + ((index * 197) % 550);
      const y = outdoor ? 352 + (index % 2) * 42 : 464;
      puddle.strokeEllipse(x, y, 8 + phase * 40, 3 + phase * 12);
    }
  };

  return {
    update,
    destroy: () => {
      graphics.destroy();
      rain.destroy();
      lampGlow.destroy();
      puddle.destroy();
    },
  };
}

export function createNagi(scene: Phaser.Scene, position: Point): Phaser.GameObjects.Container {
  const shadow = scene.add.ellipse(0, 18, 35, 14, PALETTE.shadow, 0.42);
  const coat = scene.add.rectangle(0, 0, 27, 40, 0x304763, 1).setOrigin(0.5, 0.28);
  coat.setStrokeStyle(2, 0x7187a0, 0.72);
  const scarf = scene.add.rectangle(2, -10, 25, 6, PALETTE.memory, 0.84).setRotation(-0.08);
  const face = scene.add.circle(0, -25, 11, 0xe9c9aa, 1);
  const hair = scene.add.arc(0, -28, 14, 178, 362, false, 0x11192b, 1);
  const fringe = scene.add.rectangle(-3, -31, 18, 8, 0x11192b, 1).setRotation(-0.15);
  const container = scene.add.container(position.x, position.y, [shadow, coat, scarf, face, hair, fringe]);
  container.setDepth(position.y + 40);
  container.setSize(28, 32);
  scene.physics.add.existing(container);
  const body = container.body as Phaser.Physics.Arcade.Body;
  body.setSize(25, 23);
  body.setOffset(-12, -2);
  body.setCollideWorldBounds(true);
  return container;
}

const OWNER_COLORS: Readonly<Record<OwnerId, number>> = {
  owner_station_attendant: 0x485158,
  owner_red_boots_child: 0x38556a,
  owner_navy_bag_commuter: 0x263c5f,
  owner_old_listener: 0x4b5160,
  owner_ginkgo_student: 0x394a58,
  owner_crescent_youth: 0x374353,
  owner_nagi: 0x304763,
};

export function createPassenger(
  scene: Phaser.Scene,
  ownerId: OwnerId,
  position: Point,
  returned: boolean,
): Phaser.GameObjects.Container {
  const scale = ownerId === "owner_red_boots_child" ? 0.78 : 1;
  const shadow = scene.add.ellipse(0, 18, 36, 13, PALETTE.shadow, 0.42);
  const body = scene.add.rectangle(0, 0, 28, 42, OWNER_COLORS[ownerId], returned ? 0.42 : 0.82).setOrigin(0.5, 0.28);
  const head = scene.add.circle(0, -26, 11, 0x111924, returned ? 0.36 : 0.88);
  const faceShade = scene.add.rectangle(0, -24, 17, 8, 0x07101b, 0.9);
  const accessoryObjects: Phaser.GameObjects.GameObject[] = [];
  switch (ownerId) {
    case "owner_station_attendant": {
      accessoryObjects.push(scene.add.rectangle(0, -38, 27, 7, 0x2b3037, 1));
      accessoryObjects.push(scene.add.rectangle(0, -34, 18, 5, PALETTE.lampDim, 0.6));
      break;
    }
    case "owner_red_boots_child": {
      accessoryObjects.push(scene.add.rectangle(-7, 19, 8, 12, 0xa64843, 1));
      accessoryObjects.push(scene.add.rectangle(7, 19, 8, 12, 0xa64843, 1));
      accessoryObjects.push(scene.add.star(10, -5, 5, 3, 7, PALETTE.ink, 0.82));
      break;
    }
    case "owner_navy_bag_commuter": {
      accessoryObjects.push(scene.add.rectangle(19, 4, 18, 27, 0x1c3150, 1));
      accessoryObjects.push(scene.add.rectangle(19, -7, 15, 3, 0x708aa5, 1));
      break;
    }
    case "owner_old_listener": {
      accessoryObjects.push(scene.add.arc(0, -27, 16, 190, 350, false, 0x537d90, 1));
      accessoryObjects.push(scene.add.circle(-13, -25, 4, 0x3f6c7e, 1));
      accessoryObjects.push(scene.add.circle(13, -25, 4, 0x3f6c7e, 1));
      break;
    }
    case "owner_ginkgo_student": {
      accessoryObjects.push(scene.add.rectangle(18, 4, 19, 27, 0x725d44, 1));
      accessoryObjects.push(scene.add.star(18, -7, 2, 4, 8, PALETTE.lampDim, 1));
      break;
    }
    case "owner_crescent_youth": {
      accessoryObjects.push(scene.add.arc(10, -4, 7, 70, 285, false, PALETTE.lamp, 1));
      break;
    }
    case "owner_nagi": break;
  }
  const container = scene.add.container(position.x, position.y, [shadow, body, head, faceShade, ...accessoryObjects]);
  container.setScale(scale);
  container.setDepth(position.y + 35);
  if (returned) container.setAlpha(0.62);
  return container;
}

export function createHotspotMarker(
  scene: Phaser.Scene,
  position: Point,
  color: number = PALETTE.lamp,
  reducedMotion = false,
): Phaser.GameObjects.Container {
  const halo = scene.add.circle(0, 0, 14, color, 0.08).setStrokeStyle(1, color, 0.45);
  const diamond = scene.add.rectangle(0, 0, 7, 7, color, 0.9).setRotation(Math.PI / 4);
  const container = scene.add.container(position.x, position.y - 25, [halo, diamond]).setDepth(position.y + 80);
  if (!reducedMotion) {
    scene.tweens.add({
      targets: container,
      y: position.y - 31,
      alpha: 0.62,
      duration: 1_100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }
  return container;
}
