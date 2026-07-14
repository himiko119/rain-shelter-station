/* global document, window */

import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { chromium } from "@playwright/test";

const siteUrl = process.env.LIVE_SITE_URL ?? "https://himiko119.github.io/rain-shelter-station/";
const screenshotRoot = resolve(process.env.LIVE_SCREENSHOT_DIR ?? "artifacts/playtest");
const saveKey = "rain-shelter-station.save.v1";

const profiles = [
  {
    name: "chromium-desktop",
    viewport: { width: 1280, height: 720 },
    screenshot: "11-production-desktop-1280x720.png",
  },
  {
    name: "chromium-mobile",
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    screenshot: "12-production-mobile-390x844.png",
  },
  {
    name: "edge-desktop",
    channel: "msedge",
    viewport: { width: 1280, height: 720 },
    screenshot: "13-production-edge-1280x720.png",
  },
];

await mkdir(screenshotRoot, { recursive: true });

const results = [];
for (const profile of profiles) {
  const browser = await chromium.launch({ channel: profile.channel, headless: true });
  const failures = [];
  try {
    const context = await browser.newContext({
      viewport: profile.viewport,
      deviceScaleFactor: 1,
      hasTouch: profile.hasTouch ?? false,
      isMobile: profile.isMobile ?? false,
    });
    const page = await context.newPage();

    await page.addInitScript(() => {
      const NativeAudioContext = window.AudioContext;
      const contexts = [];
      Object.defineProperty(window, "__LIVE_AUDIO_CONTEXTS__", {
        configurable: false,
        get: () => contexts,
      });
      if (NativeAudioContext) {
        window.AudioContext = class TrackedAudioContext extends NativeAudioContext {
          constructor(...args) {
            super(...args);
            contexts.push(this);
          }
        };
      }
    });

    page.on("console", (message) => {
      if (message.type() === "error") failures.push(`console.error: ${message.text()}`);
    });
    page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
    page.on("requestfailed", (request) => {
      failures.push(`requestfailed: ${request.method()} ${request.url()} (${request.failure()?.errorText ?? "unknown"})`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) failures.push(`http ${response.status()}: ${response.url()}`);
    });

    await page.goto(siteUrl, { waitUntil: "networkidle" });
    await page.getByRole("heading", { name: /雨宿り駅の\s*忘れもの/ }).waitFor();
    assert.equal(
      await page.evaluate(() => typeof window.__RAIN_SHELTER_E2E__),
      "undefined",
      "Production must not expose the E2E bridge.",
    );

    await page.getByRole("button", { name: /はじめから/ }).click();
    const walkButton = page.getByRole("button", { name: /駅を歩き始める/ });
    for (let index = 0; index < 16 && !(await walkButton.isVisible()); index += 1) {
      await page.keyboard.press("Enter");
      await page.waitForTimeout(45);
    }
    await walkButton.click();
    await page.locator("#game-world canvas").waitFor({ state: "visible" });
    await page.locator(".game-hud:not([hidden])").waitFor({ state: "visible" });
    await page.waitForTimeout(300);

    const runtime = await page.evaluate(({ key, mobile }) => {
      const canvas = document.querySelector("#game-world canvas");
      const canvasRect = canvas?.getBoundingClientRect();
      const touch = document.querySelector(".touch-controls:not([hidden])");
      const objective = document.querySelector(".objective-chip:not([hidden])");
      const controlsRect = touch?.getBoundingClientRect();
      const objectiveRect = objective?.getBoundingClientRect();
      const touchTargets = touch
        ? [...touch.querySelectorAll("button")].map((button) => {
          const rect = button.getBoundingClientRect();
          return { width: rect.width, height: rect.height };
        })
        : [];
      const audioContexts = window.__LIVE_AUDIO_CONTEXTS__ ?? [];
      return {
        audioStates: audioContexts.map((context) => context.state),
        canvas: canvasRect && {
          left: canvasRect.left,
          top: canvasRect.top,
          right: canvasRect.right,
          bottom: canvasRect.bottom,
          width: canvasRect.width,
          height: canvasRect.height,
        },
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        hasSave: localStorage.getItem(key) !== null,
        mobile,
        objectiveBottom: objectiveRect?.bottom ?? null,
        controlsTop: controlsRect?.top ?? null,
        touchVisible: Boolean(touch),
        touchTargets,
      };
    }, { key: saveKey, mobile: profile.isMobile ?? false });

    assert.ok(runtime.canvas, "Canvas must be present and visible.");
    assert.ok(runtime.canvas.width > 0 && runtime.canvas.height > 0, "Canvas must have non-zero dimensions.");
    assert.ok(runtime.canvas.left >= 0 && runtime.canvas.right <= profile.viewport.width + 1, "Canvas must stay within the viewport width.");
    assert.equal(runtime.documentWidth, runtime.viewportWidth, "The page must not scroll horizontally.");
    assert.ok(runtime.hasSave, "Starting the game must create a save.");
    assert.ok(runtime.audioStates.includes("running"), "AudioContext must run after the first user gesture.");

    if (profile.isMobile) {
      assert.ok(runtime.touchVisible, "Touch controls must be visible on the mobile profile.");
      assert.ok(runtime.objectiveBottom !== null && runtime.controlsTop !== null);
      assert.ok(runtime.objectiveBottom <= runtime.controlsTop, "Objective and touch controls must not overlap.");
      for (const target of runtime.touchTargets) {
        assert.ok(target.width >= 44 && target.height >= 44, "Mobile touch targets must be at least 44px.");
      }
    }

    const faviconStatus = await page.evaluate(async () => {
      const response = await fetch(new URL("favicon.svg", window.location.href));
      await response.arrayBuffer();
      return response.status;
    });
    assert.equal(faviconStatus, 200, "favicon.svg must be available.");

    await page.reload({ waitUntil: "networkidle" });
    const continueButton = page.getByRole("button", { name: /つづきから/ });
    await continueButton.waitFor();
    assert.equal(await continueButton.isEnabled(), true, "Continue must be enabled after reload.");
    await continueButton.click();
    await page.locator(".game-hud:not([hidden])").waitFor({ state: "visible" });
    // Scene resume applies a short Phaser camera fade. Capture the stable
    // production frame, not an engine transition whose timing varies by GPU.
    await page.waitForTimeout(600);

    const screenshotPath = resolve(screenshotRoot, profile.screenshot);
    await mkdir(dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    assert.deepEqual(failures, [], `${profile.name} emitted browser or network errors.`);

    results.push({
      profile: profile.name,
      browserVersion: browser.version(),
      viewport: profile.viewport,
      screenshot: screenshotPath,
      audioStates: runtime.audioStates,
      saveReload: true,
      errors: failures.length,
    });
    await context.close();
  } finally {
    await browser.close();
  }
}

console.log(JSON.stringify({ siteUrl, results }, null, 2));
