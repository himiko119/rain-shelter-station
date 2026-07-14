import {
  AREA_DEFINITIONS,
  LOST_ITEM_DEFINITIONS,
  OWNER_DEFINITIONS,
} from "../content";
import type { OwnerDefinition } from "../content/types";
import type { AreaId, ItemId, OwnerId } from "../core/types";

export type HexColor = `#${string}`;
export type VisualAssetKind = "area" | "character" | "item" | "ui" | "fx";
export type VisualSource = "phaser-graphics" | "dom-css" | "phaser-graphics+dom-css";

export type ManifestCharacterId = Exclude<
  OwnerId,
  "owner_station_attendant"
>;

export const AREA_VISUAL_KEYS = {
  area_waiting_room: "area.waiting-room",
  area_concourse: "area.concourse",
  area_station_office: "area.station-office",
  area_footbridge: "area.footbridge",
  area_rain_platform: "area.rain-platform",
} as const satisfies Readonly<Record<AreaId, string>>;

export const CHARACTER_VISUAL_KEYS = {
  owner_nagi: "character.nagi",
  owner_red_boots_child: "character.red-boots-child",
  owner_navy_bag_commuter: "character.navy-bag-commuter",
  owner_old_listener: "character.old-listener",
  owner_ginkgo_student: "character.ginkgo-student",
  owner_crescent_youth: "character.crescent-youth",
} as const satisfies Readonly<Record<ManifestCharacterId, string>>;

export const ITEM_VISUAL_KEYS = {
  item_red_umbrella: "item.red-umbrella",
  item_star_bento: "item.star-bento",
  item_cassette_player: "item.cassette-player",
  item_silver_hairclip: "item.silver-hairclip",
  item_faded_photo_sticker: "item.faded-photo-sticker",
  item_blank_ticket: "item.blank-ticket",
} as const satisfies Readonly<Record<ItemId, string>>;

export const UI_VISUAL_KEYS = {
  dialoguePortrait: "ui.dialogue.portrait",
  notebookEvidence: "ui.notebook.evidence",
  inventoryItem: "ui.inventory.item",
  hotspotMarker: "ui.hotspot.marker",
  touchAction: "ui.touch.action",
  finalChoiceRoute: "ui.final-choice.route",
} as const;

export const FX_VISUAL_KEYS = {
  windowRain: "fx.rain.window",
  platformRain: "fx.rain.platform",
  lampGlow: "fx.lamp.glow",
  wetReflection: "fx.wet-reflection",
  memoryBloom: "fx.memory.bloom",
} as const;

export type AreaVisualKey = (typeof AREA_VISUAL_KEYS)[AreaId];
export type CharacterVisualKey =
  (typeof CHARACTER_VISUAL_KEYS)[ManifestCharacterId];
export type ItemVisualKey = (typeof ITEM_VISUAL_KEYS)[ItemId];
export type UiVisualKey =
  (typeof UI_VISUAL_KEYS)[keyof typeof UI_VISUAL_KEYS];
export type FxVisualKey =
  (typeof FX_VISUAL_KEYS)[keyof typeof FX_VISUAL_KEYS];
export type VisualAssetKey =
  | AreaVisualKey
  | CharacterVisualKey
  | ItemVisualKey
  | UiVisualKey
  | FxVisualKey;

export interface VisualColors {
  readonly primary: HexColor;
  readonly secondary: HexColor;
  readonly accent?: HexColor;
  readonly shadow?: HexColor;
}

export interface VisualLicense {
  readonly id: "original-procedural";
  readonly attribution: string;
  readonly externalRights: false;
}

interface VisualAssetBase {
  readonly description: string;
  readonly colors: VisualColors;
  readonly procedural: true;
  readonly source: VisualSource;
  readonly license: VisualLicense;
}

export interface AreaVisualAsset extends VisualAssetBase {
  readonly key: AreaVisualKey;
  readonly kind: "area";
  readonly contentId: AreaId;
}

export interface CharacterVisualAsset extends VisualAssetBase {
  readonly key: CharacterVisualKey;
  readonly kind: "character";
  readonly contentId: ManifestCharacterId;
}

export interface ItemVisualAsset extends VisualAssetBase {
  readonly key: ItemVisualKey;
  readonly kind: "item";
  readonly contentId: ItemId;
}

export interface UiVisualAsset extends VisualAssetBase {
  readonly key: UiVisualKey;
  readonly kind: "ui";
}

export interface FxVisualAsset extends VisualAssetBase {
  readonly key: FxVisualKey;
  readonly kind: "fx";
}

export type VisualAssetDefinition =
  | AreaVisualAsset
  | CharacterVisualAsset
  | ItemVisualAsset
  | UiVisualAsset
  | FxVisualAsset;

export const ORIGINAL_PROCEDURAL_LICENSE: VisualLicense = Object.freeze({
  id: "original-procedural",
  attribution: "Original procedural artwork for 雨宿り駅の忘れもの",
  externalRights: false,
});

function requireHexColor(value: string): HexColor {
  if (!/^#[0-9a-f]{6}$/iu.test(value)) {
    throw new Error(`Invalid visual manifest color: ${value}`);
  }
  return value as HexColor;
}

function isManifestCharacter(
  owner: OwnerDefinition,
): owner is OwnerDefinition & { readonly id: ManifestCharacterId } {
  return owner.id !== "owner_station_attendant";
}

const areaEntries: readonly AreaVisualAsset[] = AREA_DEFINITIONS.map((area) => ({
  key: AREA_VISUAL_KEYS[area.id],
  kind: "area",
  contentId: area.id,
  description: `${area.name}の背景・設備・床材`,
  colors: {
    primary: requireHexColor(area.palette.floor),
    secondary: requireHexColor(area.palette.wall),
    accent: requireHexColor(area.palette.light),
    shadow: requireHexColor(area.palette.shadow),
  },
  procedural: true,
  source: "phaser-graphics",
  license: ORIGINAL_PROCEDURAL_LICENSE,
}));

const characterEntries: readonly CharacterVisualAsset[] = OWNER_DEFINITIONS
  .filter(isManifestCharacter)
  .map((owner) => ({
    key: CHARACTER_VISUAL_KEYS[owner.id],
    kind: "character",
    contentId: owner.id,
    description: `${owner.name}：${owner.visual.accessory}`,
    colors: {
      primary: requireHexColor(owner.visual.silhouetteColor),
      secondary: requireHexColor(owner.visual.accentColor),
      shadow: "#071326",
    },
    procedural: true,
    source: "phaser-graphics",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  }));

const itemEntries: readonly ItemVisualAsset[] = LOST_ITEM_DEFINITIONS.map((item) => ({
  key: ITEM_VISUAL_KEYS[item.id],
  kind: "item",
  contentId: item.id,
  description: `${item.name}（${item.visual.shape}）`,
  colors: {
    primary: requireHexColor(item.visual.primaryColor),
    secondary: requireHexColor(item.visual.secondaryColor),
    shadow: "#071326",
  },
  procedural: true,
  source: "phaser-graphics",
  license: ORIGINAL_PROCEDURAL_LICENSE,
}));

const uiEntries = [
  {
    key: UI_VISUAL_KEYS.dialoguePortrait,
    kind: "ui",
    description: "話者固有の会話肖像と話者札",
    colors: { primary: "#0b1a2b", secondary: "#f5e3ad", accent: "#78a9c7", shadow: "#040a16" },
    procedural: true,
    source: "dom-css",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: UI_VISUAL_KEYS.notebookEvidence,
    kind: "ui",
    description: "ノートの証拠スケッチと関連印",
    colors: { primary: "#f4ecd8", secondary: "#375d64", accent: "#b79861", shadow: "#4a463d" },
    procedural: true,
    source: "dom-css",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: UI_VISUAL_KEYS.inventoryItem,
    kind: "ui",
    description: "所持品カードの品物サムネイル",
    colors: { primary: "#0d2034", secondary: "#eacb7d", accent: "#a4d4d4", shadow: "#040a16" },
    procedural: true,
    source: "phaser-graphics+dom-css",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: UI_VISUAL_KEYS.hotspotMarker,
    kind: "ui",
    description: "探索種別ごとの接近マーカー",
    colors: { primary: "#eacb7d", secondary: "#8bcdd0", accent: "#eea07e", shadow: "#071326" },
    procedural: true,
    source: "phaser-graphics",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: UI_VISUAL_KEYS.touchAction,
    kind: "ui",
    description: "タッチ操作の方向・調査・メニュー記号",
    colors: { primary: "#061321", secondary: "#eacb7d", accent: "#dcebea", shadow: "#040a16" },
    procedural: true,
    source: "dom-css",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: UI_VISUAL_KEYS.finalChoiceRoute,
    kind: "ui",
    description: "最後の選択に表示する二方向の路線図",
    colors: { primary: "#071326", secondary: "#e6c98a", accent: "#71869f", shadow: "#040a16" },
    procedural: true,
    source: "dom-css",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
] as const satisfies readonly UiVisualAsset[];

const fxEntries = [
  {
    key: FX_VISUAL_KEYS.windowRain,
    kind: "fx",
    description: "窓面内へマスクする屋内の雨筋",
    colors: { primary: "#78a6bd", secondary: "#a4d4d4", shadow: "#071326" },
    procedural: true,
    source: "phaser-graphics",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: FX_VISUAL_KEYS.platformRain,
    kind: "fx",
    description: "ホームの遠景・中景・手前に分けた雨",
    colors: { primary: "#82b4ca", secondary: "#b8d9df", shadow: "#071326" },
    procedural: true,
    source: "phaser-graphics",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: FX_VISUAL_KEYS.lampGlow,
    kind: "fx",
    description: "駅灯の面光源と床面の暖色光",
    colors: { primary: "#f0d58d", secondary: "#d0ad65", shadow: "#071326" },
    procedural: true,
    source: "phaser-graphics",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: FX_VISUAL_KEYS.wetReflection,
    kind: "fx",
    description: "濡れた床と水たまりの縦方向反射",
    colors: { primary: "#507b8e", secondary: "#9bc0cc", accent: "#eacb7d", shadow: "#071326" },
    procedural: true,
    source: "phaser-graphics",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
  {
    key: FX_VISUAL_KEYS.memoryBloom,
    kind: "fx",
    description: "返却後の記憶を包む色面と光彩",
    colors: { primary: "#ed9b79", secondary: "#e6c98a", accent: "#8fb2c6", shadow: "#191926" },
    procedural: true,
    source: "phaser-graphics+dom-css",
    license: ORIGINAL_PROCEDURAL_LICENSE,
  },
] as const satisfies readonly FxVisualAsset[];

function valuesOf<const T extends Readonly<Record<string, string>>>(
  record: T,
): readonly T[keyof T][] {
  return Object.values(record) as T[keyof T][];
}

export const REQUIRED_VISUAL_KEYS: readonly VisualAssetKey[] = Object.freeze([
  ...valuesOf(AREA_VISUAL_KEYS),
  ...valuesOf(CHARACTER_VISUAL_KEYS),
  ...valuesOf(ITEM_VISUAL_KEYS),
  ...valuesOf(UI_VISUAL_KEYS),
  ...valuesOf(FX_VISUAL_KEYS),
]);

export const VISUAL_MANIFEST: readonly VisualAssetDefinition[] = Object.freeze([
  ...areaEntries,
  ...characterEntries,
  ...itemEntries,
  ...uiEntries,
  ...fxEntries,
]);

export interface VisualManifestValidation {
  readonly valid: boolean;
  readonly missingKeys: readonly VisualAssetKey[];
  readonly duplicateKeys: readonly VisualAssetKey[];
}

export function validateRequiredVisualKeys(
  manifest: readonly VisualAssetDefinition[] = VISUAL_MANIFEST,
): VisualManifestValidation {
  const counts = new Map<VisualAssetKey, number>();
  for (const entry of manifest) {
    counts.set(entry.key, (counts.get(entry.key) ?? 0) + 1);
  }

  const missingKeys = REQUIRED_VISUAL_KEYS.filter((key) => !counts.has(key));
  const duplicateKeys = [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key);

  return {
    valid: missingKeys.length === 0 && duplicateKeys.length === 0,
    missingKeys,
    duplicateKeys,
  };
}

export function getVisualAsset(key: VisualAssetKey): VisualAssetDefinition {
  const asset = VISUAL_MANIFEST.find((entry) => entry.key === key);
  if (!asset) throw new Error(`Unknown visual asset key: ${key}`);
  return asset;
}
