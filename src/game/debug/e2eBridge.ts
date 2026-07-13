import { getItem, LOST_ITEM_DEFINITIONS } from "../content";
import type { GameState, ItemId } from "../core/types";
import type { GameStore } from "../core";

export const E2E_SENTINEL = "__RAIN_SHELTER_E2E__" as const;

export type ScenarioId =
  | "fresh-game"
  | "umbrella-return-ready"
  | "memory-red-pending"
  | "after-umbrella"
  | "rain-platform"
  | "photo-return-ready"
  | "ending-a-ready"
  | "ending-b-ready";

export interface E2EBridgeDependencies {
  readonly store: GameStore;
  readonly activate: () => void;
  readonly freezeVisuals: (frozen: boolean) => void;
}

export interface RainShelterE2EBridge {
  ready(): Promise<void>;
  snapshot(): Readonly<GameState>;
  loadScenario(id: ScenarioId): Promise<void>;
  waitForIdle(): Promise<void>;
  stabilizeVisuals(): Promise<void>;
}

declare global {
  interface Window {
    __RAIN_SHELTER_E2E__?: RainShelterE2EBridge;
  }
}

function acquireCurrentItem(store: GameStore, itemId: ItemId): void {
  const item = getItem(itemId);
  store.dispatch({ type: "acquire-item", itemId, clueId: item.clueIds[0] });
  store.dispatch({ type: "discover-clue", clueId: item.clueIds[1] });
}

function completeItem(store: GameStore, itemId: ItemId): void {
  const item = getItem(itemId);
  acquireCurrentItem(store, itemId);
  const result = store.tryReturn(itemId, item.ownerId);
  if (!result.memoryId) throw new Error(`Scenario could not return ${itemId}`);
  store.dispatch({ type: "complete-memory", memoryId: result.memoryId });
}

function completeItems(store: GameStore, count: number): void {
  for (const item of LOST_ITEM_DEFINITIONS.slice(0, count)) completeItem(store, item.id);
}

function buildScenario(store: GameStore, id: ScenarioId): void {
  store.dispatch({ type: "start-new-game" });
  store.dispatch({ type: "mark-intro-seen" });
  store.dispatch({ type: "mark-controls-seen" });

  switch (id) {
    case "fresh-game":
      break;
    case "umbrella-return-ready": {
      const item = LOST_ITEM_DEFINITIONS[0];
      if (!item) throw new Error("Umbrella definition is missing.");
      acquireCurrentItem(store, item.id);
      store.dispatch({
        type: "move-player",
        position: { x: 760, y: 390, facing: "right" },
      });
      break;
    }
    case "memory-red-pending": {
      const item = LOST_ITEM_DEFINITIONS[0];
      if (!item) throw new Error("Umbrella definition is missing.");
      acquireCurrentItem(store, item.id);
      store.tryReturn(item.id, item.ownerId);
      break;
    }
    case "after-umbrella":
      completeItems(store, 1);
      break;
    case "rain-platform":
      completeItems(store, 3);
      store.dispatch({
        type: "enter-area",
        areaId: "area_rain_platform",
        position: { x: 250, y: 365, facing: "right" },
      });
      break;
    case "photo-return-ready": {
      completeItems(store, 4);
      const item = LOST_ITEM_DEFINITIONS[4];
      if (!item) throw new Error("Photo definition is missing.");
      acquireCurrentItem(store, item.id);
      store.dispatch({
        type: "enter-area",
        areaId: "area_station_office",
        position: { x: 755, y: 380, facing: "right" },
      });
      break;
    }
    case "ending-a-ready":
      completeItems(store, 5);
      store.dispatch({
        type: "enter-area",
        areaId: "area_rain_platform",
        position: { x: 595, y: 355, facing: "right" },
      });
      break;
    case "ending-b-ready":
      completeItems(store, 6);
      store.dispatch({
        type: "enter-area",
        areaId: "area_rain_platform",
        position: { x: 595, y: 355, facing: "right" },
      });
      break;
  }
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

export function mountE2EBridge(dependencies: E2EBridgeDependencies): void {
  const bridge: RainShelterE2EBridge = {
    async ready(): Promise<void> {
      await document.fonts.ready;
      await nextFrame();
      await nextFrame();
    },
    snapshot(): Readonly<GameState> {
      return structuredClone(dependencies.store.getState());
    },
    async loadScenario(id: ScenarioId): Promise<void> {
      buildScenario(dependencies.store, id);
      dependencies.activate();
      await this.waitForIdle();
    },
    async waitForIdle(): Promise<void> {
      await document.fonts.ready;
      await nextFrame();
      await nextFrame();
    },
    async stabilizeVisuals(): Promise<void> {
      dependencies.freezeVisuals(true);
      document.documentElement.dataset.visualsStable = "true";
      await this.waitForIdle();
    },
  };
  window[E2E_SENTINEL] = bridge;
}
