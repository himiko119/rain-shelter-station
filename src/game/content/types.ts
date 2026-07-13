import type {
  AreaId,
  ClueId,
  EndingId,
  ItemId,
  MemoryId,
  OwnerId,
  PlayerPosition,
  Point,
} from "../core/types";

export type StoryStage = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type ItemStage = Exclude<StoryStage, 6>;

export interface Rectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface AvailabilityDefinition {
  readonly availableFromStage: StoryStage;
  readonly availableUntilStage?: StoryStage;
  readonly requiresReturnedItemIds?: readonly ItemId[];
  readonly requiresInventoryItemIds?: readonly ItemId[];
}

export type HotspotKind =
  | "item"
  | "clue"
  | "owner"
  | "inspect"
  | "mirror"
  | "ending";

export interface HotspotDefinition {
  readonly id: string;
  readonly kind: HotspotKind;
  readonly label: string;
  readonly prompt: string;
  readonly position: Point;
  readonly radius: number;
  readonly facing?: "up" | "down" | "left" | "right";
  readonly itemId?: ItemId;
  readonly clueId?: ClueId;
  readonly ownerId?: OwnerId;
  readonly dialogId?: string;
  readonly repeatDialogId?: string;
  readonly availability: AvailabilityDefinition;
}

export interface AreaExitDefinition {
  readonly id: string;
  readonly label: string;
  readonly bounds: Rectangle;
  readonly targetAreaId: AreaId;
  readonly targetPosition: PlayerPosition;
  readonly availableFromStage: StoryStage;
  readonly lockedDialogId?: string;
}

export interface ObstacleDefinition {
  readonly id: string;
  readonly label: string;
  readonly bounds: Rectangle;
  readonly blocksMovement: true;
}

export type DecorationLayer = "floor" | "below-player" | "above-player";

export type DecorationKind =
  | "wall"
  | "floor-band"
  | "window"
  | "bench"
  | "clock"
  | "lamp"
  | "sign"
  | "puddle"
  | "machine"
  | "counter"
  | "railing"
  | "stairs"
  | "track"
  | "plant"
  | "shelf"
  | "door"
  | "poster"
  | "drain";

export interface DecorationDefinition {
  readonly id: string;
  readonly kind: DecorationKind;
  readonly bounds: Rectangle;
  readonly layer: DecorationLayer;
  readonly color: string;
  readonly accentColor?: string;
  readonly opacity?: number;
  readonly label?: string;
  readonly animation?: "rain" | "pulse" | "clock" | "reflection";
  readonly availableFromStage?: StoryStage;
}

export interface AreaPalette {
  readonly floor: string;
  readonly wall: string;
  readonly trim: string;
  readonly light: string;
  readonly shadow: string;
  readonly rain: string;
}

export interface AreaDefinition {
  readonly id: AreaId;
  readonly name: string;
  readonly subtitle: string;
  readonly description: string;
  readonly availableFromStage: StoryStage;
  readonly objective: string;
  readonly world: {
    readonly width: 1120;
    readonly height: 630;
    readonly safeBounds: Rectangle;
  };
  readonly playerStart: PlayerPosition;
  readonly palette: AreaPalette;
  readonly ambience: {
    readonly rainLevel: "heavy" | "steady" | "soft";
    readonly roomTone: string;
    readonly lightLevel: number;
  };
  readonly exits: readonly AreaExitDefinition[];
  readonly obstacles: readonly ObstacleDefinition[];
  readonly hotspots: readonly HotspotDefinition[];
  readonly decorations: readonly DecorationDefinition[];
}

export interface OwnerDefinition {
  readonly id: OwnerId;
  readonly name: string;
  readonly role: string;
  readonly areaId: AreaId;
  readonly hotspotId: string;
  readonly position: Point;
  readonly profile: string;
  readonly notebookObservation: string;
  readonly ambientDialogId: string;
  readonly returnedDialogId: string;
  readonly availableFromStage: StoryStage;
  readonly visual: {
    readonly silhouetteColor: string;
    readonly accentColor: string;
    readonly accessory: string;
  };
}

export type ClueSource = "world" | "item" | "owner" | "reflection";

export interface ClueDefinition {
  readonly id: ClueId;
  readonly itemId: ItemId;
  readonly title: string;
  readonly observation: string;
  readonly notebookText: string;
  readonly areaId: AreaId;
  readonly hotspotId: string;
  readonly source: ClueSource;
}

export interface ItemSpawnDefinition {
  readonly areaId: AreaId;
  readonly hotspotId: string;
  readonly position: Point;
  readonly availableFromStage: StoryStage;
  readonly requiresReturnedItemIds: readonly ItemId[];
}

export interface LostItemDefinition {
  readonly id: ItemId;
  readonly name: string;
  readonly shortDescription: string;
  readonly inventoryDescription: string;
  readonly objective: string;
  readonly stage: ItemStage;
  readonly spawn: ItemSpawnDefinition;
  readonly ownerId: OwnerId;
  readonly clueIds: readonly [ClueId, ClueId];
  readonly wrongDialogIds: readonly [string, string];
  readonly hintDialogIds: readonly [string, string, string];
  readonly memoryId: MemoryId;
  readonly correctDialogId: string;
  readonly note: string;
  readonly visual: {
    readonly shape:
      | "umbrella"
      | "bento"
      | "cassette"
      | "hairclip"
      | "photo"
      | "ticket";
    readonly primaryColor: string;
    readonly secondaryColor: string;
    readonly glyph: string;
  };
}

export interface MemoryBeat {
  readonly text: string;
  readonly visual: string;
  readonly color: string;
}

export interface MemoryDefinition {
  readonly id: MemoryId;
  readonly itemId: ItemId;
  readonly title: string;
  readonly summary: string;
  readonly clockTime: string;
  readonly beats: readonly [MemoryBeat, MemoryBeat, MemoryBeat];
  readonly afterText: string;
}

export interface EndingDefinition {
  readonly id: EndingId;
  readonly title: string;
  readonly recordLabel: string;
  readonly choiceLabel: string;
  readonly conditionSummary: string;
  readonly summary: string;
  readonly paragraphs: readonly [string, string, string];
  readonly closingLine: string;
  readonly accentColor: string;
}

export type DialogueSpeaker = OwnerId | "narrator" | "station";

export interface DialogueLine {
  readonly speaker: DialogueSpeaker;
  readonly name: string;
  readonly text: string;
}

export interface DialogueDefinition {
  readonly id: string;
  readonly lines: readonly DialogueLine[];
}

export interface ObjectiveDefinition {
  readonly stage: StoryStage;
  readonly itemId: ItemId | null;
  readonly shortText: string;
  readonly noteText: string;
}
