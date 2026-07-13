import { LOST_ITEM_DEFINITIONS, getItem } from "../content";
import { createInitialState, mergeSettings } from "./initial-state";
import {
  selectCanViewEnding,
  selectCurrentItemId,
  selectUnlockedAreas,
} from "./selectors";
import type {
  ClueId,
  GameAction,
  GameSettings,
  GameState,
  HintTier,
  ItemId,
} from "./types";

const HINT_TIME_MS = 90_000;
const MAX_COUNTER = Number.MAX_SAFE_INTEGER;
const VALID_ITEM_IDS: ReadonlySet<ItemId> = new Set(
  LOST_ITEM_DEFINITIONS.map((definition) => definition.id),
);
const VALID_CLUE_IDS: ReadonlySet<ClueId> = new Set(
  LOST_ITEM_DEFINITIONS.flatMap((definition) => definition.clueIds),
);

function nextRevision(state: GameState): number {
  return Math.min(MAX_COUNTER, state.revision + 1);
}

function changed(state: GameState, patch: Partial<GameState>): GameState {
  return { ...state, ...patch, revision: nextRevision(state) };
}

function addUnique<T>(items: readonly T[], item: T): readonly T[] {
  return items.includes(item) ? items : [...items, item];
}

function incrementCounter(value: number): number {
  return Math.min(MAX_COUNTER, value + 1);
}

function resetStagnation(): Pick<
  GameState,
  | "elapsedSinceProgressMs"
  | "nonProgressInteractions"
  | "sameHotspotInspections"
> {
  return {
    elapsedSinceProgressMs: 0,
    nonProgressInteractions: 0,
    sameHotspotInspections: {},
  };
}

function raiseHint(
  state: GameState,
  itemId: ItemId,
  amount = 1,
): GameState["hintTierByItem"] {
  const current = state.hintTierByItem[itemId] ?? 0;
  const next = Math.min(3, current + Math.max(0, Math.floor(amount))) as HintTier;
  if (next === current) {
    return state.hintTierByItem;
  }

  return { ...state.hintTierByItem, [itemId]: next };
}

function settingsEqual(left: GameSettings, right: GameSettings): boolean {
  return (
    left.ambientVolume === right.ambientVolume &&
    left.effectVolume === right.effectVolume &&
    left.muted === right.muted &&
    left.textSpeed === right.textSpeed &&
    left.showAllText === right.showAllText &&
    left.reducedMotion === right.reducedMotion
  );
}

function validPosition(position: GameState["playerPosition"]): boolean {
  return (
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    position.x >= 0 &&
    position.x <= 1_120 &&
    position.y >= 0 &&
    position.y <= 630 &&
    (position.facing === "up" ||
      position.facing === "down" ||
      position.facing === "left" ||
      position.facing === "right")
  );
}

function validHotspotId(hotspotId: string): boolean {
  return (
    hotspotId.length > 0 &&
    hotspotId.length <= 256 &&
    hotspotId !== "__proto__" &&
    hotspotId !== "constructor" &&
    hotspotId !== "prototype"
  );
}

export function reduceGame(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case "start-new-game":
      return createInitialState({
        revision: nextRevision(state),
        started: true,
        settings: state.settings,
        viewedEndingIds: state.viewedEndingIds,
      });

    case "move-player":
      if (
        !validPosition(action.position) ||
        (state.playerPosition.x === action.position.x &&
          state.playerPosition.y === action.position.y &&
          state.playerPosition.facing === action.position.facing)
      ) {
        return state;
      }
      return changed(state, { playerPosition: { ...action.position } });

    case "enter-area":
      if (
        !validPosition(action.position) ||
        !selectUnlockedAreas(state).includes(action.areaId)
      ) {
        return state;
      }
      if (
        state.areaId === action.areaId &&
        state.playerPosition.x === action.position.x &&
        state.playerPosition.y === action.position.y &&
        state.playerPosition.facing === action.position.facing
      ) {
        return state;
      }
      return changed(state, {
        areaId: action.areaId,
        playerPosition: { ...action.position },
      });

    case "inspect": {
      if (
        typeof action.hotspotId !== "string" ||
        !validHotspotId(action.hotspotId)
      ) {
        return state;
      }

      const inspectedHotspotIds = addUnique(
        state.inspectedHotspotIds,
        action.hotspotId,
      );
      if (action.madeProgress) {
        return changed(state, { inspectedHotspotIds, ...resetStagnation() });
      }

      const nonProgressInteractions = incrementCounter(
        state.nonProgressInteractions,
      );
      const sameCount = incrementCounter(
        state.sameHotspotInspections[action.hotspotId] ?? 0,
      );
      const sameHotspotInspections = {
        ...state.sameHotspotInspections,
        [action.hotspotId]: sameCount,
      };
      const currentItemId = selectCurrentItemId(state);
      const shouldUnlockHint =
        nonProgressInteractions % 6 === 0 || sameCount % 3 === 0;
      const hintTierByItem =
        currentItemId !== null && shouldUnlockHint
          ? raiseHint(state, currentItemId)
          : state.hintTierByItem;

      return changed(state, {
        inspectedHotspotIds,
        nonProgressInteractions,
        sameHotspotInspections,
        hintTierByItem,
      });
    }

    case "acquire-item": {
      if (
        !VALID_ITEM_IDS.has(action.itemId) ||
        state.returnedItemIds.includes(action.itemId) ||
        selectCurrentItemId(state) !== action.itemId
      ) {
        return state;
      }
      const definition = getItem(action.itemId);
      if (
        !definition.spawn.requiresReturnedItemIds.every((requiredItemId) =>
          state.returnedItemIds.includes(requiredItemId),
        )
      ) {
        return state;
      }
      const inventoryItemIds = addUnique(state.inventoryItemIds, action.itemId);
      const foundClueIds =
        action.clueId !== undefined &&
        VALID_CLUE_IDS.has(action.clueId) &&
        definition.clueIds.includes(action.clueId)
          ? addUnique(state.foundClueIds, action.clueId)
          : state.foundClueIds;
      if (
        inventoryItemIds === state.inventoryItemIds &&
        foundClueIds === state.foundClueIds
      ) {
        return state;
      }
      return changed(state, {
        inventoryItemIds,
        foundClueIds,
        ...resetStagnation(),
      });
    }

    case "discover-clue": {
      const currentItemId = selectCurrentItemId(state);
      if (
        !VALID_CLUE_IDS.has(action.clueId) ||
        state.foundClueIds.includes(action.clueId) ||
        currentItemId === null ||
        !getItem(currentItemId).clueIds.includes(action.clueId)
      ) {
        return state;
      }
      return changed(state, {
        foundClueIds: [...state.foundClueIds, action.clueId],
        ...resetStagnation(),
      });
    }

    case "return-correct": {
      if (
        !VALID_ITEM_IDS.has(action.itemId) ||
        !state.inventoryItemIds.includes(action.itemId) ||
        state.returnedItemIds.includes(action.itemId) ||
        state.pendingMemoryId !== null ||
        selectCurrentItemId(state) !== action.itemId
      ) {
        return state;
      }
      const definition = getItem(action.itemId);
      if (definition.memoryId !== action.memoryId) {
        return state;
      }

      return changed(state, {
        inventoryItemIds: state.inventoryItemIds.filter(
          (itemId) => itemId !== action.itemId,
        ),
        returnedItemIds: [...state.returnedItemIds, action.itemId],
        pendingMemoryId: action.memoryId,
        ...resetStagnation(),
      });
    }

    case "return-wrong": {
      if (
        !VALID_ITEM_IDS.has(action.itemId) ||
        !state.inventoryItemIds.includes(action.itemId) ||
        state.returnedItemIds.includes(action.itemId) ||
        selectCurrentItemId(state) !== action.itemId
      ) {
        return state;
      }
      const attempts = incrementCounter(
        state.wrongAttemptsByItem[action.itemId] ?? 0,
      );
      return changed(state, {
        wrongAttemptsByItem: {
          ...state.wrongAttemptsByItem,
          [action.itemId]: attempts,
        },
        hintTierByItem: raiseHint(state, action.itemId),
        nonProgressInteractions: incrementCounter(
          state.nonProgressInteractions,
        ),
      });
    }

    case "complete-memory":
      if (state.pendingMemoryId !== action.memoryId) {
        return state;
      }
      return changed(state, {
        pendingMemoryId: null,
        viewedMemoryIds: addUnique(state.viewedMemoryIds, action.memoryId),
      });

    case "advance-hint-time": {
      if (!Number.isFinite(action.elapsedMs) || action.elapsedMs <= 0) {
        return state;
      }
      const currentItemId = selectCurrentItemId(state);
      if (currentItemId === null) {
        return state;
      }
      const elapsed = Math.min(
        MAX_COUNTER,
        state.elapsedSinceProgressMs + action.elapsedMs,
      );
      const unlockedTiers = Math.floor(elapsed / HINT_TIME_MS);
      return changed(state, {
        elapsedSinceProgressMs: elapsed % HINT_TIME_MS,
        hintTierByItem:
          unlockedTiers > 0
            ? raiseHint(state, currentItemId, unlockedTiers)
            : state.hintTierByItem,
      });
    }

    case "unlock-next-hint":
      if (
        !VALID_ITEM_IDS.has(action.itemId) ||
        state.returnedItemIds.includes(action.itemId) ||
        selectCurrentItemId(state) !== action.itemId ||
        (state.hintTierByItem[action.itemId] ?? 0) >= 3
      ) {
        return state;
      }
      return changed(state, {
        hintTierByItem: raiseHint(state, action.itemId),
      });

    case "mark-intro-seen":
      return state.introSeen ? state : changed(state, { introSeen: true });

    case "mark-controls-seen":
      return state.controlsSeen ? state : changed(state, { controlsSeen: true });

    case "update-settings": {
      const settings = mergeSettings(state.settings, action.settings);
      return settingsEqual(settings, state.settings)
        ? state
        : changed(state, { settings });
    }

    case "record-ending":
      if (
        state.pendingMemoryId !== null ||
        !selectCanViewEnding(state, action.endingId)
      ) {
        return state;
      }
      return changed(state, {
        activeEndingId: action.endingId,
        viewedEndingIds: addUnique(state.viewedEndingIds, action.endingId),
      });

    case "clear-active-ending":
      return state.activeEndingId === null
        ? state
        : changed(state, { activeEndingId: null });

    case "reset-run":
      return createInitialState({
        revision: nextRevision(state),
        settings: state.settings,
        viewedEndingIds: state.viewedEndingIds,
      });

    default: {
      const exhaustiveAction: never = action;
      return exhaustiveAction;
    }
  }
}
