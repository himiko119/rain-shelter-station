import { describe, expect, it } from "vitest";

import { LOST_ITEM_DEFINITIONS, getItem } from "../../src/game/content";
import {
  createGameStore,
  createInitialState,
  reduceGame,
  selectAvailableEndingIds,
  selectClock,
  selectCurrentItemId,
  selectEndingAvailability,
  selectStage,
  selectUnlockedAreas,
  selectWeather,
} from "../../src/game/core";
import type { EndingId, GameState } from "../../src/game/core";

const CLOCKS = [
  "00:00",
  "00:18",
  "00:47",
  "01:35",
  "02:31",
  "03:56",
  "04:58",
] as const;

const UNLOCKED_AREAS_BY_STAGE = [
  ["area_waiting_room", "area_concourse"],
  ["area_waiting_room", "area_concourse", "area_station_office"],
  [
    "area_waiting_room",
    "area_concourse",
    "area_station_office",
    "area_footbridge",
  ],
  [
    "area_waiting_room",
    "area_concourse",
    "area_station_office",
    "area_footbridge",
    "area_rain_platform",
  ],
] as const;

const WEATHER_BY_STAGE = [
  "heavy",
  "heavy",
  "steady",
  "steady",
  "soft",
  "soft",
  "clear",
] as const;

function acquireCurrentItem(state: GameState): GameState {
  const itemId = selectCurrentItemId(state);
  if (itemId === null) {
    throw new Error("Expected another story item.");
  }
  const item = getItem(itemId);
  const firstClueId = item.clueIds[0];
  if (firstClueId === undefined) {
    throw new Error(`Expected at least one clue for ${itemId}.`);
  }

  let next = reduceGame(state, {
    type: "acquire-item",
    itemId,
    clueId: firstClueId,
  });
  for (const clueId of item.clueIds.slice(1)) {
    next = reduceGame(next, { type: "discover-clue", clueId });
  }
  return next;
}

function returnCurrentItem(
  state: GameState,
  completeMemory = true,
): GameState {
  const acquired = acquireCurrentItem(state);
  const itemId = selectCurrentItemId(acquired);
  if (itemId === null) {
    throw new Error("Expected an acquired current item.");
  }
  const memoryId = getItem(itemId).memoryId;
  const returned = reduceGame(acquired, {
    type: "return-correct",
    itemId,
    memoryId,
  });
  return completeMemory
    ? reduceGame(returned, { type: "complete-memory", memoryId })
    : returned;
}

function progressToReturnedCount(
  count: number,
  completeLastMemory = true,
): GameState {
  let state = createInitialState({ started: true });
  for (let index = 0; index < count; index += 1) {
    state = returnCurrentItem(
      state,
      completeLastMemory || index < count - 1,
    );
  }
  return state;
}

describe("game state transitions", () => {
  it("creates a deterministic, serializable initial state", () => {
    const state = createInitialState();

    expect(state).toMatchObject({
      saveVersion: 1,
      revision: 0,
      started: false,
      areaId: "area_waiting_room",
      playerPosition: { x: 320, y: 360, facing: "down" },
      inventoryItemIds: [],
      foundClueIds: [],
      inspectedHotspotIds: [],
      returnedItemIds: [],
      viewedMemoryIds: [],
      pendingMemoryId: null,
      hintTierByItem: {},
      wrongAttemptsByItem: {},
      nonProgressInteractions: 0,
      sameHotspotInspections: {},
      elapsedSinceProgressMs: 0,
      activeEndingId: null,
      viewedEndingIds: [],
      settings: {
        ambientVolume: 0.55,
        effectVolume: 0.7,
        muted: false,
        textSpeed: "normal",
        showAllText: false,
        reducedMotion: false,
      },
    });
    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
    expect(selectStage(state)).toBe(0);
    expect(selectClock(state)).toBe("00:00");
    expect(selectCurrentItemId(state)).toBe("item_red_umbrella");
  });

  it("only acquires the current item and its clues, in story order", () => {
    const initial = createInitialState({ started: true });

    const futureItem = reduceGame(initial, {
      type: "acquire-item",
      itemId: "item_star_bento",
      clueId: "clue_bento_lid_note",
    });
    const futureClue = reduceGame(initial, {
      type: "discover-clue",
      clueId: "clue_bento_navy_wrap",
    });
    expect(futureItem).toBe(initial);
    expect(futureClue).toBe(initial);

    const withUmbrella = reduceGame(initial, {
      type: "acquire-item",
      itemId: "item_red_umbrella",
      clueId: "clue_umbrella_star_patch",
    });
    expect(withUmbrella.inventoryItemIds).toEqual(["item_red_umbrella"]);
    expect(withUmbrella.foundClueIds).toEqual(["clue_umbrella_star_patch"]);

    const withBothClues = reduceGame(withUmbrella, {
      type: "discover-clue",
      clueId: "clue_umbrella_footprints",
    });
    expect(withBothClues.foundClueIds).toEqual([
      "clue_umbrella_star_patch",
      "clue_umbrella_footprints",
    ]);

    const umbrella = getItem("item_red_umbrella");
    let next = reduceGame(withBothClues, {
      type: "return-correct",
      itemId: umbrella.id,
      memoryId: umbrella.memoryId,
    });
    next = reduceGame(next, {
      type: "complete-memory",
      memoryId: umbrella.memoryId,
    });
    next = reduceGame(next, {
      type: "acquire-item",
      itemId: "item_star_bento",
      clueId: "clue_bento_lid_note",
    });

    expect(next.inventoryItemIds).toEqual(["item_star_bento"]);
    expect(next.foundClueIds).toContain("clue_bento_lid_note");
    expect(selectCurrentItemId(next)).toBe("item_star_bento");
  });

  it("makes duplicate acquisition, clue, and memory completion idempotent", () => {
    const initial = createInitialState({ started: true });
    const acquired = reduceGame(initial, {
      type: "acquire-item",
      itemId: "item_red_umbrella",
      clueId: "clue_umbrella_star_patch",
    });
    const duplicateItem = reduceGame(acquired, {
      type: "acquire-item",
      itemId: "item_red_umbrella",
      clueId: "clue_umbrella_star_patch",
    });
    const duplicateClue = reduceGame(acquired, {
      type: "discover-clue",
      clueId: "clue_umbrella_star_patch",
    });

    expect(duplicateItem).toBe(acquired);
    expect(duplicateClue).toBe(acquired);

    const returned = reduceGame(acquired, {
      type: "return-correct",
      itemId: "item_red_umbrella",
      memoryId: "memory_red_umbrella",
    });
    const completed = reduceGame(returned, {
      type: "complete-memory",
      memoryId: "memory_red_umbrella",
    });
    const duplicateCompletion = reduceGame(completed, {
      type: "complete-memory",
      memoryId: "memory_red_umbrella",
    });

    expect(duplicateCompletion).toBe(completed);
    expect(completed.viewedMemoryIds).toEqual(["memory_red_umbrella"]);
  });

  it("retains a wrongly returned item, raises its hint, then completes a correct return", () => {
    const store = createGameStore(createInitialState({ started: true }));
    store.dispatch({
      type: "acquire-item",
      itemId: "item_red_umbrella",
      clueId: "clue_umbrella_star_patch",
    });

    const firstWrong = store.tryReturn(
      "item_red_umbrella",
      "owner_station_attendant",
    );
    expect(firstWrong).toMatchObject({
      correct: false,
      itemId: "item_red_umbrella",
      ownerId: "owner_station_attendant",
      memoryId: null,
    });
    expect(store.getState().inventoryItemIds).toEqual(["item_red_umbrella"]);
    expect(store.getState().returnedItemIds).toEqual([]);
    expect(store.getState().wrongAttemptsByItem.item_red_umbrella).toBe(1);
    expect(store.getState().hintTierByItem.item_red_umbrella).toBe(1);

    const secondWrong = store.tryReturn(
      "item_red_umbrella",
      "owner_navy_bag_commuter",
    );
    expect(secondWrong.dialogId).not.toBe(firstWrong.dialogId);
    expect(store.getState().wrongAttemptsByItem.item_red_umbrella).toBe(2);
    expect(store.getState().hintTierByItem.item_red_umbrella).toBe(2);

    const correct = store.tryReturn(
      "item_red_umbrella",
      "owner_red_boots_child",
    );
    expect(correct).toMatchObject({
      correct: true,
      memoryId: "memory_red_umbrella",
    });
    expect(store.getState().inventoryItemIds).toEqual([]);
    expect(store.getState().returnedItemIds).toEqual(["item_red_umbrella"]);
    expect(store.getState().pendingMemoryId).toBe("memory_red_umbrella");

    store.dispatch({
      type: "complete-memory",
      memoryId: "memory_red_umbrella",
    });
    expect(store.getState().pendingMemoryId).toBeNull();
    expect(store.getState().viewedMemoryIds).toEqual(["memory_red_umbrella"]);
  });

  it("exposes every area, station clock, weather, and current item stage", () => {
    let state = createInitialState({ started: true });

    for (let stage = 0; stage <= LOST_ITEM_DEFINITIONS.length; stage += 1) {
      expect(selectStage(state)).toBe(stage);
      expect(selectClock(state)).toBe(CLOCKS[stage]);
      expect(selectWeather(state)).toBe(WEATHER_BY_STAGE[stage]);
      expect(selectCurrentItemId(state)).toBe(
        LOST_ITEM_DEFINITIONS[stage]?.id ?? null,
      );
      expect(selectUnlockedAreas(state)).toEqual(
        UNLOCKED_AREAS_BY_STAGE[Math.min(stage, 3)],
      );

      if (stage < LOST_ITEM_DEFINITIONS.length) {
        state = returnCurrentItem(state);
      }
    }
  });

  it("unlocks and caps time- and reinspection-based hint tiers", () => {
    let timed = createInitialState({ started: true });
    timed = reduceGame(timed, {
      type: "advance-hint-time",
      elapsedMs: 89_999,
    });
    expect(timed.hintTierByItem.item_red_umbrella ?? 0).toBe(0);
    expect(timed.elapsedSinceProgressMs).toBe(89_999);

    timed = reduceGame(timed, { type: "advance-hint-time", elapsedMs: 1 });
    expect(timed.hintTierByItem.item_red_umbrella).toBe(1);
    expect(timed.elapsedSinceProgressMs).toBe(0);

    timed = reduceGame(timed, {
      type: "advance-hint-time",
      elapsedMs: 180_001,
    });
    expect(timed.hintTierByItem.item_red_umbrella).toBe(3);
    expect(timed.elapsedSinceProgressMs).toBe(1);
    timed = reduceGame(timed, {
      type: "advance-hint-time",
      elapsedMs: 900_000,
    });
    expect(timed.hintTierByItem.item_red_umbrella).toBe(3);

    let inspected = createInitialState({ started: true });
    for (let count = 0; count < 3; count += 1) {
      inspected = reduceGame(inspected, {
        type: "inspect",
        hotspotId: "same-bench",
        madeProgress: false,
      });
    }
    expect(inspected.hintTierByItem.item_red_umbrella).toBe(1);
    expect(inspected.sameHotspotInspections["same-bench"]).toBe(3);

    inspected = reduceGame(inspected, {
      type: "inspect",
      hotspotId: "progress-hotspot",
      madeProgress: true,
    });
    expect(inspected.nonProgressInteractions).toBe(0);
    expect(inspected.sameHotspotInspections).toEqual({});
    for (let count = 0; count < 6; count += 1) {
      inspected = reduceGame(inspected, {
        type: "inspect",
        hotspotId: `different-${count}`,
        madeProgress: false,
      });
    }
    expect(inspected.hintTierByItem.item_red_umbrella).toBe(2);

    for (let count = 0; count < 3; count += 1) {
      inspected = reduceGame(inspected, {
        type: "inspect",
        hotspotId: "last-repeat",
        madeProgress: false,
      });
    }
    expect(inspected.hintTierByItem.item_red_umbrella).toBe(3);
    expect(inspected.inspectedHotspotIds).toHaveLength(9);
  });
});

describe("ending boundaries", () => {
  it("keeps every ending locked before five completed returns", () => {
    const state = progressToReturnedCount(4);

    expect(selectAvailableEndingIds(state)).toEqual([]);
    expect(selectEndingAvailability(state)).toEqual({
      ending_last_train: false,
      ending_first_train: false,
      ending_rain_shelter: false,
    });
  });

  it("blocks endings while the fifth memory is pending, then unlocks A and C", () => {
    const pending = progressToReturnedCount(5, false);
    expect(pending.pendingMemoryId).toBe("memory_faded_photo");
    expect(selectAvailableEndingIds(pending)).toEqual([]);
    expect(
      reduceGame(pending, {
        type: "record-ending",
        endingId: "ending_last_train",
      }),
    ).toBe(pending);

    const completed = reduceGame(pending, {
      type: "complete-memory",
      memoryId: "memory_faded_photo",
    });
    expect(selectEndingAvailability(completed)).toEqual({
      ending_last_train: true,
      ending_first_train: false,
      ending_rain_shelter: true,
    });
    expect(selectAvailableEndingIds(completed)).toEqual([
      "ending_last_train",
      "ending_rain_shelter",
    ]);

    const endingA = reduceGame(completed, {
      type: "record-ending",
      endingId: "ending_last_train",
    });
    expect(endingA.activeEndingId).toBe("ending_last_train");
    const cleared = reduceGame(endingA, { type: "clear-active-ending" });
    const endingC = reduceGame(cleared, {
      type: "record-ending",
      endingId: "ending_rain_shelter",
    });
    expect(endingC.activeEndingId).toBe("ending_rain_shelter");
    expect(endingC.viewedEndingIds).toEqual([
      "ending_last_train",
      "ending_rain_shelter",
    ]);
  });

  it("blocks endings while the sixth memory is pending, then unlocks B and C", () => {
    const pending = progressToReturnedCount(6, false);
    expect(pending.pendingMemoryId).toBe("memory_blank_ticket");
    expect(selectAvailableEndingIds(pending)).toEqual([]);

    const completed = reduceGame(pending, {
      type: "complete-memory",
      memoryId: "memory_blank_ticket",
    });
    expect(selectEndingAvailability(completed)).toEqual({
      ending_last_train: false,
      ending_first_train: true,
      ending_rain_shelter: true,
    });
    expect(selectAvailableEndingIds(completed)).toEqual([
      "ending_first_train",
      "ending_rain_shelter",
    ]);

    const endingB = reduceGame(completed, {
      type: "record-ending",
      endingId: "ending_first_train",
    });
    expect(endingB.activeEndingId).toBe("ending_first_train");
    expect(endingB.viewedEndingIds).toContain("ending_first_train");
  });
});

describe("run reset", () => {
  it("clears run progress while preserving settings and ending records", () => {
    let state = progressToReturnedCount(5);
    state = reduceGame(state, {
      type: "record-ending",
      endingId: "ending_last_train",
    });
    state = reduceGame(state, {
      type: "update-settings",
      settings: {
        muted: true,
        ambientVolume: 0.2,
        textSpeed: "instant",
        reducedMotion: true,
      },
    });

    const revisionBeforeReset = state.revision;
    const reset = reduceGame(state, { type: "reset-run" });

    expect(reset).toEqual(
      createInitialState({
        revision: revisionBeforeReset + 1,
        settings: state.settings,
        viewedEndingIds: ["ending_last_train"],
      }),
    );
    expect(reset.started).toBe(false);
    expect(reset.activeEndingId).toBeNull();

    const restarted = reduceGame(reset, { type: "start-new-game" });
    expect(restarted.started).toBe(true);
    expect(restarted.settings).toEqual(reset.settings);
    expect(restarted.viewedEndingIds).toEqual(["ending_last_train"]);
    expect(restarted.returnedItemIds).toEqual([]);
  });

  it("clamps settings and removes duplicate or unknown ending history at initialization", () => {
    const state = createInitialState({
      settings: {
        ambientVolume: -10,
        effectVolume: 10,
        textSpeed: "fast",
      },
      viewedEndingIds: [
        "ending_first_train",
        "ending_first_train",
        "unknown-ending" as EndingId,
      ],
    });

    expect(state.settings.ambientVolume).toBe(0);
    expect(state.settings.effectVolume).toBe(1);
    expect(state.settings.textSpeed).toBe("fast");
    expect(state.viewedEndingIds).toEqual(["ending_first_train"]);
  });
});
