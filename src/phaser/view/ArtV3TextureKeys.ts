import {
  ITEM_STATIC_ART_KEYS,
  NAGI_STATIC_ART_KEYS,
  OWNER_STATIC_ART_KEYS,
} from "../../game/assets";
import type { Facing, ItemId, OwnerId } from "../../game/core/types";

/**
 * Stable manifest keys consumed by the Phaser presentation layer.
 *
 * The actual file paths and loader metadata remain owned by the static-art
 * manifest. Keeping the renderer on keys means a deploy base or asset format
 * change cannot leak into gameplay code.
 */
export const NAGI_SPRITE_TEXTURE_KEYS = NAGI_STATIC_ART_KEYS;

export const NAGI_SPRITE_FRAME_COUNTS = Object.freeze({
  idle: 3,
  walk: 6,
  inspect: 4,
  acquire: 5,
} as const);

export const PASSENGER_SPRITE_TEXTURE_KEYS: Readonly<Partial<Record<OwnerId, string>>> = OWNER_STATIC_ART_KEYS;

export const ITEM_TEXTURE_KEYS = ITEM_STATIC_ART_KEYS satisfies Readonly<Record<ItemId, string>>;

export type NagiActionAnimation = "inspect" | "acquire";
export type NagiLocomotionAnimation = "idle" | "walk";

export function getNagiLocomotionTextureKey(
  facing: Facing,
  moving: boolean,
): string {
  return NAGI_SPRITE_TEXTURE_KEYS[moving ? "walk" : "idle"][facing];
}

export function getNagiAnimationKey(
  motion: NagiLocomotionAnimation,
  facing: Facing,
): string {
  return `art-v3.animation.nagi.${motion}.${facing}`;
}

export function getNagiActionAnimationKey(action: NagiActionAnimation): string {
  return `art-v3.animation.nagi.${action}.down`;
}

export function getPassengerIdleAnimationKey(ownerId: OwnerId): string {
  return `art-v3.animation.passenger.${ownerId}.idle`;
}
