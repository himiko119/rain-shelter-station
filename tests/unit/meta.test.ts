import { describe, expect, it } from "vitest";

import { GAME_META } from "../../src/game/content/meta";

describe("game metadata", () => {
  it("keeps the shipped title, tagline, and save version stable", () => {
    expect(GAME_META.title).toBe("雨宿り駅の忘れもの");
    expect(GAME_META.tagline).toContain("終電");
    expect(GAME_META.storageKey).toContain(`v${GAME_META.saveVersion}`);
  });
});
