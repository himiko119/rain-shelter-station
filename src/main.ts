import Phaser from "phaser";

import { GAME_META } from "./game/content/meta";
import "./styles/main.css";

const app = document.querySelector<HTMLDivElement>("#app");

if (!app) {
  throw new Error("Application root was not found.");
}

const world = document.createElement("div");
world.id = "game-world";
world.setAttribute("aria-label", "雨ノ間駅の夜景");

const title = document.createElement("main");
title.className = "title-screen";
title.innerHTML = `
  <p class="title-screen__eyebrow">A quiet station between memory and dawn</p>
  <h1>${GAME_META.title.slice(0, 5)}<br><span>${GAME_META.title.slice(5)}</span></h1>
  <p class="title-screen__tagline">${GAME_META.tagline}</p>
  <nav class="title-screen__menu" aria-label="タイトルメニュー">
    <button class="primary" type="button">はじめから</button>
    <button type="button" disabled>つづきから <small>セーブなし</small></button>
    <button type="button">設定</button>
    <button type="button">記録</button>
  </nav>
  <p class="title-screen__controls">移動 WASD / 矢印 · 調べる E · ノート N</p>
`;

app.append(world, title);

class TitleScene extends Phaser.Scene {
  public constructor() {
    super("title");
  }

  public create(): void {
    const { width, height } = this.scale;
    const graphics = this.add.graphics();

    graphics.fillGradientStyle(0x071326, 0x071326, 0x143446, 0x102638, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.fillStyle(0x17253a, 0.96);
    graphics.fillRoundedRect(98, 160, 764, 300, 12);
    graphics.fillStyle(0x0a1525, 1);
    graphics.fillRect(120, 184, 720, 242);
    graphics.fillStyle(0xf4d998, 0.16);
    graphics.fillCircle(330, 252, 96);
    graphics.fillCircle(650, 252, 96);
    graphics.fillStyle(0xe5c97d, 0.9);
    graphics.fillCircle(330, 182, 7);
    graphics.fillCircle(650, 182, 7);
    graphics.lineStyle(4, 0x385265, 1);
    graphics.lineBetween(120, 348, 840, 348);
    graphics.fillStyle(0x183347, 1);
    graphics.fillRect(0, 460, width, 80);
    graphics.fillStyle(0x6ca8ae, 0.13);
    graphics.fillEllipse(500, 482, 560, 28);

    const rain = this.add.graphics();
    const drops = Array.from({ length: 72 }, (_, index) => ({
      x: (index * 137) % width,
      y: (index * 79) % height,
      length: 8 + (index % 4) * 3,
      speed: 110 + (index % 5) * 18,
    }));

    this.events.on(Phaser.Scenes.Events.UPDATE, (_time: number, delta: number) => {
      rain.clear();
      rain.lineStyle(1, 0x8fd4db, 0.32);
      for (const drop of drops) {
        drop.y += (drop.speed * delta) / 1_000;
        if (drop.y > height + 20) drop.y = -20;
        rain.lineBetween(drop.x, drop.y, drop.x - 3, drop.y + drop.length);
      }
    });
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: world,
  width: 960,
  height: 540,
  backgroundColor: "#071326",
  render: { antialias: true, pixelArt: false },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [TitleScene],
});
