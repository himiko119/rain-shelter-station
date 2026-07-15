import { getItem, LOST_ITEM_DEFINITIONS } from "../content";
import type { AreaId, Facing, GameState, ItemId, Point } from "../core/types";
import type { GameStore } from "../core";
import type { ExplorationVisualProbe } from "../../phaser/scenes/ExplorationScene";

export const E2E_SENTINEL = "__RAIN_SHELTER_E2E__" as const;

export type ScenarioId =
  | "fresh-game"
  | "umbrella-return-ready"
  | "memory-red-pending"
  | "after-umbrella"
  | "rain-platform"
  | "photo-return-ready"
  | "ending-a-ready"
  | "ending-b-ready"
  | "waiting-far"
  | "waiting-mid"
  | "waiting-near"
  | "waiting-behind-umbrella-rack"
  | "waiting-under-lamp"
  | "waiting-at-photo-booth"
  | "concourse-near-gates"
  | "office-behind-desk"
  | "footbridge-near-railing"
  | "platform-near-edge"
  | "platform-under-lamp"
  | "mobile-dialogue"
  | "mobile-touch"
  | "memory-red-umbrella";

export interface E2EBridgeDependencies {
  readonly store: GameStore;
  readonly activate: () => void;
  readonly freezeVisuals: (frozen: boolean) => void;
  readonly stabilizeVisuals: (time: number) => void;
  readonly sceneProbe: () => ExplorationVisualProbe | null;
  readonly worldToScreen: (point: Point) => Point;
}

export interface RainShelterE2EBridge {
  ready(): Promise<void>;
  snapshot(): Readonly<GameState>;
  loadScenario(id: ScenarioId): Promise<void>;
  waitForIdle(): Promise<void>;
  stabilizeVisuals(time?: number): Promise<void>;
  sceneProbe(): ExplorationVisualProbe | null;
  worldToScreen(point: Point): Point;
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

function placePlayer(
  store: GameStore,
  areaId: AreaId,
  point: Point,
  facing: Facing = "down",
): void {
  if (store.getState().areaId === areaId) {
    store.dispatch({ type: "move-player", position: { ...point, facing } });
    return;
  }
  store.dispatch({ type: "enter-area", areaId, position: { ...point, facing } });
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
    case "memory-red-umbrella": {
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
      placePlayer(store, "area_rain_platform", { x: 520, y: 430 }, "right");
      break;
    case "ending-b-ready":
      completeItems(store, 6);
      placePlayer(store, "area_rain_platform", { x: 520, y: 430 }, "right");
      break;
    case "waiting-far":
      placePlayer(store, "area_waiting_room", { x: 420, y: 352 }, "down");
      break;
    case "waiting-mid":
      placePlayer(store, "area_waiting_room", { x: 560, y: 470 }, "down");
      break;
    case "waiting-near":
      placePlayer(store, "area_waiting_room", { x: 650, y: 578 }, "up");
      break;
    case "waiting-behind-umbrella-rack":
      placePlayer(store, "area_waiting_room", { x: 330, y: 445 }, "left");
      break;
    case "waiting-under-lamp":
      placePlayer(store, "area_waiting_room", { x: 635, y: 450 }, "up");
      break;
    case "waiting-at-photo-booth":
      placePlayer(store, "area_waiting_room", { x: 810, y: 374 }, "right");
      break;
    case "concourse-near-gates":
      placePlayer(store, "area_concourse", { x: 570, y: 440 }, "up");
      break;
    case "office-behind-desk":
      completeItems(store, 1);
      placePlayer(store, "area_station_office", { x: 530, y: 515 }, "left");
      break;
    case "footbridge-near-railing":
      completeItems(store, 2);
      placePlayer(store, "area_footbridge", { x: 405, y: 430 }, "left");
      break;
    case "platform-near-edge":
      completeItems(store, 3);
      placePlayer(store, "area_rain_platform", { x: 450, y: 520 }, "right");
      break;
    case "platform-under-lamp":
      completeItems(store, 3);
      placePlayer(store, "area_rain_platform", { x: 390, y: 415 }, "up");
      break;
    case "mobile-dialogue":
      placePlayer(store, "area_waiting_room", { x: 760, y: 455 }, "right");
      break;
    case "mobile-touch":
      placePlayer(store, "area_waiting_room", { x: 560, y: 470 }, "down");
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
      dependencies.freezeVisuals(false);
      buildScenario(dependencies.store, id);
      dependencies.activate();
      await this.waitForIdle();
    },
    async waitForIdle(): Promise<void> {
      await document.fonts.ready;
      await nextFrame();
      await nextFrame();
    },
    async stabilizeVisuals(time = 2_400): Promise<void> {
      dependencies.stabilizeVisuals(time);
      document.documentElement.dataset.visualsStable = "true";
      await this.waitForIdle();
    },
    sceneProbe(): ExplorationVisualProbe | null {
      return dependencies.sceneProbe();
    },
    worldToScreen(point: Point): Point {
      return dependencies.worldToScreen(point);
    },
  };
  window[E2E_SENTINEL] = bridge;
}
