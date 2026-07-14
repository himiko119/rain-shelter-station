import { describe, expect, it } from "vitest";

import type { Facing, ItemId, OwnerId } from "../../src/game/core/types";
import {
  ITEM_TEXTURE_KEYS,
  NAGI_SPRITE_FRAME_COUNTS,
  NAGI_SPRITE_TEXTURE_KEYS,
  PASSENGER_SPRITE_TEXTURE_KEYS,
  getNagiLocomotionTextureKey,
} from "../../src/phaser/view/ArtV3TextureKeys";

describe("Phaser art-v3 texture keys", () => {
  it("maps every locomotion direction without mirroring generated art", () => {
    const facings: readonly Facing[] = ["down", "up", "left", "right"];
    for (const facing of facings) {
      expect(getNagiLocomotionTextureKey(facing, false))
        .toBe(NAGI_SPRITE_TEXTURE_KEYS.idle[facing]);
      expect(getNagiLocomotionTextureKey(facing, true))
        .toBe(NAGI_SPRITE_TEXTURE_KEYS.walk[facing]);
    }
    expect(new Set(Object.values(NAGI_SPRITE_TEXTURE_KEYS.idle))).toHaveLength(4);
    expect(new Set(Object.values(NAGI_SPRITE_TEXTURE_KEYS.walk))).toHaveLength(4);
  });

  it("declares the normalized strip frame counts", () => {
    expect(NAGI_SPRITE_FRAME_COUNTS).toEqual({
      idle: 3,
      walk: 6,
      inspect: 4,
      acquire: 5,
    });
  });

  it("maps every lost item and every non-player passenger to stable IDs", () => {
    const itemIds: readonly ItemId[] = [
      "item_red_umbrella",
      "item_star_bento",
      "item_cassette_player",
      "item_silver_hairclip",
      "item_faded_photo_sticker",
      "item_blank_ticket",
    ];
    const passengerIds: readonly OwnerId[] = [
      "owner_station_attendant",
      "owner_red_boots_child",
      "owner_navy_bag_commuter",
      "owner_old_listener",
      "owner_ginkgo_student",
      "owner_crescent_youth",
    ];

    expect(Object.keys(ITEM_TEXTURE_KEYS)).toEqual(itemIds);
    for (const itemId of itemIds) {
      expect(ITEM_TEXTURE_KEYS[itemId]).toMatch(/^art-v3\.item\./u);
    }
    expect(Object.keys(PASSENGER_SPRITE_TEXTURE_KEYS)).toEqual(passengerIds);
    expect(PASSENGER_SPRITE_TEXTURE_KEYS.owner_nagi).toBeUndefined();
  });
});
