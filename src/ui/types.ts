import type { DialogueSpeaker } from "../game/content";
import type { EndingId, GameSettings, ItemId, MemoryId } from "../game/core/types";

export interface MenuEntry {
  readonly label: string;
  readonly detail?: string;
  readonly disabled?: boolean;
  readonly primary?: boolean;
  readonly tone?: "default" | "warm" | "danger";
  readonly onSelect: () => void;
}

export interface TitleView {
  readonly canContinue: boolean;
  readonly viewedEndingCount: number;
  readonly onNewGame: () => void;
  readonly onContinue: () => void;
  readonly onSettings: () => void;
  readonly onRecords: () => void;
}

export interface HudView {
  readonly areaName: string;
  readonly clock: string;
  readonly objective: string;
  readonly autosaveLabel?: string;
}

export interface DialogueView {
  readonly speakerId: DialogueSpeaker;
  readonly speaker: string;
  readonly lines: readonly string[];
  readonly tone?: "nagi" | "attendant" | "passenger" | "station";
  readonly portraitMood?: "normal" | "anxious" | "surprised" | "remembering" | "relieved" | "released";
  readonly actions?: readonly MenuEntry[];
}

export interface NoteEntry {
  readonly title: string;
  readonly body: string;
  readonly marker?: string;
  readonly muted?: boolean;
}

export interface NoteSection {
  readonly title: string;
  readonly entries: readonly NoteEntry[];
}

export interface InventoryEntry {
  readonly itemId: ItemId;
  readonly name: string;
  readonly description: string;
  readonly returned: boolean;
  readonly symbol: string;
}

export interface MemoryView {
  readonly memoryId: MemoryId;
  readonly itemId: ItemId;
  readonly title: string;
  readonly lines: readonly string[];
  readonly accent?: string;
}

export interface EndingView {
  readonly endingId: EndingId;
  readonly label: string;
  readonly title: string;
  readonly paragraphs: readonly string[];
}

export interface RecordEntry {
  readonly endingId: EndingId;
  readonly label: string;
  readonly title: string;
  readonly unlocked: boolean;
  readonly summary: string;
}

export interface SettingsHandlers {
  readonly onChange: (settings: Partial<GameSettings>) => void;
  readonly onDeleteSave?: () => void;
}

export type TouchDirection = "up" | "down" | "left" | "right";
export type TouchAction = "interact" | "note" | "inventory" | "pause";

export interface TouchHandlers {
  readonly onDirection: (direction: TouchDirection, active: boolean) => void;
  readonly onAction: (action: TouchAction) => void;
}
