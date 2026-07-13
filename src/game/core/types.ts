export type AreaId =
  | "area_waiting_room"
  | "area_concourse"
  | "area_station_office"
  | "area_footbridge"
  | "area_rain_platform";

export type ItemId =
  | "item_red_umbrella"
  | "item_star_bento"
  | "item_cassette_player"
  | "item_silver_hairclip"
  | "item_faded_photo_sticker"
  | "item_blank_ticket";

export type OwnerId =
  | "owner_station_attendant"
  | "owner_red_boots_child"
  | "owner_navy_bag_commuter"
  | "owner_old_listener"
  | "owner_ginkgo_student"
  | "owner_crescent_youth"
  | "owner_nagi";

export type ClueId =
  | "clue_umbrella_footprints"
  | "clue_umbrella_star_patch"
  | "clue_bento_lid_note"
  | "clue_bento_navy_wrap"
  | "clue_cassette_four_beats"
  | "clue_cassette_blue_thread"
  | "clue_hairclip_engraving"
  | "clue_hairclip_bookmark_tag"
  | "clue_photo_crescent_pin"
  | "clue_photo_booth_code"
  | "clue_ticket_pocket_fragment"
  | "clue_ticket_reflection";

export type MemoryId =
  | "memory_red_umbrella"
  | "memory_star_bento"
  | "memory_cassette_player"
  | "memory_silver_hairclip"
  | "memory_faded_photo"
  | "memory_blank_ticket";

export type EndingId =
  | "ending_last_train"
  | "ending_first_train"
  | "ending_rain_shelter";

export type Facing = "up" | "down" | "left" | "right";
export type HintTier = 0 | 1 | 2 | 3;
export type TextSpeed = "slow" | "normal" | "fast" | "instant";

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface PlayerPosition extends Point {
  readonly facing: Facing;
}

export interface GameSettings {
  readonly ambientVolume: number;
  readonly effectVolume: number;
  readonly muted: boolean;
  readonly textSpeed: TextSpeed;
  readonly showAllText: boolean;
  readonly reducedMotion: boolean;
}

export interface GameState {
  readonly saveVersion: 1;
  readonly revision: number;
  readonly started: boolean;
  readonly areaId: AreaId;
  readonly playerPosition: PlayerPosition;
  readonly inventoryItemIds: readonly ItemId[];
  readonly foundClueIds: readonly ClueId[];
  readonly inspectedHotspotIds: readonly string[];
  readonly returnedItemIds: readonly ItemId[];
  readonly viewedMemoryIds: readonly MemoryId[];
  readonly pendingMemoryId: MemoryId | null;
  readonly hintTierByItem: Readonly<Partial<Record<ItemId, HintTier>>>;
  readonly wrongAttemptsByItem: Readonly<Partial<Record<ItemId, number>>>;
  readonly nonProgressInteractions: number;
  readonly sameHotspotInspections: Readonly<Record<string, number>>;
  readonly elapsedSinceProgressMs: number;
  readonly introSeen: boolean;
  readonly controlsSeen: boolean;
  readonly activeEndingId: EndingId | null;
  readonly viewedEndingIds: readonly EndingId[];
  readonly settings: GameSettings;
}

export type GameAction =
  | { readonly type: "start-new-game" }
  | { readonly type: "move-player"; readonly position: PlayerPosition }
  | { readonly type: "enter-area"; readonly areaId: AreaId; readonly position: PlayerPosition }
  | { readonly type: "inspect"; readonly hotspotId: string; readonly madeProgress: boolean }
  | { readonly type: "acquire-item"; readonly itemId: ItemId; readonly clueId?: ClueId }
  | { readonly type: "discover-clue"; readonly clueId: ClueId }
  | { readonly type: "return-correct"; readonly itemId: ItemId; readonly memoryId: MemoryId }
  | { readonly type: "return-wrong"; readonly itemId: ItemId }
  | { readonly type: "complete-memory"; readonly memoryId: MemoryId }
  | { readonly type: "advance-hint-time"; readonly elapsedMs: number }
  | { readonly type: "unlock-next-hint"; readonly itemId: ItemId }
  | { readonly type: "mark-intro-seen" }
  | { readonly type: "mark-controls-seen" }
  | { readonly type: "update-settings"; readonly settings: Partial<GameSettings> }
  | { readonly type: "record-ending"; readonly endingId: EndingId }
  | { readonly type: "clear-active-ending" }
  | { readonly type: "reset-run" };

export interface ReturnResult {
  readonly correct: boolean;
  readonly itemId: ItemId;
  readonly ownerId: OwnerId;
  readonly dialogId: string;
  readonly memoryId: MemoryId | null;
}
