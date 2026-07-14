import { describe, expect, it } from "vitest";

import {
  AREA_STATIC_ART_KEYS,
  ENDING_STATIC_ART_KEYS,
  ITEM_STATIC_ART_KEYS,
  MEMORY_STATIC_ART_KEYS,
  OWNER_PORTRAIT_STATIC_ART_KEYS,
  STATIC_ART_KEYS,
  STATIC_ART_MANIFEST,
  createStaticArtRuntimeState,
  getAreaStaticArtKey,
  getStaticArtAsset,
  getStaticArtAssetUrl,
  getStaticArtRenderDecision,
  inspectStaticArtAvailability,
  isSafePublicAssetPath,
  markStaticArtFailed,
  markStaticArtLoading,
  markStaticArtReady,
  resolvePublicAssetUrl,
  validateStaticArtManifest,
  validateStaticArtRuntimeState,
  type StaticArtAssetKey,
  type StaticArtRuntimeState,
} from "../../src/game/assets";
import {
  PHASER_VISUAL_TOKENS,
  VISUAL_COLOR_TOKENS,
  VISUAL_CSS_VARIABLES,
  VISUAL_MOTION_TOKENS,
  VISUAL_RADIUS_TOKENS,
  VISUAL_SPACE_TOKENS,
  createVisualCssVariables,
  hexToPhaserColor,
  serializeVisualCssVariables,
} from "../../src/game/theme";

interface NodeFileSystem {
  readFileSync(path: string): Uint8Array;
  statSync(path: string): { readonly size: number };
}

interface NodeProcessRuntime {
  cwd(): string;
  getBuiltinModule(id: "fs"): NodeFileSystem;
}

function getNodeProcess(): NodeProcessRuntime {
  const runtime = globalThis as typeof globalThis & { process?: NodeProcessRuntime };
  if (!runtime.process?.getBuiltinModule) {
    throw new Error("The static-art integrity test requires Node 20.16 or newer.");
  }
  return runtime.process;
}

function readFourCc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

function readUint24LittleEndian(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] ?? 0)
    | ((bytes[offset + 1] ?? 0) << 8)
    | ((bytes[offset + 2] ?? 0) << 16);
}

function readWebpDimensions(bytes: Uint8Array): { width: number; height: number } {
  if (readFourCc(bytes, 0) !== "RIFF" || readFourCc(bytes, 8) !== "WEBP") {
    throw new Error("Expected a RIFF WebP image.");
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 12;
  while (offset + 8 <= bytes.length) {
    const chunkType = readFourCc(bytes, offset);
    const chunkLength = view.getUint32(offset + 4, true);
    const payload = offset + 8;

    if (chunkType === "VP8X" && chunkLength >= 10) {
      return {
        width: readUint24LittleEndian(bytes, payload + 4) + 1,
        height: readUint24LittleEndian(bytes, payload + 7) + 1,
      };
    }

    if (chunkType === "VP8 " && chunkLength >= 10) {
      if (
        bytes[payload + 3] !== 0x9d
        || bytes[payload + 4] !== 0x01
        || bytes[payload + 5] !== 0x2a
      ) {
        throw new Error("Invalid lossy WebP frame header.");
      }
      return {
        width: view.getUint16(payload + 6, true) & 0x3fff,
        height: view.getUint16(payload + 8, true) & 0x3fff,
      };
    }

    if (chunkType === "VP8L" && chunkLength >= 5) {
      if (bytes[payload] !== 0x2f) throw new Error("Invalid lossless WebP signature.");
      const first = bytes[payload + 1] ?? 0;
      const second = bytes[payload + 2] ?? 0;
      const third = bytes[payload + 3] ?? 0;
      const fourth = bytes[payload + 4] ?? 0;
      return {
        width: 1 + first + ((second & 0x3f) << 8),
        height: 1 + (second >> 6) + (third << 2) + ((fourth & 0x0f) << 10),
      };
    }

    offset = payload + chunkLength + (chunkLength % 2);
  }

  throw new Error("WebP image does not contain a supported dimensions chunk.");
}

function readPngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (!signature.every((value, index) => bytes[index] === value)) {
    throw new Error("Expected a PNG image.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    width: view.getUint32(16, false),
    height: view.getUint32(20, false),
  };
}

function readRasterDimensions(path: string, bytes: Uint8Array): { width: number; height: number } {
  if (path.endsWith(".webp")) return readWebpDimensions(bytes);
  if (path.endsWith(".png")) return readPngDimensions(bytes);
  throw new Error(`Unsupported static art format: ${path}`);
}

describe("static art manifest", () => {
  it("covers every production illustration with stable unique keys", () => {
    expect(STATIC_ART_MANIFEST).toHaveLength(57);
    expect(new Set(STATIC_ART_MANIFEST.map((asset) => asset.key)).size).toBe(57);
    expect(Object.keys(AREA_STATIC_ART_KEYS)).toHaveLength(5);
    expect(Object.values(AREA_STATIC_ART_KEYS)).toEqual(expect.arrayContaining([
      STATIC_ART_KEYS.waitingRoomBackground,
      STATIC_ART_KEYS.concourseBackground,
      STATIC_ART_KEYS.stationOfficeBackground,
      STATIC_ART_KEYS.footbridgeBackground,
      STATIC_ART_KEYS.rainPlatformNightBackground,
    ]));
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "background")).toHaveLength(7);
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "ui")).toHaveLength(2);
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "sprite")).toHaveLength(16);
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "item")).toHaveLength(6);
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "portrait")).toHaveLength(17);
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "memory")).toHaveLength(6);
    expect(STATIC_ART_MANIFEST.filter((asset) => asset.kind === "ending")).toHaveLength(3);
    expect(validateStaticArtManifest()).toEqual({
      valid: true,
      duplicateKeys: [],
      duplicatePaths: [],
      invalidKeys: [],
    });
  });

  it("covers content IDs and selects the platform illustration by story stage", () => {
    expect(Object.keys(ITEM_STATIC_ART_KEYS)).toHaveLength(6);
    expect(Object.keys(MEMORY_STATIC_ART_KEYS)).toHaveLength(6);
    expect(Object.keys(ENDING_STATIC_ART_KEYS)).toHaveLength(3);
    expect(Object.keys(OWNER_PORTRAIT_STATIC_ART_KEYS)).toHaveLength(7);
    expect(getAreaStaticArtKey("area_waiting_room", 6)).toBe(STATIC_ART_KEYS.waitingRoomBackground);
    expect(getAreaStaticArtKey("area_rain_platform", 4)).toBe(STATIC_ART_KEYS.rainPlatformNightBackground);
    expect(getAreaStaticArtKey("area_rain_platform", 5)).toBe(STATIC_ART_KEYS.rainPlatformLastTrainBackground);
    expect(getAreaStaticArtKey("area_rain_platform", 6)).toBe(STATIC_ART_KEYS.rainPlatformDawnBackground);
  });

  it("uses project-original licensing and an explicit fallback for every asset", () => {
    for (const asset of STATIC_ART_MANIFEST) {
      expect(asset.license).toMatchObject({
        id: "project-original",
        externalRights: false,
      });
      expect(asset.license.attribution).toContain("雨宿り駅の忘れもの");
      expect(asset.fallback.kind).toMatch(/^(procedural-area|procedural-character|procedural-item|css-title|css-final-choice|css-portrait|css-memory|css-ending)$/u);
      expect(getStaticArtAsset(asset.key)).toBe(asset);
    }
  });

  it("detects duplicate manifest entries", () => {
    const first = STATIC_ART_MANIFEST[0];
    if (!first) throw new Error("Static art manifest must not be empty.");
    const validation = validateStaticArtManifest([...STATIC_ART_MANIFEST, first]);
    expect(validation.valid).toBe(false);
    expect(validation.duplicateKeys).toEqual([first.key]);
    expect(validation.duplicatePaths).toEqual([first.path]);
  });

  it("maps every entry to an existing raster with the declared dimensions and budget", () => {
    const node = getNodeProcess();
    const fs = node.getBuiltinModule("fs");
    const root = node.cwd().replaceAll("\\", "/");
    let totalBytes = 0;

    for (const asset of STATIC_ART_MANIFEST) {
      const absolutePath = `${root}/public/${asset.path}`;
      const bytes = fs.readFileSync(absolutePath);
      const actualBytes = fs.statSync(absolutePath).size;
      totalBytes += actualBytes;

      expect(readRasterDimensions(asset.path, bytes), asset.key).toEqual(asset.dimensions);
      expect(actualBytes, asset.key).toBeLessThanOrEqual(asset.budgetBytes);
      expect(actualBytes, asset.key).toBeGreaterThan(0);
    }

    expect(totalBytes).toBeLessThanOrEqual(12_000_000);
  });
});

describe("Pages-safe static asset URLs", () => {
  const path = "assets/art-v3/backgrounds/waiting-room.webp";

  it("preserves a relative Vite base for project Pages hosting", () => {
    expect(resolvePublicAssetUrl(path, "./")).toBe(`./${path}`);
    expect(getStaticArtAssetUrl(STATIC_ART_KEYS.waitingRoomBackground, "./"))
      .toBe(`./${path}`);
  });

  it("supports root-relative, named Pages, and absolute deployment bases", () => {
    expect(resolvePublicAssetUrl(path, "/")).toBe(`/${path}`);
    expect(resolvePublicAssetUrl(path, "/rain-shelter-station/"))
      .toBe(`/rain-shelter-station/${path}`);
    expect(resolvePublicAssetUrl(path, "rain-shelter-station/"))
      .toBe(`rain-shelter-station/${path}`);
    expect(resolvePublicAssetUrl(path, "https://example.test/rain-shelter-station"))
      .toBe(`https://example.test/rain-shelter-station/${path}`);
  });

  it("rejects origin-root paths, traversal, query strings, and foreign URLs", () => {
    const unsafePaths = [
      "/assets/image.webp",
      "../image.webp",
      "assets/../image.webp",
      "assets/%2e%2e/image.webp",
      "assets/image.webp?variant=1",
      "assets/image.webp#crop",
      "https://example.test/image.webp",
      "assets\\image.webp",
    ];
    for (const unsafePath of unsafePaths) {
      expect(isSafePublicAssetPath(unsafePath), unsafePath).toBe(false);
      expect(() => resolvePublicAssetUrl(unsafePath, "./"), unsafePath).toThrow();
    }
  });
});

describe("static art runtime fallback status", () => {
  it("starts in a valid all-fallback state and updates immutably", () => {
    const initial = createStaticArtRuntimeState();
    const initialValidation = validateStaticArtRuntimeState(initial);
    expect(initialValidation.valid).toBe(true);
    expect(initialValidation.readyKeys).toEqual([]);
    expect(initialValidation.fallbackKeys).toHaveLength(STATIC_ART_MANIFEST.length);

    const key = STATIC_ART_KEYS.waitingRoomBackground;
    const loading = markStaticArtLoading(initial, key, "/rain-shelter-station/");
    const ready = markStaticArtReady(loading, key);

    expect(initial[key].phase).toBe("unrequested");
    expect(loading[key]).toEqual({
      key,
      phase: "loading",
      url: "/rain-shelter-station/assets/art-v3/backgrounds/waiting-room.webp",
    });
    expect(getStaticArtRenderDecision(ready, key)).toMatchObject({
      source: "static",
      key,
    });
  });

  it("returns the declared fallback after a load failure", () => {
    const key = STATIC_ART_KEYS.titleKeyVisual;
    const failed = markStaticArtFailed(
      createStaticArtRuntimeState(),
      key,
      "decode failed",
      "./",
    );
    expect(failed[key]).toMatchObject({
      phase: "failed",
      reason: "decode failed",
      url: "./assets/art-v3/ui/title-key-visual.webp",
    });
    expect(getStaticArtRenderDecision(failed, key)).toEqual({
      source: "fallback",
      key,
      fallback: { kind: "css-title" },
      reason: "failed",
    });
  });

  it("reports texture availability without depending on Phaser at test time", () => {
    const available = new Set<StaticArtAssetKey>([
      STATIC_ART_KEYS.waitingRoomBackground,
      STATIC_ART_KEYS.titleKeyVisual,
    ]);
    const report = inspectStaticArtAvailability((key) => available.has(key));
    expect(report.readyKeys).toEqual([...available]);
    expect(report.fallbackKeys).toHaveLength(STATIC_ART_MANIFEST.length - available.size);
  });

  it("detects missing and unknown runtime entries", () => {
    const state = createStaticArtRuntimeState();
    const { [STATIC_ART_KEYS.titleKeyVisual]: _omitted, ...missing } = state;
    void _omitted;
    const tampered = {
      ...missing,
      "art-v3.unknown": {
        key: "art-v3.unknown",
        phase: "ready",
        url: "./assets/unknown.webp",
      },
    } as unknown as StaticArtRuntimeState;
    const validation = validateStaticArtRuntimeState(tampered);
    expect(validation.valid).toBe(false);
    expect(validation.missingKeys).toEqual([STATIC_ART_KEYS.titleKeyVisual]);
    expect(validation.invalidKeys).toEqual(["art-v3.unknown"]);
  });
});

describe("shared visual tokens", () => {
  it("exports valid CSS colors and equivalent Phaser numeric colors", () => {
    for (const [name, color] of Object.entries(VISUAL_COLOR_TOKENS)) {
      expect(color, name).toMatch(/^#[\da-f]{6}$/iu);
      const phaserColor = PHASER_VISUAL_TOKENS.colors[
        name as keyof typeof PHASER_VISUAL_TOKENS.colors
      ];
      expect(phaserColor, name).toBe(hexToPhaserColor(color));
      expect(phaserColor, name).toBeGreaterThanOrEqual(0);
      expect(phaserColor, name).toBeLessThanOrEqual(0xffffff);
    }
  });

  it("serializes every shared token to deterministic CSS declarations", () => {
    const variables = createVisualCssVariables();
    const expectedCount = Object.keys(VISUAL_COLOR_TOKENS).length
      + Object.keys(VISUAL_SPACE_TOKENS).length
      + Object.keys(VISUAL_RADIUS_TOKENS).length
      + Object.keys(VISUAL_MOTION_TOKENS).length;
    expect(Object.keys(variables)).toHaveLength(expectedCount);
    expect(variables).toEqual(VISUAL_CSS_VARIABLES);
    expect(variables["--rain-station-color-focus"]).toBe(VISUAL_COLOR_TOKENS.focus);
    expect(variables["--rain-station-space-md"]).toBe("16px");
    expect(variables["--rain-station-motion-reduced-ms"]).toBe("1ms");

    const css = serializeVisualCssVariables(variables);
    expect(css).toContain("--rain-station-color-night-ink: #040a16;");
    expect(css).toContain("--rain-station-radius-pill: 999px;");
    expect(css).not.toContain("undefined");
    expect(css.split("\n")).toHaveLength(expectedCount);
  });

  it("freezes the exported token collections", () => {
    expect(Object.isFrozen(VISUAL_COLOR_TOKENS)).toBe(true);
    expect(Object.isFrozen(PHASER_VISUAL_TOKENS)).toBe(true);
    expect(Object.isFrozen(PHASER_VISUAL_TOKENS.colors)).toBe(true);
    expect(Object.isFrozen(VISUAL_CSS_VARIABLES)).toBe(true);
  });
});
