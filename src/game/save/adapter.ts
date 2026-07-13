import { GAME_META } from "../content/meta";
import { createInitialState } from "../core/initial-state";
import type { GameState } from "../core/types";
import { parseSave, serializeSave } from "./validation";

export const STORAGE_KEY = GAME_META.storageKey;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface SaveAdapterOptions {
  readonly key?: string;
  readonly fallback?: GameState | (() => GameState);
}

function resolveFallback(
  fallback: GameState | (() => GameState) | undefined,
): GameState {
  if (typeof fallback === "function") {
    return fallback();
  }
  return fallback ?? createInitialState();
}

export class LocalStorageSaveAdapter {
  private readonly storage: StorageLike;
  private readonly storageKey: string;
  private readonly fallback: GameState | (() => GameState) | undefined;

  public constructor(storage: StorageLike, options: SaveAdapterOptions = {}) {
    this.storage = storage;
    this.storageKey = options.key ?? STORAGE_KEY;
    this.fallback = options.fallback;
  }

  public load(): GameState {
    try {
      const serialized = this.storage.getItem(this.storageKey);
      if (serialized === null) {
        return resolveFallback(this.fallback);
      }
      return parseSave(serialized) ?? resolveFallback(this.fallback);
    } catch {
      return resolveFallback(this.fallback);
    }
  }

  public save(state: GameState): boolean {
    try {
      this.storage.setItem(this.storageKey, serializeSave(state));
      return true;
    } catch {
      return false;
    }
  }

  public clear(): boolean {
    try {
      this.storage.removeItem(this.storageKey);
      return true;
    } catch {
      return false;
    }
  }

  public hasSave(): boolean {
    try {
      const serialized = this.storage.getItem(this.storageKey);
      return serialized !== null && parseSave(serialized) !== null;
    } catch {
      return false;
    }
  }
}

export { LocalStorageSaveAdapter as SaveAdapter };

export function createSaveAdapter(
  storage: StorageLike,
  options?: SaveAdapterOptions,
): LocalStorageSaveAdapter {
  return new LocalStorageSaveAdapter(storage, options);
}

export function loadSave(
  storage: StorageLike,
  fallback: GameState = createInitialState(),
  key = STORAGE_KEY,
): GameState {
  return new LocalStorageSaveAdapter(storage, { key, fallback }).load();
}

export const loadGameState = loadSave;
export const load = loadSave;

export function saveGameState(
  storage: StorageLike,
  state: GameState,
  key = STORAGE_KEY,
): boolean {
  return new LocalStorageSaveAdapter(storage, { key }).save(state);
}

export const saveSave = saveGameState;
export const save = saveGameState;

export function clearSave(storage: StorageLike, key = STORAGE_KEY): boolean {
  return new LocalStorageSaveAdapter(storage, { key }).clear();
}

export const clearSavedGame = clearSave;
export const clear = clearSave;
