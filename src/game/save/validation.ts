import { createInitialState } from "../core/initial-state";
import type {
  AreaId,
  ClueId,
  EndingId,
  Facing,
  GameSettings,
  GameState,
  HintTier,
  ItemId,
  MemoryId,
  TextSpeed,
} from "../core/types";

export const CURRENT_SAVE_VERSION = 1 as const;

const AREA_IDS: ReadonlySet<AreaId> = new Set([
  "area_waiting_room",
  "area_concourse",
  "area_station_office",
  "area_footbridge",
  "area_rain_platform",
]);
const ITEM_IDS: ReadonlySet<ItemId> = new Set([
  "item_red_umbrella",
  "item_star_bento",
  "item_cassette_player",
  "item_silver_hairclip",
  "item_faded_photo_sticker",
  "item_blank_ticket",
]);
const CLUE_IDS: ReadonlySet<ClueId> = new Set([
  "clue_umbrella_footprints",
  "clue_umbrella_star_patch",
  "clue_bento_lid_note",
  "clue_bento_navy_wrap",
  "clue_cassette_four_beats",
  "clue_cassette_blue_thread",
  "clue_hairclip_engraving",
  "clue_hairclip_bookmark_tag",
  "clue_photo_crescent_pin",
  "clue_photo_booth_code",
  "clue_ticket_pocket_fragment",
  "clue_ticket_reflection",
]);
const MEMORY_IDS: ReadonlySet<MemoryId> = new Set([
  "memory_red_umbrella",
  "memory_star_bento",
  "memory_cassette_player",
  "memory_silver_hairclip",
  "memory_faded_photo",
  "memory_blank_ticket",
]);
const ENDING_IDS: ReadonlySet<EndingId> = new Set([
  "ending_last_train",
  "ending_first_train",
  "ending_rain_shelter",
]);
const FACING_VALUES: ReadonlySet<Facing> = new Set([
  "up",
  "down",
  "left",
  "right",
]);
const TEXT_SPEED_VALUES: ReadonlySet<TextSpeed> = new Set([
  "slow",
  "normal",
  "fast",
  "instant",
]);

const ITEM_BY_MEMORY: Readonly<Record<MemoryId, ItemId>> = {
  memory_red_umbrella: "item_red_umbrella",
  memory_star_bento: "item_star_bento",
  memory_cassette_player: "item_cassette_player",
  memory_silver_hairclip: "item_silver_hairclip",
  memory_faded_photo: "item_faded_photo_sticker",
  memory_blank_ticket: "item_blank_ticket",
};
const MEMORY_BY_ITEM: Readonly<Record<ItemId, MemoryId>> = {
  item_red_umbrella: "memory_red_umbrella",
  item_star_bento: "memory_star_bento",
  item_cassette_player: "memory_cassette_player",
  item_silver_hairclip: "memory_silver_hairclip",
  item_faded_photo_sticker: "memory_faded_photo",
  item_blank_ticket: "memory_blank_ticket",
};
const STORY_ITEM_IDS: readonly ItemId[] = [
  "item_red_umbrella",
  "item_star_bento",
  "item_cassette_player",
  "item_silver_hairclip",
  "item_faded_photo_sticker",
  "item_blank_ticket",
];
const STORY_MEMORY_IDS: readonly MemoryId[] = STORY_ITEM_IDS.map(
  (itemId) => MEMORY_BY_ITEM[itemId],
);
const AREA_UNLOCK_STAGE: Readonly<Record<AreaId, number>> = {
  area_waiting_room: 0,
  area_concourse: 0,
  area_station_office: 1,
  area_footbridge: 2,
  area_rain_platform: 3,
};

const MAX_DYNAMIC_ENTRIES = 512;
const MAX_STRING_LENGTH = 256;

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeCounter(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isEndingAvailable(
  endingId: EndingId,
  returnedCount: number,
  viewedMemoryCount: number,
): boolean {
  switch (endingId) {
    case "ending_last_train":
      return returnedCount === 5 && viewedMemoryCount === 5;
    case "ending_first_train":
      return returnedCount === 6 && viewedMemoryCount === 6;
    case "ending_rain_shelter":
      return returnedCount >= 5 && viewedMemoryCount === returnedCount;
  }
}

function isSafeKey(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= MAX_STRING_LENGTH &&
    value !== "__proto__" &&
    value !== "constructor" &&
    value !== "prototype"
  );
}

function decodeIdArray<T extends string>(
  value: unknown,
  knownValues: ReadonlySet<T>,
  maxLength = knownValues.size,
): readonly T[] | null {
  if (!Array.isArray(value) || value.length > maxLength) {
    return null;
  }

  const result: T[] = [];
  const seen = new Set<T>();
  for (const entry of value) {
    if (
      typeof entry !== "string" ||
      !knownValues.has(entry as T) ||
      seen.has(entry as T)
    ) {
      return null;
    }
    const id = entry as T;
    seen.add(id);
    result.push(id);
  }
  return result;
}

function decodeHotspotIds(value: unknown): readonly string[] | null {
  if (!Array.isArray(value) || value.length > MAX_DYNAMIC_ENTRIES) {
    return null;
  }

  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value) {
    if (typeof entry !== "string" || !isSafeKey(entry) || seen.has(entry)) {
      return null;
    }
    seen.add(entry);
    result.push(entry);
  }
  return result;
}

function decodeHintTiers(
  value: unknown,
): Readonly<Partial<Record<ItemId, HintTier>>> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  if (entries.length > ITEM_IDS.size) {
    return null;
  }

  const result: Partial<Record<ItemId, HintTier>> = {};
  for (const [key, tier] of entries) {
    if (
      !ITEM_IDS.has(key as ItemId) ||
      typeof tier !== "number" ||
      !Number.isInteger(tier) ||
      tier < 0 ||
      tier > 3
    ) {
      return null;
    }
    result[key as ItemId] = tier as HintTier;
  }
  return result;
}

function decodeItemCounters(
  value: unknown,
): Readonly<Partial<Record<ItemId, number>>> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  if (entries.length > ITEM_IDS.size) {
    return null;
  }

  const result: Partial<Record<ItemId, number>> = {};
  for (const [key, count] of entries) {
    if (!ITEM_IDS.has(key as ItemId) || !isSafeCounter(count)) {
      return null;
    }
    result[key as ItemId] = count;
  }
  return result;
}

function decodeHotspotCounters(value: unknown): Readonly<Record<string, number>> | null {
  if (!isRecord(value)) {
    return null;
  }
  const entries = Object.entries(value);
  if (entries.length > MAX_DYNAMIC_ENTRIES) {
    return null;
  }

  const result: Record<string, number> = {};
  for (const [key, count] of entries) {
    if (!isSafeKey(key) || !isSafeCounter(count)) {
      return null;
    }
    result[key] = count;
  }
  return result;
}

function decodeSettings(value: unknown): GameSettings | null {
  if (!isRecord(value)) {
    return null;
  }
  const {
    ambientVolume,
    effectVolume,
    muted,
    textSpeed,
    showAllText,
    reducedMotion,
  } = value;
  if (
    typeof ambientVolume !== "number" ||
    !Number.isFinite(ambientVolume) ||
    ambientVolume < 0 ||
    ambientVolume > 1 ||
    typeof effectVolume !== "number" ||
    !Number.isFinite(effectVolume) ||
    effectVolume < 0 ||
    effectVolume > 1 ||
    typeof muted !== "boolean" ||
    typeof textSpeed !== "string" ||
    !TEXT_SPEED_VALUES.has(textSpeed as TextSpeed) ||
    typeof showAllText !== "boolean" ||
    typeof reducedMotion !== "boolean"
  ) {
    return null;
  }

  return {
    ambientVolume,
    effectVolume,
    muted,
    textSpeed: textSpeed as TextSpeed,
    showAllText,
    reducedMotion,
  };
}

function decodeVersionOne(value: unknown): GameState | null {
  if (!isRecord(value) || value.saveVersion !== CURRENT_SAVE_VERSION) {
    return null;
  }

  const playerPosition = value.playerPosition;
  if (
    !isRecord(playerPosition) ||
    !isFiniteCoordinate(playerPosition.x) ||
    !isFiniteCoordinate(playerPosition.y) ||
    playerPosition.x < 0 ||
    playerPosition.x > 1_120 ||
    playerPosition.y < 0 ||
    playerPosition.y > 630 ||
    typeof playerPosition.facing !== "string" ||
    !FACING_VALUES.has(playerPosition.facing as Facing)
  ) {
    return null;
  }

  const inventoryItemIds = decodeIdArray(value.inventoryItemIds, ITEM_IDS);
  const foundClueIds = decodeIdArray(value.foundClueIds, CLUE_IDS);
  const inspectedHotspotIds = decodeHotspotIds(value.inspectedHotspotIds);
  const returnedItemIds = decodeIdArray(value.returnedItemIds, ITEM_IDS);
  const viewedMemoryIds = decodeIdArray(value.viewedMemoryIds, MEMORY_IDS);
  const hintTierByItem = decodeHintTiers(value.hintTierByItem);
  const wrongAttemptsByItem = decodeItemCounters(value.wrongAttemptsByItem);
  const sameHotspotInspections = decodeHotspotCounters(
    value.sameHotspotInspections,
  );
  const viewedEndingIds = decodeIdArray(value.viewedEndingIds, ENDING_IDS);
  const settings = decodeSettings(value.settings);
  if (
    inventoryItemIds === null ||
    foundClueIds === null ||
    inspectedHotspotIds === null ||
    returnedItemIds === null ||
    viewedMemoryIds === null ||
    hintTierByItem === null ||
    wrongAttemptsByItem === null ||
    sameHotspotInspections === null ||
    viewedEndingIds === null ||
    settings === null
  ) {
    return null;
  }

  if (
    !isSafeCounter(value.revision) ||
    typeof value.started !== "boolean" ||
    typeof value.areaId !== "string" ||
    !AREA_IDS.has(value.areaId as AreaId) ||
    !isSafeCounter(value.nonProgressInteractions) ||
    typeof value.elapsedSinceProgressMs !== "number" ||
    !Number.isFinite(value.elapsedSinceProgressMs) ||
    value.elapsedSinceProgressMs < 0 ||
    value.elapsedSinceProgressMs > Number.MAX_SAFE_INTEGER ||
    typeof value.introSeen !== "boolean" ||
    typeof value.controlsSeen !== "boolean"
  ) {
    return null;
  }

  const pendingMemoryId = value.pendingMemoryId;
  if (
    pendingMemoryId !== null &&
    (typeof pendingMemoryId !== "string" ||
      !MEMORY_IDS.has(pendingMemoryId as MemoryId))
  ) {
    return null;
  }
  const activeEndingId = value.activeEndingId;
  if (
    activeEndingId !== null &&
    (typeof activeEndingId !== "string" ||
      !ENDING_IDS.has(activeEndingId as EndingId))
  ) {
    return null;
  }

  if (
    inventoryItemIds.some((itemId) => returnedItemIds.includes(itemId)) ||
    (pendingMemoryId !== null &&
      (!returnedItemIds.includes(ITEM_BY_MEMORY[pendingMemoryId as MemoryId]) ||
        viewedMemoryIds.includes(pendingMemoryId as MemoryId))) ||
    (activeEndingId !== null &&
      !viewedEndingIds.includes(activeEndingId as EndingId))
  ) {
    return null;
  }


  const returnedInStoryOrder = returnedItemIds.every(
    (itemId, index) => STORY_ITEM_IDS[index] === itemId,
  );
  const viewedInStoryOrder = viewedMemoryIds.every(
    (memoryId, index) => STORY_MEMORY_IDS[index] === memoryId,
  );
  const currentItemId = STORY_ITEM_IDS[returnedItemIds.length];
  const inventoryIsCurrentItem =
    inventoryItemIds.length === 0 ||
    (inventoryItemIds.length === 1 && inventoryItemIds[0] === currentItemId);
  const expectedPendingMemoryId =
    returnedItemIds.length > 0
      ? STORY_MEMORY_IDS[returnedItemIds.length - 1]
      : undefined;
  const memoryProgressIsConsistent =
    pendingMemoryId === null
      ? viewedMemoryIds.length === returnedItemIds.length
      : viewedMemoryIds.length === returnedItemIds.length - 1 &&
        pendingMemoryId === expectedPendingMemoryId;
  const areaIsUnlocked =
    AREA_UNLOCK_STAGE[value.areaId as AreaId] <= returnedItemIds.length;
  const activeEndingIsAvailable =
    activeEndingId === null ||
    (pendingMemoryId === null &&
      isEndingAvailable(
        activeEndingId as EndingId,
        returnedItemIds.length,
        viewedMemoryIds.length,
      ));
  const stoppedRunIsEmpty =
    value.started ||
    (inventoryItemIds.length === 0 &&
      foundClueIds.length === 0 &&
      returnedItemIds.length === 0 &&
      viewedMemoryIds.length === 0 &&
      pendingMemoryId === null &&
      activeEndingId === null);
  if (
    !returnedInStoryOrder ||
    !viewedInStoryOrder ||
    !inventoryIsCurrentItem ||
    !memoryProgressIsConsistent ||
    !areaIsUnlocked ||
    !activeEndingIsAvailable ||
    !stoppedRunIsEmpty ||
    (pendingMemoryId !== null && activeEndingId !== null)
  ) {
    return null;
  }

  return {
    saveVersion: CURRENT_SAVE_VERSION,
    revision: value.revision,
    started: value.started,
    areaId: value.areaId as AreaId,
    playerPosition: {
      x: playerPosition.x,
      y: playerPosition.y,
      facing: playerPosition.facing as Facing,
    },
    inventoryItemIds,
    foundClueIds,
    inspectedHotspotIds,
    returnedItemIds,
    viewedMemoryIds,
    pendingMemoryId: pendingMemoryId as MemoryId | null,
    hintTierByItem,
    wrongAttemptsByItem,
    nonProgressInteractions: value.nonProgressInteractions,
    sameHotspotInspections,
    elapsedSinceProgressMs: value.elapsedSinceProgressMs,
    introSeen: value.introSeen,
    controlsSeen: value.controlsSeen,
    activeEndingId: activeEndingId as EndingId | null,
    viewedEndingIds,
    settings,
  };
}

export function migrateVersionZero(value: unknown): GameState | null {
  if (!isRecord(value)) {
    return null;
  }
  const hasSaveVersion = Object.hasOwn(value, "saveVersion");
  if (
    (hasSaveVersion && value.saveVersion !== 0) ||
    (!hasSaveVersion && value.version !== 0)
  ) {
    return null;
  }
  const source = isRecord(value.state) ? value.state : value;
  const initial = createInitialState();
  const oldSettings = isRecord(source.settings) ? source.settings : {};

  const migrated: UnknownRecord = {
    saveVersion: CURRENT_SAVE_VERSION,
    revision: source.revision ?? 0,
    started: source.started ?? true,
    areaId: source.areaId ?? initial.areaId,
    playerPosition: source.playerPosition ?? initial.playerPosition,
    inventoryItemIds:
      source.inventoryItemIds ?? source.inventory ?? initial.inventoryItemIds,
    foundClueIds: source.foundClueIds ?? source.clues ?? initial.foundClueIds,
    inspectedHotspotIds:
      source.inspectedHotspotIds ?? initial.inspectedHotspotIds,
    returnedItemIds:
      source.returnedItemIds ?? source.returnedItems ?? initial.returnedItemIds,
    viewedMemoryIds:
      source.viewedMemoryIds ?? source.viewedMemories ?? initial.viewedMemoryIds,
    pendingMemoryId: source.pendingMemoryId ?? initial.pendingMemoryId,
    hintTierByItem: source.hintTierByItem ?? initial.hintTierByItem,
    wrongAttemptsByItem:
      source.wrongAttemptsByItem ?? initial.wrongAttemptsByItem,
    nonProgressInteractions:
      source.nonProgressInteractions ?? initial.nonProgressInteractions,
    sameHotspotInspections:
      source.sameHotspotInspections ?? initial.sameHotspotInspections,
    elapsedSinceProgressMs:
      source.elapsedSinceProgressMs ?? initial.elapsedSinceProgressMs,
    introSeen: source.introSeen ?? initial.introSeen,
    controlsSeen: source.controlsSeen ?? initial.controlsSeen,
    activeEndingId: source.activeEndingId ?? initial.activeEndingId,
    viewedEndingIds:
      source.viewedEndingIds ?? source.endingHistory ?? initial.viewedEndingIds,
    settings: {
      ambientVolume:
        oldSettings.ambientVolume ?? initial.settings.ambientVolume,
      effectVolume: oldSettings.effectVolume ?? initial.settings.effectVolume,
      muted: oldSettings.muted ?? initial.settings.muted,
      textSpeed: oldSettings.textSpeed ?? initial.settings.textSpeed,
      showAllText: oldSettings.showAllText ?? initial.settings.showAllText,
      reducedMotion: oldSettings.reducedMotion ?? initial.settings.reducedMotion,
    },
  };

  return decodeVersionOne(migrated);
}

export function decodeSaveDocument(value: unknown): GameState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (Object.hasOwn(value, "saveVersion")) {
    if (value.saveVersion === CURRENT_SAVE_VERSION) {
      return decodeVersionOne(value);
    }
    if (value.saveVersion === 0) {
      return migrateVersionZero(value);
    }
    return null;
  }
  if (value.version === CURRENT_SAVE_VERSION && isRecord(value.state)) {
    return decodeVersionOne({ ...value.state, saveVersion: CURRENT_SAVE_VERSION });
  }
  if (value.version === 0) {
    return migrateVersionZero(value);
  }

  return null;
}

export function validateGameState(value: unknown): value is GameState {
  return decodeVersionOne(value) !== null;
}

export const isValidGameState = validateGameState;
export const validate = validateGameState;

export function isValidSaveDocument(value: unknown): boolean {
  return decodeSaveDocument(value) !== null;
}

export function parseSave(serialized: string): GameState | null {
  try {
    return decodeSaveDocument(JSON.parse(serialized) as unknown);
  } catch {
    return null;
  }
}

export const parseSaveDocument = parseSave;
export const parse = parseSave;

export function parseSaveOrInitial(
  serialized: string,
  fallback: GameState = createInitialState(),
): GameState {
  return parseSave(serialized) ?? fallback;
}

export function serializeSave(state: GameState): string {
  const safeState = decodeSaveDocument(state);
  if (safeState === null) {
    throw new TypeError("Refusing to serialize an invalid game state.");
  }
  return JSON.stringify(safeState);
}

export const serializeGameState = serializeSave;
export const serialize = serializeSave;

export const migrateSaveData = decodeSaveDocument;
