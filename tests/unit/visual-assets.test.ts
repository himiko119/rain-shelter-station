import { describe, expect, it } from "vitest";

import {
  AREA_DEFINITIONS,
  LOST_ITEM_DEFINITIONS,
} from "../../src/game/content";
import {
  REQUIRED_VISUAL_KEYS,
  VISUAL_MANIFEST,
  getVisualAsset,
  validateRequiredVisualKeys,
} from "../../src/game/assets/visualManifest";
import {
  SUPPORTED_ITEM_VISUAL_SHAPES,
  drawItemShape,
  isSupportedItemVisualShape,
} from "../../src/phaser/view/ItemVisual";

function createGraphicsSpy(): {
  readonly graphics: Parameters<typeof drawItemShape>[0];
  readonly drawCallCount: () => number;
} {
  let calls = 0;
  const proxy: object = new Proxy({}, {
    get: () => () => {
      calls += 1;
      return proxy;
    },
  });
  return {
    graphics: proxy as Parameters<typeof drawItemShape>[0],
    drawCallCount: () => calls,
  };
}

describe("visual asset manifest", () => {
  it("contains every required stable key exactly once", () => {
    const keys = VISUAL_MANIFEST.map((entry) => entry.key);
    const validation = validateRequiredVisualKeys();

    expect(validation).toEqual({
      valid: true,
      missingKeys: [],
      duplicateKeys: [],
    });
    expect(keys).toHaveLength(REQUIRED_VISUAL_KEYS.length);
    expect(new Set(keys).size).toBe(keys.length);
    for (const key of REQUIRED_VISUAL_KEYS) expect(getVisualAsset(key).key).toBe(key);
  });

  it("reports missing and duplicate required keys", () => {
    const first = VISUAL_MANIFEST[0];
    if (!first) throw new Error("The visual manifest must not be empty.");

    expect(validateRequiredVisualKeys(VISUAL_MANIFEST.slice(1))).toMatchObject({
      valid: false,
      missingKeys: [first.key],
      duplicateKeys: [],
    });
    expect(validateRequiredVisualKeys([...VISUAL_MANIFEST, first])).toMatchObject({
      valid: false,
      missingKeys: [],
      duplicateKeys: [first.key],
    });
  });

  it("covers five areas and Nagi plus the five lost-item owners", () => {
    const areaIds = VISUAL_MANIFEST
      .filter((entry) => entry.kind === "area")
      .map((entry) => entry.contentId);
    const characterIds = VISUAL_MANIFEST
      .filter((entry) => entry.kind === "character")
      .map((entry) => entry.contentId);
    const itemOwnerIds = [...new Set(
      LOST_ITEM_DEFINITIONS.map((item) => item.ownerId),
    )];

    expect(areaIds).toEqual(AREA_DEFINITIONS.map((area) => area.id));
    expect(characterIds).toHaveLength(6);
    expect(characterIds).toEqual(expect.arrayContaining(itemOwnerIds));
    expect(characterIds).toContain("owner_nagi");
    expect(characterIds).not.toContain("owner_station_attendant");
  });

  it("marks every entry as original procedural work", () => {
    for (const entry of VISUAL_MANIFEST) {
      expect(entry.procedural).toBe(true);
      expect(entry.source.length).toBeGreaterThan(0);
      expect(entry.license.id).toBe("original-procedural");
      expect(entry.license.externalRights).toBe(false);
    }
  });
});

describe("procedural item visuals", () => {
  it("supports all six content-owned item shapes", () => {
    const contentShapes = LOST_ITEM_DEFINITIONS.map((item) => item.visual.shape);
    const itemEntries = VISUAL_MANIFEST.filter((entry) => entry.kind === "item");

    expect(LOST_ITEM_DEFINITIONS).toHaveLength(6);
    expect(itemEntries).toHaveLength(6);
    expect(new Set(contentShapes).size).toBe(6);
    expect([...contentShapes].sort()).toEqual(
      [...SUPPORTED_ITEM_VISUAL_SHAPES].sort(),
    );
    for (const shape of contentShapes) {
      expect(isSupportedItemVisualShape(shape)).toBe(true);
    }
  });

  it("dispatches every content item to a concrete graphics renderer", () => {
    for (const item of LOST_ITEM_DEFINITIONS) {
      const spy = createGraphicsSpy();
      expect(() => drawItemShape(spy.graphics, item.visual)).not.toThrow();
      expect(spy.drawCallCount(), item.id).toBeGreaterThan(4);
    }
  });
});
