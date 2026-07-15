import type {
  AreaId,
  EndingId,
  ItemId,
  MemoryId,
  OwnerId,
} from "../core/types";

import { isSafePublicAssetPath, resolvePublicAssetUrl } from "./assetUrl";

export const STATIC_ART_KEYS = {
  waitingRoomBackground: "art-v3.background.waiting-room",
  concourseBackground: "art-v3.background.concourse",
  stationOfficeBackground: "art-v3.background.station-office",
  footbridgeBackground: "art-v3.background.footbridge",
  rainPlatformNightBackground: "art-v3.background.rain-platform-night",
  rainPlatformLastTrainBackground: "art-v3.background.rain-platform-last-train",
  rainPlatformDawnBackground: "art-v3.background.rain-platform-dawn",
  titleKeyVisual: "art-v3.ui.title-key-visual",
  finalChoiceVisual: "art-v3.ui.final-choice",
  endingLastTrain: "art-v3.ending.last-train",
  endingFirstTrain: "art-v3.ending.first-train",
  endingRainShelter: "art-v3.ending.rain-shelter",
  nagiIdleDown: "art-v3.character.nagi-idle-down",
  nagiIdleUp: "art-v3.character.nagi-idle-up",
  nagiIdleLeft: "art-v3.character.nagi-idle-left",
  nagiIdleRight: "art-v3.character.nagi-idle-right",
  nagiWalkDown: "art-v3.character.nagi-walk-down",
  nagiWalkUp: "art-v3.character.nagi-walk-up",
  nagiWalkLeft: "art-v3.character.nagi-walk-left",
  nagiWalkRight: "art-v3.character.nagi-walk-right",
  nagiInspectDown: "art-v3.character.nagi-inspect-down",
  nagiAcquireDown: "art-v3.character.nagi-acquire-down",
  stationAttendantIdle: "art-v3.character.station-attendant-idle",
  redBootsChildIdle: "art-v3.character.red-boots-child-idle",
  navyBagCommuterIdle: "art-v3.character.navy-bag-commuter-idle",
  oldListenerIdle: "art-v3.character.old-listener-idle",
  ginkgoStudentIdle: "art-v3.character.ginkgo-student-idle",
  crescentYouthIdle: "art-v3.character.crescent-youth-idle",
  redUmbrellaItem: "art-v3.item.red-umbrella",
  starBentoItem: "art-v3.item.star-bento",
  cassettePlayerItem: "art-v3.item.cassette-player",
  silverHairclipItem: "art-v3.item.silver-hairclip",
  fadedPhotoItem: "art-v3.item.faded-photo-sticker",
  blankTicketItem: "art-v3.item.blank-ticket",
  nagiNormalPortrait: "art-v3.portrait.nagi-normal",
  nagiAnxiousPortrait: "art-v3.portrait.nagi-anxious",
  nagiSurprisedPortrait: "art-v3.portrait.nagi-surprised",
  nagiRememberingPortrait: "art-v3.portrait.nagi-remembering",
  nagiRelievedPortrait: "art-v3.portrait.nagi-relieved",
  stationAttendantNormalPortrait: "art-v3.portrait.station-attendant-normal",
  stationAttendantReleasedPortrait: "art-v3.portrait.station-attendant-released",
  redBootsChildNormalPortrait: "art-v3.portrait.red-boots-child-normal",
  redBootsChildReleasedPortrait: "art-v3.portrait.red-boots-child-released",
  navyBagCommuterNormalPortrait: "art-v3.portrait.navy-bag-commuter-normal",
  navyBagCommuterReleasedPortrait: "art-v3.portrait.navy-bag-commuter-released",
  oldListenerNormalPortrait: "art-v3.portrait.old-listener-normal",
  oldListenerReleasedPortrait: "art-v3.portrait.old-listener-released",
  ginkgoStudentNormalPortrait: "art-v3.portrait.ginkgo-student-normal",
  ginkgoStudentReleasedPortrait: "art-v3.portrait.ginkgo-student-released",
  crescentYouthNormalPortrait: "art-v3.portrait.crescent-youth-normal",
  crescentYouthReleasedPortrait: "art-v3.portrait.crescent-youth-released",
  redUmbrellaMemory: "art-v3.memory.red-umbrella",
  starBentoMemory: "art-v3.memory.star-bento",
  cassettePlayerMemory: "art-v3.memory.cassette-player",
  silverHairclipMemory: "art-v3.memory.silver-hairclip",
  fadedPhotoMemory: "art-v3.memory.faded-photo",
  blankTicketMemory: "art-v3.memory.blank-ticket",
} as const;

export type StaticArtAssetKey =
  (typeof STATIC_ART_KEYS)[keyof typeof STATIC_ART_KEYS];

export const AREA_STATIC_ART_KEYS = {
  area_waiting_room: STATIC_ART_KEYS.waitingRoomBackground,
  area_concourse: STATIC_ART_KEYS.concourseBackground,
  area_station_office: STATIC_ART_KEYS.stationOfficeBackground,
  area_footbridge: STATIC_ART_KEYS.footbridgeBackground,
  area_rain_platform: STATIC_ART_KEYS.rainPlatformNightBackground,
} as const satisfies Readonly<Record<AreaId, StaticArtAssetKey>>;

export function getAreaStaticArtKey(areaId: AreaId, stage: number): StaticArtAssetKey {
  if (areaId !== "area_rain_platform") return AREA_STATIC_ART_KEYS[areaId];
  if (stage >= 6) return STATIC_ART_KEYS.rainPlatformDawnBackground;
  if (stage >= 5) return STATIC_ART_KEYS.rainPlatformLastTrainBackground;
  return STATIC_ART_KEYS.rainPlatformNightBackground;
}

export const NAGI_STATIC_ART_KEYS = Object.freeze({
  idle: Object.freeze({
    down: STATIC_ART_KEYS.nagiIdleDown,
    up: STATIC_ART_KEYS.nagiIdleUp,
    left: STATIC_ART_KEYS.nagiIdleLeft,
    right: STATIC_ART_KEYS.nagiIdleRight,
  }),
  walk: Object.freeze({
    down: STATIC_ART_KEYS.nagiWalkDown,
    up: STATIC_ART_KEYS.nagiWalkUp,
    left: STATIC_ART_KEYS.nagiWalkLeft,
    right: STATIC_ART_KEYS.nagiWalkRight,
  }),
  inspect: STATIC_ART_KEYS.nagiInspectDown,
  acquire: STATIC_ART_KEYS.nagiAcquireDown,
} as const);

export const OWNER_STATIC_ART_KEYS = Object.freeze({
  owner_station_attendant: STATIC_ART_KEYS.stationAttendantIdle,
  owner_red_boots_child: STATIC_ART_KEYS.redBootsChildIdle,
  owner_navy_bag_commuter: STATIC_ART_KEYS.navyBagCommuterIdle,
  owner_old_listener: STATIC_ART_KEYS.oldListenerIdle,
  owner_ginkgo_student: STATIC_ART_KEYS.ginkgoStudentIdle,
  owner_crescent_youth: STATIC_ART_KEYS.crescentYouthIdle,
} as const satisfies Readonly<Partial<Record<OwnerId, StaticArtAssetKey>>>);

export const ITEM_STATIC_ART_KEYS = Object.freeze({
  item_red_umbrella: STATIC_ART_KEYS.redUmbrellaItem,
  item_star_bento: STATIC_ART_KEYS.starBentoItem,
  item_cassette_player: STATIC_ART_KEYS.cassettePlayerItem,
  item_silver_hairclip: STATIC_ART_KEYS.silverHairclipItem,
  item_faded_photo_sticker: STATIC_ART_KEYS.fadedPhotoItem,
  item_blank_ticket: STATIC_ART_KEYS.blankTicketItem,
} as const satisfies Readonly<Record<ItemId, StaticArtAssetKey>>);

export type NagiPortraitMood = "normal" | "anxious" | "surprised" | "remembering" | "relieved";

export const NAGI_PORTRAIT_STATIC_ART_KEYS = Object.freeze({
  normal: STATIC_ART_KEYS.nagiNormalPortrait,
  anxious: STATIC_ART_KEYS.nagiAnxiousPortrait,
  surprised: STATIC_ART_KEYS.nagiSurprisedPortrait,
  remembering: STATIC_ART_KEYS.nagiRememberingPortrait,
  relieved: STATIC_ART_KEYS.nagiRelievedPortrait,
} as const satisfies Readonly<Record<NagiPortraitMood, StaticArtAssetKey>>);

export const OWNER_PORTRAIT_STATIC_ART_KEYS = Object.freeze({
  owner_station_attendant: Object.freeze({
    normal: STATIC_ART_KEYS.stationAttendantNormalPortrait,
    released: STATIC_ART_KEYS.stationAttendantReleasedPortrait,
  }),
  owner_red_boots_child: Object.freeze({
    normal: STATIC_ART_KEYS.redBootsChildNormalPortrait,
    released: STATIC_ART_KEYS.redBootsChildReleasedPortrait,
  }),
  owner_navy_bag_commuter: Object.freeze({
    normal: STATIC_ART_KEYS.navyBagCommuterNormalPortrait,
    released: STATIC_ART_KEYS.navyBagCommuterReleasedPortrait,
  }),
  owner_old_listener: Object.freeze({
    normal: STATIC_ART_KEYS.oldListenerNormalPortrait,
    released: STATIC_ART_KEYS.oldListenerReleasedPortrait,
  }),
  owner_ginkgo_student: Object.freeze({
    normal: STATIC_ART_KEYS.ginkgoStudentNormalPortrait,
    released: STATIC_ART_KEYS.ginkgoStudentReleasedPortrait,
  }),
  owner_crescent_youth: Object.freeze({
    normal: STATIC_ART_KEYS.crescentYouthNormalPortrait,
    released: STATIC_ART_KEYS.crescentYouthReleasedPortrait,
  }),
  owner_nagi: Object.freeze({
    normal: STATIC_ART_KEYS.nagiNormalPortrait,
    released: STATIC_ART_KEYS.nagiRelievedPortrait,
  }),
} as const satisfies Readonly<Record<OwnerId, Readonly<Record<"normal" | "released", StaticArtAssetKey>>>>);

export const MEMORY_STATIC_ART_KEYS = Object.freeze({
  memory_red_umbrella: STATIC_ART_KEYS.redUmbrellaMemory,
  memory_star_bento: STATIC_ART_KEYS.starBentoMemory,
  memory_cassette_player: STATIC_ART_KEYS.cassettePlayerMemory,
  memory_silver_hairclip: STATIC_ART_KEYS.silverHairclipMemory,
  memory_faded_photo: STATIC_ART_KEYS.fadedPhotoMemory,
  memory_blank_ticket: STATIC_ART_KEYS.blankTicketMemory,
} as const satisfies Readonly<Record<MemoryId, StaticArtAssetKey>>);

export const ENDING_STATIC_ART_KEYS = Object.freeze({
  ending_last_train: STATIC_ART_KEYS.endingLastTrain,
  ending_first_train: STATIC_ART_KEYS.endingFirstTrain,
  ending_rain_shelter: STATIC_ART_KEYS.endingRainShelter,
} as const satisfies Readonly<Record<EndingId, StaticArtAssetKey>>);

export interface StaticArtDimensions {
  readonly width: number;
  readonly height: number;
}

export interface ProjectOriginalArtLicense {
  readonly id: "project-original";
  readonly attribution: string;
  readonly externalRights: false;
}

export type StaticArtFallback =
  | { readonly kind: "procedural-area"; readonly areaId: AreaId }
  | { readonly kind: "procedural-character"; readonly ownerId: OwnerId }
  | { readonly kind: "procedural-item"; readonly itemId: ItemId }
  | { readonly kind: "css-title" | "css-final-choice" | "css-portrait" | "css-memory" | "css-ending" };

export interface StaticArtSpriteFrame {
  readonly width: number;
  readonly height: number;
  readonly count: number;
}

export type StaticArtKind = "background" | "ui" | "ending" | "memory" | "portrait" | "sprite" | "item";

export interface StaticArtAssetDefinition {
  readonly key: StaticArtAssetKey;
  readonly kind: StaticArtKind;
  /** Relative to Vite's public directory. Never begins with a slash. */
  readonly path: `assets/art-v3/${string}.${"webp" | "png"}`;
  readonly dimensions: StaticArtDimensions;
  readonly budgetBytes: number;
  readonly description: string;
  readonly license: ProjectOriginalArtLicense;
  readonly fallback: StaticArtFallback;
  readonly areaId?: AreaId;
  readonly itemId?: ItemId;
  readonly ownerId?: OwnerId;
  readonly memoryId?: MemoryId;
  readonly endingId?: EndingId;
  readonly role?: "title-key-visual" | "final-choice";
  readonly frame?: StaticArtSpriteFrame;
}

export const PROJECT_ORIGINAL_ART_LICENSE: ProjectOriginalArtLicense = Object.freeze({
  id: "project-original",
  attribution: "Original artwork created for 雨宿り駅の忘れもの",
  externalRights: false,
});

const background = (
  key: StaticArtAssetKey,
  areaId: AreaId,
  path: StaticArtAssetDefinition["path"],
  description: string,
): StaticArtAssetDefinition => ({
  key,
  kind: "background",
  areaId,
  path,
  dimensions: { width: 1920, height: 1080 },
  budgetBytes: 1_500_000,
  description,
  license: PROJECT_ORIGINAL_ART_LICENSE,
  fallback: { kind: "procedural-area", areaId },
});

const sprite = (
  key: StaticArtAssetKey,
  ownerId: OwnerId,
  path: StaticArtAssetDefinition["path"],
  frameCount: number,
  description: string,
): StaticArtAssetDefinition => ({
  key,
  kind: "sprite",
  ownerId,
  path,
  dimensions: { width: 96 * frameCount, height: 112 },
  frame: { width: 96, height: 112, count: frameCount },
  budgetBytes: 250_000,
  description,
  license: PROJECT_ORIGINAL_ART_LICENSE,
  fallback: { kind: "procedural-character", ownerId },
});

const item = (
  key: StaticArtAssetKey,
  itemId: ItemId,
  path: StaticArtAssetDefinition["path"],
): StaticArtAssetDefinition => ({
  key,
  kind: "item",
  itemId,
  path,
  dimensions: { width: 512, height: 512 },
  budgetBytes: 400_000,
  description: `Illustrated lost item ${itemId}`,
  license: PROJECT_ORIGINAL_ART_LICENSE,
  fallback: { kind: "procedural-item", itemId },
});

const portrait = (
  key: StaticArtAssetKey,
  ownerId: OwnerId,
  path: StaticArtAssetDefinition["path"],
  description: string,
): StaticArtAssetDefinition => ({
  key,
  kind: "portrait",
  ownerId,
  path,
  dimensions: { width: 512, height: 640 },
  budgetBytes: 400_000,
  description,
  license: PROJECT_ORIGINAL_ART_LICENSE,
  fallback: { kind: "css-portrait" },
});

const memory = (
  key: StaticArtAssetKey,
  memoryId: MemoryId,
  path: StaticArtAssetDefinition["path"],
): StaticArtAssetDefinition => ({
  key,
  kind: "memory",
  memoryId,
  path,
  dimensions: { width: 1120, height: 630 },
  budgetBytes: 1_000_000,
  description: `Memory illustration ${memoryId}`,
  license: PROJECT_ORIGINAL_ART_LICENSE,
  fallback: { kind: "css-memory" },
});

export const STATIC_ART_MANIFEST: readonly StaticArtAssetDefinition[] = Object.freeze([
  background(STATIC_ART_KEYS.waitingRoomBackground, "area_waiting_room", "assets/art-v3/backgrounds/waiting-room.webp", "Rain-lit waiting room"),
  background(STATIC_ART_KEYS.concourseBackground, "area_concourse", "assets/art-v3/backgrounds/concourse.webp", "Unmanned station concourse"),
  background(STATIC_ART_KEYS.stationOfficeBackground, "area_station_office", "assets/art-v3/backgrounds/station-office.webp", "Quiet station office"),
  background(STATIC_ART_KEYS.footbridgeBackground, "area_footbridge", "assets/art-v3/backgrounds/footbridge.webp", "Rainy station footbridge"),
  background(STATIC_ART_KEYS.rainPlatformNightBackground, "area_rain_platform", "assets/art-v3/backgrounds/rain-platform-night.webp", "Rain platform at night"),
  background(STATIC_ART_KEYS.rainPlatformLastTrainBackground, "area_rain_platform", "assets/art-v3/backgrounds/rain-platform-last-train.webp", "Last train arriving in rain"),
  background(STATIC_ART_KEYS.rainPlatformDawnBackground, "area_rain_platform", "assets/art-v3/backgrounds/rain-platform-dawn.webp", "First train platform at dawn"),
  {
    key: STATIC_ART_KEYS.titleKeyVisual,
    kind: "ui",
    role: "title-key-visual",
    path: "assets/art-v3/ui/title-key-visual.webp",
    dimensions: { width: 1280, height: 720 },
    budgetBytes: 1_000_000,
    description: "Title key visual",
    license: PROJECT_ORIGINAL_ART_LICENSE,
    fallback: { kind: "css-title" },
  },
  {
    key: STATIC_ART_KEYS.finalChoiceVisual,
    kind: "ui",
    role: "final-choice",
    path: "assets/art-v3/ui/final-choice.webp",
    dimensions: { width: 1280, height: 720 },
    budgetBytes: 1_000_000,
    description: "Final route choice visual",
    license: PROJECT_ORIGINAL_ART_LICENSE,
    fallback: { kind: "css-final-choice" },
  },
  ...([
    [STATIC_ART_KEYS.endingLastTrain, "ending_last_train", "last-train"],
    [STATIC_ART_KEYS.endingFirstTrain, "ending_first_train", "first-train"],
    [STATIC_ART_KEYS.endingRainShelter, "ending_rain_shelter", "rain-shelter"],
  ] as const).map(([key, endingId, filename]): StaticArtAssetDefinition => ({
    key,
    kind: "ending",
    endingId,
    path: `assets/art-v3/endings/${filename}.webp`,
    dimensions: { width: 1280, height: 720 },
    budgetBytes: 1_000_000,
    description: `Ending illustration ${endingId}`,
    license: PROJECT_ORIGINAL_ART_LICENSE,
    fallback: { kind: "css-ending" },
  })),
  sprite(STATIC_ART_KEYS.nagiIdleDown, "owner_nagi", "assets/art-v3/characters/nagi-idle-down.png", 3, "Nagi idle down"),
  sprite(STATIC_ART_KEYS.nagiIdleUp, "owner_nagi", "assets/art-v3/characters/nagi-idle-up.png", 3, "Nagi idle up"),
  sprite(STATIC_ART_KEYS.nagiIdleLeft, "owner_nagi", "assets/art-v3/characters/nagi-idle-left.png", 3, "Nagi idle left"),
  sprite(STATIC_ART_KEYS.nagiIdleRight, "owner_nagi", "assets/art-v3/characters/nagi-idle-right.png", 3, "Nagi idle right"),
  sprite(STATIC_ART_KEYS.nagiWalkDown, "owner_nagi", "assets/art-v3/characters/nagi-walk-down.png", 6, "Nagi walk down"),
  sprite(STATIC_ART_KEYS.nagiWalkUp, "owner_nagi", "assets/art-v3/characters/nagi-walk-up.png", 6, "Nagi walk up"),
  sprite(STATIC_ART_KEYS.nagiWalkLeft, "owner_nagi", "assets/art-v3/characters/nagi-walk-left.png", 6, "Nagi walk left"),
  sprite(STATIC_ART_KEYS.nagiWalkRight, "owner_nagi", "assets/art-v3/characters/nagi-walk-right.png", 6, "Nagi walk right"),
  sprite(STATIC_ART_KEYS.nagiInspectDown, "owner_nagi", "assets/art-v3/characters/nagi-inspect-down.png", 4, "Nagi inspect action"),
  sprite(STATIC_ART_KEYS.nagiAcquireDown, "owner_nagi", "assets/art-v3/characters/nagi-acquire-down.png", 5, "Nagi acquire action"),
  sprite(STATIC_ART_KEYS.stationAttendantIdle, "owner_station_attendant", "assets/art-v3/characters/station-attendant-idle.png", 3, "Station attendant idle"),
  sprite(STATIC_ART_KEYS.redBootsChildIdle, "owner_red_boots_child", "assets/art-v3/characters/red-boots-child-idle.png", 3, "Red boots child idle"),
  sprite(STATIC_ART_KEYS.navyBagCommuterIdle, "owner_navy_bag_commuter", "assets/art-v3/characters/navy-bag-commuter-idle.png", 3, "Navy bag commuter idle"),
  sprite(STATIC_ART_KEYS.oldListenerIdle, "owner_old_listener", "assets/art-v3/characters/old-listener-idle.png", 3, "Old listener idle"),
  sprite(STATIC_ART_KEYS.ginkgoStudentIdle, "owner_ginkgo_student", "assets/art-v3/characters/ginkgo-student-idle.png", 3, "Ginkgo student idle"),
  sprite(STATIC_ART_KEYS.crescentYouthIdle, "owner_crescent_youth", "assets/art-v3/characters/crescent-youth-idle.png", 3, "Crescent youth idle"),
  item(STATIC_ART_KEYS.redUmbrellaItem, "item_red_umbrella", "assets/art-v3/items/red-umbrella.png"),
  item(STATIC_ART_KEYS.starBentoItem, "item_star_bento", "assets/art-v3/items/star-bento.png"),
  item(STATIC_ART_KEYS.cassettePlayerItem, "item_cassette_player", "assets/art-v3/items/cassette-player.png"),
  item(STATIC_ART_KEYS.silverHairclipItem, "item_silver_hairclip", "assets/art-v3/items/silver-hairclip.png"),
  item(STATIC_ART_KEYS.fadedPhotoItem, "item_faded_photo_sticker", "assets/art-v3/items/faded-photo-sticker.png"),
  item(STATIC_ART_KEYS.blankTicketItem, "item_blank_ticket", "assets/art-v3/items/blank-ticket.png"),
  portrait(STATIC_ART_KEYS.nagiNormalPortrait, "owner_nagi", "assets/art-v3/portraits/nagi-normal.webp", "Nagi normal portrait"),
  portrait(STATIC_ART_KEYS.nagiAnxiousPortrait, "owner_nagi", "assets/art-v3/portraits/nagi-anxious.webp", "Nagi anxious portrait"),
  portrait(STATIC_ART_KEYS.nagiSurprisedPortrait, "owner_nagi", "assets/art-v3/portraits/nagi-surprised.webp", "Nagi surprised portrait"),
  portrait(STATIC_ART_KEYS.nagiRememberingPortrait, "owner_nagi", "assets/art-v3/portraits/nagi-remembering.webp", "Nagi remembering portrait"),
  portrait(STATIC_ART_KEYS.nagiRelievedPortrait, "owner_nagi", "assets/art-v3/portraits/nagi-relieved.webp", "Nagi relieved portrait"),
  portrait(STATIC_ART_KEYS.stationAttendantNormalPortrait, "owner_station_attendant", "assets/art-v3/portraits/station-attendant-normal.webp", "Station attendant normal portrait"),
  portrait(STATIC_ART_KEYS.stationAttendantReleasedPortrait, "owner_station_attendant", "assets/art-v3/portraits/station-attendant-released.webp", "Station attendant released portrait"),
  portrait(STATIC_ART_KEYS.redBootsChildNormalPortrait, "owner_red_boots_child", "assets/art-v3/portraits/red-boots-child-normal.webp", "Red boots child normal portrait"),
  portrait(STATIC_ART_KEYS.redBootsChildReleasedPortrait, "owner_red_boots_child", "assets/art-v3/portraits/red-boots-child-released.webp", "Red boots child released portrait"),
  portrait(STATIC_ART_KEYS.navyBagCommuterNormalPortrait, "owner_navy_bag_commuter", "assets/art-v3/portraits/navy-bag-commuter-normal.webp", "Navy bag commuter normal portrait"),
  portrait(STATIC_ART_KEYS.navyBagCommuterReleasedPortrait, "owner_navy_bag_commuter", "assets/art-v3/portraits/navy-bag-commuter-released.webp", "Navy bag commuter released portrait"),
  portrait(STATIC_ART_KEYS.oldListenerNormalPortrait, "owner_old_listener", "assets/art-v3/portraits/old-listener-normal.webp", "Old listener normal portrait"),
  portrait(STATIC_ART_KEYS.oldListenerReleasedPortrait, "owner_old_listener", "assets/art-v3/portraits/old-listener-released.webp", "Old listener released portrait"),
  portrait(STATIC_ART_KEYS.ginkgoStudentNormalPortrait, "owner_ginkgo_student", "assets/art-v3/portraits/ginkgo-student-normal.webp", "Ginkgo student normal portrait"),
  portrait(STATIC_ART_KEYS.ginkgoStudentReleasedPortrait, "owner_ginkgo_student", "assets/art-v3/portraits/ginkgo-student-released.webp", "Ginkgo student released portrait"),
  portrait(STATIC_ART_KEYS.crescentYouthNormalPortrait, "owner_crescent_youth", "assets/art-v3/portraits/crescent-youth-normal.webp", "Crescent youth normal portrait"),
  portrait(STATIC_ART_KEYS.crescentYouthReleasedPortrait, "owner_crescent_youth", "assets/art-v3/portraits/crescent-youth-released.webp", "Crescent youth released portrait"),
  memory(STATIC_ART_KEYS.redUmbrellaMemory, "memory_red_umbrella", "assets/art-v3/memories/red-umbrella.webp"),
  memory(STATIC_ART_KEYS.starBentoMemory, "memory_star_bento", "assets/art-v3/memories/star-bento.webp"),
  memory(STATIC_ART_KEYS.cassettePlayerMemory, "memory_cassette_player", "assets/art-v3/memories/cassette-player.webp"),
  memory(STATIC_ART_KEYS.silverHairclipMemory, "memory_silver_hairclip", "assets/art-v3/memories/silver-hairclip.webp"),
  memory(STATIC_ART_KEYS.fadedPhotoMemory, "memory_faded_photo", "assets/art-v3/memories/faded-photo.webp"),
  memory(STATIC_ART_KEYS.blankTicketMemory, "memory_blank_ticket", "assets/art-v3/memories/blank-ticket.webp"),
]);

const STATIC_ART_BY_KEY: ReadonlyMap<StaticArtAssetKey, StaticArtAssetDefinition> =
  new Map(STATIC_ART_MANIFEST.map((asset) => [asset.key, asset]));

export interface StaticArtManifestValidation {
  readonly valid: boolean;
  readonly duplicateKeys: readonly StaticArtAssetKey[];
  readonly duplicatePaths: readonly string[];
  readonly invalidKeys: readonly StaticArtAssetKey[];
}

export function validateStaticArtManifest(
  manifest: readonly StaticArtAssetDefinition[] = STATIC_ART_MANIFEST,
): StaticArtManifestValidation {
  const keyCounts = new Map<StaticArtAssetKey, number>();
  const pathCounts = new Map<string, number>();
  const invalidKeys: StaticArtAssetKey[] = [];

  for (const asset of manifest) {
    keyCounts.set(asset.key, (keyCounts.get(asset.key) ?? 0) + 1);
    pathCounts.set(asset.path, (pathCounts.get(asset.path) ?? 0) + 1);
    const frameIsInvalid = asset.frame !== undefined && (
      !Number.isInteger(asset.frame.width)
      || !Number.isInteger(asset.frame.height)
      || !Number.isInteger(asset.frame.count)
      || asset.frame.width * asset.frame.count !== asset.dimensions.width
      || asset.frame.height !== asset.dimensions.height
    );
    if (
      !isSafePublicAssetPath(asset.path)
      || !Number.isInteger(asset.dimensions.width)
      || !Number.isInteger(asset.dimensions.height)
      || asset.dimensions.width <= 0
      || asset.dimensions.height <= 0
      || !Number.isInteger(asset.budgetBytes)
      || asset.budgetBytes <= 0
      || asset.license.id !== "project-original"
      || asset.license.externalRights !== false
      || frameIsInvalid
    ) {
      invalidKeys.push(asset.key);
    }
  }

  const duplicateKeys = [...keyCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);
  const duplicatePaths = [...pathCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([path]) => path);

  return {
    valid: duplicateKeys.length === 0
      && duplicatePaths.length === 0
      && invalidKeys.length === 0,
    duplicateKeys,
    duplicatePaths,
    invalidKeys,
  };
}

export function getStaticArtAsset(key: StaticArtAssetKey): StaticArtAssetDefinition {
  const asset = STATIC_ART_BY_KEY.get(key);
  if (!asset) throw new Error(`Unknown static art key: ${key}`);
  return asset;
}

export function getStaticArtAssetUrl(
  key: StaticArtAssetKey,
  baseUrl?: string,
): string {
  return resolvePublicAssetUrl(getStaticArtAsset(key).path, baseUrl);
}
