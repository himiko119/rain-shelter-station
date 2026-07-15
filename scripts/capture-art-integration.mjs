import { spawn } from "node:child_process";
import { mkdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

import { chromium } from "@playwright/test";

const phase = process.env.ART_INTEGRATION_PHASE ?? "after";
if (phase !== "before" && phase !== "after") {
  throw new Error(`ART_INTEGRATION_PHASE must be before or after, received ${phase}`);
}

const root = resolve(`artifacts/art-integration-v4/${phase}`);
const baseUrl = "http://127.0.0.1:4173";
const server = spawn(process.execPath, [
  "node_modules/vite/bin/vite.js",
  "--mode",
  "e2e",
  "--host",
  "127.0.0.1",
  "--port",
  "4173",
  "--strictPort",
], {
  cwd: process.cwd(),
  shell: false,
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => { serverOutput += String(chunk); });
server.stderr.on("data", (chunk) => { serverOutput += String(chunk); });

async function waitForServer() {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) {
      throw new Error(`Capture server exited early.\n${serverOutput}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch {
      // The Vite process is still starting.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Capture server did not become ready.\n${serverOutput}`);
}

async function preparePage(browser, viewport, options = {}) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
    reducedMotion: options.reducedMotion ?? "reduce",
    ...(options.mobile ? { hasTouch: true, isMobile: true } : {}),
    ...(options.recordVideo ? {
      recordVideo: {
        dir: resolve(root, "video/.recording"),
        size: viewport,
      },
    } : {}),
  });
  const page = await context.newPage();
  const failures = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(`console.error: ${message.text()}`);
  });
  page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
  page.on("requestfailed", (request) => failures.push(`requestfailed: ${request.url()}`));
  page.on("response", (response) => {
    if (response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`);
  });
  await page.goto(baseUrl);
  await page.waitForFunction(() => globalThis.__RAIN_SHELTER_E2E__ !== undefined);
  await page.evaluate(async () => globalThis.__RAIN_SHELTER_E2E__?.ready());
  return { context, page, failures };
}

async function loadScenario(page, scenarioId) {
  await page.evaluate(
    async (id) => globalThis.__RAIN_SHELTER_E2E__?.loadScenario(id),
    scenarioId,
  );
}

async function stabilize(page) {
  await page.evaluate(async () => globalThis.__RAIN_SHELTER_E2E__?.stabilizeVisuals());
}

async function screenshot(page, directory, fileName) {
  await mkdir(resolve(root, directory), { recursive: true });
  await stabilize(page);
  await page.screenshot({
    path: resolve(root, directory, fileName),
    animations: "disabled",
    caret: "hide",
  });
}

async function assertClean(failures) {
  if (failures.length > 0) throw new Error(failures.join("\n"));
}

async function captureBefore(browser) {
  {
    const { context, page, failures } = await preparePage(browser, { width: 1920, height: 1080 });
    await loadScenario(page, "fresh-game");
    await screenshot(page, "desktop-1920", "01-waiting-room-1920x1080.png");
    await page.keyboard.down("ArrowUp");
    await page.waitForTimeout(1_900);
    await page.keyboard.up("ArrowUp");
    await screenshot(page, "desktop-1920", "02-waiting-wall-intrusion-1920x1080.png");
    await context.close();
    await assertClean(failures);
  }

  {
    const { context, page, failures } = await preparePage(browser, { width: 1280, height: 720 });
    await loadScenario(page, "fresh-game");
    await screenshot(page, "desktop-1280", "01-waiting-room-1280x720.png");

    await loadScenario(page, "umbrella-return-ready");
    await page.keyboard.press("KeyE");
    await page.getByRole("dialog").waitFor({ state: "visible" });
    await screenshot(page, "desktop-1280", "02-dialogue-1280x720.png");

    await loadScenario(page, "fresh-game");
    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(1_000);
    await page.keyboard.up("ArrowLeft");
    await page.keyboard.press("KeyE");
    await screenshot(page, "desktop-1280", "03-red-umbrella-acquire-1280x720.png");

    await loadScenario(page, "memory-red-pending");
    await page.locator(".screen-layer--memory").waitFor({ state: "visible" });
    await screenshot(page, "desktop-1280", "04-memory-red-umbrella-1280x720.png");
    await context.close();
    await assertClean(failures);
  }

  {
    const { context, page, failures } = await preparePage(browser, { width: 390, height: 844 });
    await loadScenario(page, "fresh-game");
    await screenshot(page, "mobile-390", "01-waiting-room-390x844.png");
    await context.close();
    await assertClean(failures);
  }

  {
    const { context, page, failures } = await preparePage(
      browser,
      { width: 1280, height: 720 },
      { recordVideo: true },
    );
    await loadScenario(page, "fresh-game");
    const route = [
      ["ArrowUp", 2_400],
      ["ArrowDown", 1_300],
      ["ArrowLeft", 2_300],
      ["ArrowRight", 3_000],
      ["ArrowDown", 1_100],
    ];
    for (const [key, duration] of route) {
      await page.keyboard.down(key);
      await page.waitForTimeout(duration);
      await page.keyboard.up(key);
      await page.waitForTimeout(120);
    }
    const video = page.video();
    await page.close();
    await mkdir(resolve(root, "video"), { recursive: true });
    if (video) await video.saveAs(resolve(root, "video/01-waiting-room-before.webm"));
    await context.close();
    await assertClean(failures);
  }
}

async function pressFor(page, key, durationMs) {
  await page.keyboard.down(key);
  try {
    await page.waitForTimeout(durationMs);
  } finally {
    await page.keyboard.up(key);
  }
  await page.waitForTimeout(120);
}

async function showFinalChoice(page) {
  const finalChoice = page.locator('.menu-list--final-choice');
  for (let attempt = 0; attempt < 8 && !(await finalChoice.isVisible()); attempt += 1) {
    await page.keyboard.press("KeyE");
    await page.waitForTimeout(160);
    if (await finalChoice.isVisible()) break;
    await pressFor(page, "ArrowRight", 240);
  }
  await finalChoice.waitFor({ state: "visible" });
}

async function recordAreaVideo(browser, scenarioId, fileName, route) {
  const { context, page, failures } = await preparePage(
    browser,
    { width: 1280, height: 720 },
    { recordVideo: true, reducedMotion: "no-preference" },
  );
  await loadScenario(page, scenarioId);
  await page.waitForTimeout(700);
  for (const [key, duration] of route) await pressFor(page, key, duration);
  await page.waitForTimeout(650);
  const video = page.video();
  await page.close();
  await mkdir(resolve(root, "video"), { recursive: true });
  if (video) await video.saveAs(resolve(root, `video/${fileName}`));
  await context.close();
  await assertClean(failures);
}

async function captureAfter(browser) {
  {
    const { context, page, failures } = await preparePage(browser, { width: 1920, height: 1080 });
    await loadScenario(page, "waiting-mid");
    await screenshot(page, "desktop-1920", "01-waiting-room-1920x1080.png");
    await context.close();
    await assertClean(failures);
  }

  {
    const { context, page, failures } = await preparePage(browser, { width: 1280, height: 720 });

    await loadScenario(page, "waiting-mid");
    await screenshot(page, "desktop-1280", "02-waiting-room-1280x720.png");
    await loadScenario(page, "waiting-far");
    await screenshot(page, "desktop-1280", "03-waiting-room-far.png");
    await loadScenario(page, "waiting-near");
    await screenshot(page, "desktop-1280", "04-waiting-room-near.png");
    await loadScenario(page, "waiting-behind-umbrella-rack");
    await screenshot(page, "desktop-1280", "05-behind-umbrella-rack.png");
    await loadScenario(page, "waiting-under-lamp");
    await screenshot(page, "desktop-1280", "06-under-lamp.png");
    await loadScenario(page, "waiting-at-photo-booth");
    await screenshot(page, "desktop-1280", "07-photo-booth.png");

    await loadScenario(page, "concourse-near-gates");
    await pressFor(page, "ArrowDown", 360);
    await screenshot(page, "desktop-1280", "08-concourse.png");
    await loadScenario(page, "concourse-near-gates");
    await screenshot(page, "desktop-1280", "09-concourse-gates.png");

    await loadScenario(page, "office-behind-desk");
    await pressFor(page, "ArrowDown", 260);
    await screenshot(page, "desktop-1280", "10-station-office.png");
    await loadScenario(page, "office-behind-desk");
    await screenshot(page, "desktop-1280", "11-behind-desk.png");

    await loadScenario(page, "footbridge-near-railing");
    await pressFor(page, "ArrowRight", 300);
    await screenshot(page, "desktop-1280", "12-footbridge.png");
    await loadScenario(page, "footbridge-near-railing");
    await screenshot(page, "desktop-1280", "13-footbridge-railing.png");

    await loadScenario(page, "platform-under-lamp");
    await screenshot(page, "desktop-1280", "14-rain-platform.png");
    await loadScenario(page, "platform-near-edge");
    await screenshot(page, "desktop-1280", "15-platform-edge.png");

    await loadScenario(page, "mobile-dialogue");
    await page.keyboard.press("KeyE");
    await page.locator(".dialogue-layer").waitFor({ state: "visible" });
    await screenshot(page, "desktop-1280", "16-dialogue.png");

    await loadScenario(page, "after-umbrella");
    await page.keyboard.press("KeyN");
    await page.locator(".notebook").waitFor({ state: "visible" });
    await screenshot(page, "desktop-1280", "17-note.png");

    await loadScenario(page, "umbrella-return-ready");
    await page.keyboard.press("KeyI");
    await page.locator(".inventory-grid").waitFor({ state: "visible" });
    await screenshot(page, "desktop-1280", "18-inventory.png");

    await loadScenario(page, "memory-red-umbrella");
    await page.locator(".screen-layer--memory").waitFor({ state: "visible" });
    await screenshot(page, "desktop-1280", "19-memory.png");

    await loadScenario(page, "ending-b-ready");
    await showFinalChoice(page);
    await screenshot(page, "desktop-1280", "20-final-choice.png");

    await context.close();
    await assertClean(failures);
  }

  {
    const { context, page, failures } = await preparePage(
      browser,
      { width: 390, height: 844 },
      { mobile: true },
    );
    await loadScenario(page, "mobile-touch");
    await screenshot(page, "mobile-390", "21-exploration-390x844.png");
    await loadScenario(page, "mobile-dialogue");
    await page.keyboard.press("KeyE");
    await page.locator(".dialogue-layer").waitFor({ state: "visible" });
    await screenshot(page, "mobile-390", "22-dialogue-390x844.png");
    await loadScenario(page, "after-umbrella");
    await page.keyboard.press("KeyN");
    await page.locator(".notebook").waitFor({ state: "visible" });
    await screenshot(page, "mobile-390", "23-note-390x844.png");
    await context.close();
    await assertClean(failures);
  }

  {
    const { context, page, failures } = await preparePage(
      browser,
      { width: 844, height: 390 },
      { mobile: true },
    );
    await loadScenario(page, "mobile-touch");
    await screenshot(page, "mobile-390", "24-landscape-844x390.png");
    await context.close();
    await assertClean(failures);
  }

  await recordAreaVideo(browser, "waiting-far", "01-waiting-room-after.webm", [
    ["ArrowDown", 2_100], ["ArrowRight", 2_000], ["ArrowLeft", 2_300], ["ArrowUp", 2_100],
  ]);
  await recordAreaVideo(browser, "concourse-near-gates", "02-concourse-after.webm", [
    ["ArrowDown", 1_600], ["ArrowRight", 2_100], ["ArrowLeft", 2_500], ["ArrowUp", 1_900],
  ]);
  await recordAreaVideo(browser, "office-behind-desk", "03-office-after.webm", [
    ["ArrowDown", 1_500], ["ArrowRight", 1_900], ["ArrowLeft", 2_200], ["ArrowUp", 1_900],
  ]);
  await recordAreaVideo(browser, "footbridge-near-railing", "04-footbridge-after.webm", [
    ["ArrowRight", 2_100], ["ArrowDown", 1_900], ["ArrowLeft", 2_200], ["ArrowUp", 1_700],
  ]);
  await recordAreaVideo(browser, "platform-under-lamp", "05-platform-after.webm", [
    ["ArrowLeft", 1_800], ["ArrowDown", 1_900], ["ArrowRight", 2_100], ["ArrowUp", 1_800],
  ]);
}

let browser;
try {
  await rm(resolve(root, "video/.recording"), { recursive: true, force: true });
  await waitForServer();
  browser = await chromium.launch({ headless: true });
  if (phase === "before") await captureBefore(browser);
  else await captureAfter(browser);
} finally {
  await browser?.close();
  server.kill();
  await rm(resolve(root, "video/.recording"), { recursive: true, force: true });
}

console.log(`Captured Art Integration V4 ${phase} evidence in ${root}.`);
