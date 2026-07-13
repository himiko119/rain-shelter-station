import { describe, expect, it } from "vitest";

import { getItem } from "../../src/game/content";
import {
  createInitialState,
  reduceGame,
  selectCurrentItemId,
} from "../../src/game/core";
import type { GameState } from "../../src/game/core";
import {
  LocalStorageSaveAdapter,
  clearSave,
  decodeSaveDocument,
  loadSave,
  migrateVersionZero,
  parseSave,
  parseSaveOrInitial,
  saveGameState,
  serializeSave,
} from "../../src/game/save";
import type { StorageLike } from "../../src/game/save";

class MemoryStorage implements StorageLike {
  private readonly values = new Map<string, string>();

  public getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  public setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  public removeItem(key: string): void {
    this.values.delete(key);
  }
}

function completedFirstReturn(): GameState {
  let state = createInitialState({ started: true });
  const itemId = selectCurrentItemId(state);
  if (itemId === null) {
    throw new Error("Expected the first story item.");
  }
  const item = getItem(itemId);
  const firstClueId = item.clueIds[0];
  const secondClueId = item.clueIds[1];
  state = reduceGame(state, {
    type: "acquire-item",
    itemId,
    clueId: firstClueId,
  });
  state = reduceGame(state, {
    type: "discover-clue",
    clueId: secondClueId,
  });
  state = reduceGame(state, {
    type: "return-correct",
    itemId,
    memoryId: item.memoryId,
  });
  state = reduceGame(state, {
    type: "complete-memory",
    memoryId: item.memoryId,
  });
  return reduceGame(state, {
    type: "update-settings",
    settings: { muted: true, textSpeed: "fast", reducedMotion: true },
  });
}

describe("save serialization and validation", () => {
  it("serializes and parses a progressed state without losing data", () => {
    const state = completedFirstReturn();
    const serialized = serializeSave(state);
    const parsed = parseSave(serialized);

    expect(parsed).toEqual(state);
    expect(parsed).not.toBe(state);
    expect(JSON.parse(serialized)).toEqual(state);
  });

  it("rejects corrupt JSON, unknown stable IDs, and future versions", () => {
    const state = completedFirstReturn();
    const document = JSON.parse(serializeSave(state)) as Record<string, unknown>;

    expect(parseSave("{not-json")).toBeNull();
    expect(parseSave("null")).toBeNull();
    expect(
      decodeSaveDocument({
        ...document,
        inventoryItemIds: ["item_from_the_future"],
      }),
    ).toBeNull();
    expect(
      decodeSaveDocument({
        ...document,
        areaId: "area_from_the_future",
      }),
    ).toBeNull();
    expect(
      decodeSaveDocument({
        ...document,
        saveVersion: 2,
      }),
    ).toBeNull();
    expect(
      decodeSaveDocument({
        version: 2,
        state: document,
      }),
    ).toBeNull();
  });

  it("refuses to serialize structurally impossible progress", () => {
    const invalid = {
      ...createInitialState({ started: true }),
      returnedItemIds: ["item_star_bento"],
    } as GameState;

    expect(() => serializeSave(invalid)).toThrow(TypeError);
  });

  it("returns the exact supplied fallback for an invalid document", () => {
    const fallback = createInitialState({
      settings: { muted: true },
      viewedEndingIds: ["ending_rain_shelter"],
    });

    expect(parseSaveOrInitial("bad-json", fallback)).toBe(fallback);
  });
});

describe("version zero migration", () => {
  it("migrates the wrapped v0 aliases and fills new fields with safe defaults", () => {
    const migrated = migrateVersionZero({
      version: 0,
      state: {
        revision: 7,
        started: true,
        areaId: "area_station_office",
        playerPosition: { x: 200, y: 300, facing: "left" },
        inventory: ["item_star_bento"],
        clues: ["clue_bento_lid_note"],
        returnedItems: ["item_red_umbrella"],
        viewedMemories: ["memory_red_umbrella"],
        endingHistory: [],
        settings: {
          muted: true,
          textSpeed: "fast",
        },
      },
    });

    expect(migrated).not.toBeNull();
    expect(migrated).toMatchObject({
      saveVersion: 1,
      revision: 7,
      started: true,
      areaId: "area_station_office",
      playerPosition: { x: 200, y: 300, facing: "left" },
      inventoryItemIds: ["item_star_bento"],
      foundClueIds: ["clue_bento_lid_note"],
      returnedItemIds: ["item_red_umbrella"],
      viewedMemoryIds: ["memory_red_umbrella"],
      pendingMemoryId: null,
      inspectedHotspotIds: [],
      settings: {
        muted: true,
        textSpeed: "fast",
        ambientVolume: 0.55,
        effectVolume: 0.7,
        showAllText: false,
        reducedMotion: false,
      },
    });
    expect(parseSave(JSON.stringify({
      version: 0,
      state: {
        started: true,
        inventory: [],
        returnedItems: [],
        viewedMemories: [],
      },
    }))).not.toBeNull();
  });

  it("rejects a v0 migration whose legacy progress contains unknown IDs", () => {
    expect(
      migrateVersionZero({
        saveVersion: 0,
        started: true,
        inventory: ["item_unknown"],
      }),
    ).toBeNull();
  });
});

describe("storage adapter", () => {
  it("round-trips, detects, and clears a save through StorageLike", () => {
    const storage = new MemoryStorage();
    const key = "unit-test-save";
    const state = completedFirstReturn();
    const adapter = new LocalStorageSaveAdapter(storage, { key });

    expect(adapter.hasSave()).toBe(false);
    expect(adapter.save(state)).toBe(true);
    expect(adapter.hasSave()).toBe(true);
    expect(adapter.load()).toEqual(state);
    expect(adapter.clear()).toBe(true);
    expect(adapter.hasSave()).toBe(false);
    expect(adapter.load()).toEqual(createInitialState());
  });

  it("supports the functional save/load/clear API", () => {
    const storage = new MemoryStorage();
    const state = completedFirstReturn();

    expect(saveGameState(storage, state)).toBe(true);
    expect(loadSave(storage, createInitialState())).toEqual(state);
    expect(clearSave(storage)).toBe(true);
    expect(loadSave(storage, createInitialState())).toEqual(
      createInitialState(),
    );
  });

  it("falls back safely for corrupt storage and catches storage failures", () => {
    const storage = new MemoryStorage();
    storage.setItem("corrupt", "{broken");
    const fallback = createInitialState({ settings: { muted: true } });
    const corruptAdapter = new LocalStorageSaveAdapter(storage, {
      key: "corrupt",
      fallback,
    });
    expect(corruptAdapter.hasSave()).toBe(false);
    expect(corruptAdapter.load()).toBe(fallback);

    const throwingStorage: StorageLike = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const adapter = new LocalStorageSaveAdapter(throwingStorage, { fallback });
    expect(adapter.load()).toBe(fallback);
    expect(adapter.hasSave()).toBe(false);
    expect(adapter.save(completedFirstReturn())).toBe(false);
    expect(adapter.clear()).toBe(false);
  });
});
