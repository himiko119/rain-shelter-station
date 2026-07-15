import type { AreaId, ItemId } from "../core/types";
import { AREA_DEFINITIONS } from "./areas";
import { LOST_ITEM_DEFINITIONS } from "./items";
import type { AreaDefinition, LostItemDefinition } from "./types";

export { AREA_DEFINITIONS } from "./areas";
export * from "./areaArtLayouts";
export { CLUE_DEFINITIONS } from "./clues";
export { DIALOGUES } from "./dialogues";
export { ENDING_DEFINITIONS } from "./endings";
export { LOST_ITEM_DEFINITIONS, STORY_OBJECTIVES } from "./items";
export { MEMORY_DEFINITIONS } from "./memories";
export { OWNER_DEFINITIONS } from "./owners";
export type * from "./types";

export const getArea = (areaId: AreaId): AreaDefinition => {
  const area = AREA_DEFINITIONS.find((candidate) => candidate.id === areaId);
  if (!area) {
    throw new Error(`Unknown area definition: ${areaId}`);
  }
  return area;
};

export const getItem = (itemId: ItemId): LostItemDefinition => {
  const item = LOST_ITEM_DEFINITIONS.find((candidate) => candidate.id === itemId);
  if (!item) {
    throw new Error(`Unknown item definition: ${itemId}`);
  }
  return item;
};

export const getCurrentItem = (
  returnedItemIds: readonly ItemId[],
): LostItemDefinition | null =>
  LOST_ITEM_DEFINITIONS.find((item) => !returnedItemIds.includes(item.id)) ?? null;
