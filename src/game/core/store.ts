import { getItem } from "../content";
import { createInitialState } from "./initial-state";
import { reduceGame } from "./reducer";
import type {
  GameAction,
  GameState,
  ItemId,
  OwnerId,
  ReturnResult,
} from "./types";

export type GameStoreListener = (
  state: GameState,
  previousState: GameState,
  action: GameAction,
) => void;

export type Unsubscribe = () => void;

export class GameStore {
  private currentState: GameState;
  private readonly listeners = new Set<GameStoreListener>();
  private readonly queuedActions: GameAction[] = [];
  private dispatching = false;

  public constructor(initialState: GameState = createInitialState()) {
    this.currentState = initialState;
  }

  public getState(): GameState {
    return this.currentState;
  }

  public dispatch(action: GameAction): GameState {
    if (this.dispatching) {
      this.queuedActions.push(action);
      return this.currentState;
    }

    this.dispatching = true;
    try {
      let nextState = this.applyAction(action);
      let queuedAction = this.queuedActions.shift();
      while (queuedAction !== undefined) {
        nextState = this.applyAction(queuedAction);
        queuedAction = this.queuedActions.shift();
      }
      return nextState;
    } catch (error: unknown) {
      this.queuedActions.length = 0;
      throw error;
    } finally {
      this.dispatching = false;
    }
  }

  private applyAction(action: GameAction): GameState {
    const previousState = this.currentState;
    const nextState = reduceGame(previousState, action);
    if (nextState === previousState) {
      return previousState;
    }

    this.currentState = nextState;
    for (const listener of [...this.listeners]) {
      listener(nextState, previousState, action);
    }
    return nextState;
  }

  public subscribe(listener: GameStoreListener): Unsubscribe {
    this.listeners.add(listener);
    let subscribed = true;

    return () => {
      if (!subscribed) {
        return;
      }
      subscribed = false;
      this.listeners.delete(listener);
    };
  }

  public tryReturn(itemId: ItemId, ownerId: OwnerId): ReturnResult {
    const definition = getItem(itemId);
    const state = this.currentState;
    if (
      !state.inventoryItemIds.includes(itemId) ||
      state.returnedItemIds.includes(itemId)
    ) {
      throw new Error(`Cannot return an item that is not in the inventory: ${itemId}`);
    }
    if (state.pendingMemoryId !== null) {
      throw new Error("Complete the pending memory before returning another item.");
    }

    if (definition.ownerId === ownerId) {
      this.dispatch({
        type: "return-correct",
        itemId,
        memoryId: definition.memoryId,
      });
      return {
        correct: true,
        itemId,
        ownerId,
        dialogId: definition.correctDialogId,
        memoryId: definition.memoryId,
      };
    }

    const previousAttempts = state.wrongAttemptsByItem[itemId] ?? 0;
    const dialogIndex = Math.min(
      previousAttempts,
      definition.wrongDialogIds.length - 1,
    );
    const dialogId = definition.wrongDialogIds[dialogIndex];
    if (dialogId === undefined) {
      throw new Error(`No wrong-return dialog is defined for item: ${itemId}`);
    }

    this.dispatch({ type: "return-wrong", itemId });
    return {
      correct: false,
      itemId,
      ownerId,
      dialogId,
      memoryId: null,
    };
  }

  public clearListeners(): void {
    this.listeners.clear();
  }
}

export function createGameStore(initialState?: GameState): GameStore {
  return new GameStore(initialState);
}
