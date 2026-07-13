import {
  LOST_ITEM_DEFINITIONS,
  getItem,
} from "../content";
import type { AreaId, EndingId, GameState, ItemId } from "./types";

export type ProgressStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type StationClock = "00:00" | "00:18" | "00:47" | "01:35" | "02:31" | "03:56" | "04:58";
export type Weather = "heavy" | "steady" | "soft" | "clear";

export interface ObjectiveDetails {
  readonly id:
    | "start"
    | "watch-memory"
    | "find-item"
    | "find-clues"
    | "return-item"
    | "choose-ending"
    | "watch-ending";
  readonly text: string;
  readonly itemId: ItemId | null;
  readonly areaId: AreaId | null;
}

export type EndingAvailability = Readonly<Record<EndingId, boolean>>;

const CLOCK_BY_STAGE: readonly StationClock[] = [
  "00:00",
  "00:18",
  "00:47",
  "01:35",
  "02:31",
  "03:56",
  "04:58",
];

const STORY_ITEM_IDS: readonly ItemId[] = LOST_ITEM_DEFINITIONS.map(
  (definition) => definition.id,
);

function hasFirstFiveReturns(state: GameState): boolean {
  return STORY_ITEM_IDS.slice(0, 5).every((itemId) =>
    state.returnedItemIds.includes(itemId),
  );
}

export function selectStage(state: GameState): ProgressStage {
  const returned = new Set(state.returnedItemIds);
  let count = 0;
  for (const itemId of STORY_ITEM_IDS) {
    if (!returned.has(itemId)) {
      break;
    }
    count += 1;
  }

  return Math.min(6, count) as ProgressStage;
}

export const selectProgressStage = selectStage;

export function selectClock(state: GameState): StationClock {
  return CLOCK_BY_STAGE[selectStage(state)] ?? "00:00";
}

export const selectStationClock = selectClock;

export function selectUnlockedAreas(state: GameState): readonly AreaId[] {
  const stage = selectStage(state);
  const areas: AreaId[] = ["area_waiting_room", "area_concourse"];

  if (stage >= 1) {
    areas.push("area_station_office");
  }
  if (stage >= 2) {
    areas.push("area_footbridge");
  }
  if (stage >= 3) {
    areas.push("area_rain_platform");
  }

  return areas;
}

export const selectUnlockedAreaIds = selectUnlockedAreas;

export function selectCurrentItemId(state: GameState): ItemId | null {
  return (
    STORY_ITEM_IDS.find((itemId) => !state.returnedItemIds.includes(itemId)) ?? null
  );
}

export function selectCurrentItem(state: GameState) {
  const itemId = selectCurrentItemId(state);
  return itemId === null ? null : getItem(itemId);
}

export function selectWeather(state: GameState): Weather {
  const stage = selectStage(state);
  if (stage >= 6) {
    return "clear";
  }
  if (stage >= 4) {
    return "soft";
  }
  if (stage >= 2) {
    return "steady";
  }
  return "heavy";
}

export function selectEndingAvailability(state: GameState): EndingAvailability {
  const firstFiveReturned = hasFirstFiveReturns(state);
  const memoryComplete = state.pendingMemoryId === null;
  const finalItemId = STORY_ITEM_IDS[5];
  const finalItemReturned =
    finalItemId !== undefined && state.returnedItemIds.includes(finalItemId);
  const allMemoriesViewed = LOST_ITEM_DEFINITIONS.every((definition) =>
    state.viewedMemoryIds.includes(definition.memoryId),
  );

  return {
    ending_last_train: memoryComplete && firstFiveReturned && !finalItemReturned,
    ending_first_train: memoryComplete && finalItemReturned && allMemoriesViewed,
    ending_rain_shelter: memoryComplete && firstFiveReturned,
  };
}

export function selectAvailableEndingIds(state: GameState): readonly EndingId[] {
  const availability = selectEndingAvailability(state);
  return (
    ["ending_last_train", "ending_first_train", "ending_rain_shelter"] as const
  ).filter((endingId) => availability[endingId]);
}

export function selectCanViewEnding(state: GameState, endingId: EndingId): boolean {
  return selectEndingAvailability(state)[endingId];
}

export function selectObjectiveDetails(state: GameState): ObjectiveDetails {
  if (!state.started) {
    return {
      id: "start",
      text: "はじめから物語を始める",
      itemId: null,
      areaId: null,
    };
  }

  if (state.activeEndingId !== null) {
    return {
      id: "watch-ending",
      text: "選んだ結末を見届ける",
      itemId: null,
      areaId: null,
    };
  }

  if (state.pendingMemoryId !== null) {
    return {
      id: "watch-memory",
      text: "よみがえった記憶を見届ける",
      itemId: null,
      areaId: null,
    };
  }

  const item = selectCurrentItem(state);
  if (item === null) {
    return {
      id: "choose-ending",
      text: "始発を待つか、この駅に残るかを選ぶ",
      itemId: null,
      areaId: "area_rain_platform",
    };
  }

  if (!state.inventoryItemIds.includes(item.id)) {
    return {
      id: "find-item",
      text: `『${item.name}』を探す`,
      itemId: item.id,
      areaId: item.spawn.areaId,
    };
  }

  const foundClueCount = item.clueIds.filter((clueId) =>
    state.foundClueIds.includes(clueId),
  ).length;
  if (foundClueCount < item.clueIds.length) {
    return {
      id: "find-clues",
      text: `『${item.name}』の手がかりを集める`,
      itemId: item.id,
      areaId: null,
    };
  }

  return {
    id: "return-item",
    text: `手がかりを照合し、『${item.name}』を持ち主へ返す`,
    itemId: item.id,
    areaId: null,
  };
}

export function selectObjective(state: GameState): string {
  return selectObjectiveDetails(state).text;
}
