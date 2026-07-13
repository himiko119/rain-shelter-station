import { describe, expect, it } from "vitest";

import {
  AREA_DEFINITIONS,
  CLUE_DEFINITIONS,
  DIALOGUES,
  ENDING_DEFINITIONS,
  LOST_ITEM_DEFINITIONS,
  MEMORY_DEFINITIONS,
  OWNER_DEFINITIONS,
  STORY_OBJECTIVES,
  getArea,
  getCurrentItem,
  getItem,
} from "../../src/game/content";
import type { ItemId } from "../../src/game/core";

function expectUnique(values: readonly string[]): void {
  expect(new Set(values).size).toBe(values.length);
}

function reachableAreasAtStage(stage: number): ReadonlySet<string> {
  const availableAreaIds = new Set(
    AREA_DEFINITIONS.filter(
      (area) => area.availableFromStage <= stage,
    ).map((area) => area.id),
  );
  const reached = new Set<string>(["area_waiting_room"]);
  const queue = ["area_waiting_room"];

  let areaId = queue.shift();
  while (areaId !== undefined) {
    const area = AREA_DEFINITIONS.find((candidate) => candidate.id === areaId);
    if (area !== undefined) {
      for (const exit of area.exits) {
        if (
          exit.availableFromStage <= stage &&
          availableAreaIds.has(exit.targetAreaId) &&
          !reached.has(exit.targetAreaId)
        ) {
          reached.add(exit.targetAreaId);
          queue.push(exit.targetAreaId);
        }
      }
    }
    areaId = queue.shift();
  }

  return reached;
}

describe("content integrity", () => {
  it("ships five areas, six ordered items, at least two clues each, and three endings", () => {
    expect(AREA_DEFINITIONS).toHaveLength(5);
    expect(LOST_ITEM_DEFINITIONS).toHaveLength(6);
    expect(ENDING_DEFINITIONS).toHaveLength(3);
    expect(MEMORY_DEFINITIONS).toHaveLength(6);
    expect(STORY_OBJECTIVES).toHaveLength(7);

    expectUnique(AREA_DEFINITIONS.map((area) => area.id));
    expectUnique(LOST_ITEM_DEFINITIONS.map((item) => item.id));
    expectUnique(CLUE_DEFINITIONS.map((clue) => clue.id));
    expectUnique(MEMORY_DEFINITIONS.map((memory) => memory.id));
    expectUnique(OWNER_DEFINITIONS.map((owner) => owner.id));
    expectUnique(ENDING_DEFINITIONS.map((ending) => ending.id));
    expectUnique(
      AREA_DEFINITIONS.flatMap((area) =>
        area.hotspots.map((hotspot) => hotspot.id),
      ),
    );

    for (const item of LOST_ITEM_DEFINITIONS) {
      expect(item.clueIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("connects every item to its clues, owner, memory, and dialogue content", () => {
    for (const item of LOST_ITEM_DEFINITIONS) {
      expect(getItem(item.id)).toBe(item);
      expect(
        CLUE_DEFINITIONS.filter((clue) => clue.itemId === item.id).map(
          (clue) => clue.id,
        ),
      ).toEqual(expect.arrayContaining([...item.clueIds]));

      for (const clueId of item.clueIds) {
        const clue = CLUE_DEFINITIONS.find((candidate) => candidate.id === clueId);
        expect(clue).toBeDefined();
        expect(clue?.itemId).toBe(item.id);
      }

      const owner = OWNER_DEFINITIONS.find(
        (candidate) => candidate.id === item.ownerId,
      );
      expect(owner).toBeDefined();
      const memory = MEMORY_DEFINITIONS.find(
        (candidate) => candidate.id === item.memoryId,
      );
      expect(memory?.itemId).toBe(item.id);

      for (const dialogId of [
        item.correctDialogId,
        ...item.wrongDialogIds,
        ...item.hintDialogIds,
      ]) {
        expect(DIALOGUES[dialogId], `missing dialogue ${dialogId}`).toBeDefined();
      }
    }
  });

  it("places every clue and owner on a matching hotspot", () => {
    for (const clue of CLUE_DEFINITIONS) {
      const area = getArea(clue.areaId);
      const hotspot = area.hotspots.find(
        (candidate) => candidate.id === clue.hotspotId,
      );
      expect(hotspot, `missing clue hotspot ${clue.hotspotId}`).toBeDefined();
      expect(hotspot?.clueId).toBe(clue.id);
    }

    for (const owner of OWNER_DEFINITIONS) {
      const area = getArea(owner.areaId);
      const hotspot = area.hotspots.find(
        (candidate) => candidate.id === owner.hotspotId,
      );
      expect(hotspot, `missing owner hotspot ${owner.hotspotId}`).toBeDefined();
      expect(hotspot?.ownerId).toBe(owner.id);
      expect(DIALOGUES[owner.ambientDialogId]).toBeDefined();
      expect(DIALOGUES[owner.returnedDialogId]).toBeDefined();
    }
  });

  it("makes every ordered spawn available and reachable at its story stage", () => {
    LOST_ITEM_DEFINITIONS.forEach((item, index) => {
      const earlierItemIds = LOST_ITEM_DEFINITIONS.slice(0, index).map(
        (candidate) => candidate.id,
      );
      const area = getArea(item.spawn.areaId);
      const hotspot = area.hotspots.find(
        (candidate) => candidate.id === item.spawn.hotspotId,
      );

      expect(item.stage).toBe(index);
      expect(item.spawn.availableFromStage).toBe(item.stage);
      expect(item.spawn.requiresReturnedItemIds).toEqual(earlierItemIds);
      expect(area.availableFromStage).toBeLessThanOrEqual(item.stage);
      expect(reachableAreasAtStage(item.stage).has(item.spawn.areaId)).toBe(true);

      expect(hotspot, `missing item hotspot ${item.spawn.hotspotId}`).toBeDefined();
      expect(hotspot?.kind).toBe("item");
      expect(hotspot?.itemId).toBe(item.id);
      expect(hotspot?.availability.availableFromStage).toBeLessThanOrEqual(
        item.stage,
      );
      expect(
        hotspot?.availability.requiresReturnedItemIds?.every((requiredId) =>
          earlierItemIds.includes(requiredId),
        ) ?? true,
      ).toBe(true);

      expect(item.spawn.position.x).toBeGreaterThanOrEqual(
        area.world.safeBounds.x,
      );
      expect(item.spawn.position.x).toBeLessThanOrEqual(
        area.world.safeBounds.x + area.world.safeBounds.width,
      );
      expect(item.spawn.position.y).toBeGreaterThanOrEqual(
        area.world.safeBounds.y,
      );
      expect(item.spawn.position.y).toBeLessThanOrEqual(
        area.world.safeBounds.y + area.world.safeBounds.height,
      );
      expect(hotspot?.position.x).toBeGreaterThanOrEqual(
        area.world.safeBounds.x,
      );
      expect(hotspot?.position.x).toBeLessThanOrEqual(
        area.world.safeBounds.x + area.world.safeBounds.width,
      );
      expect(hotspot?.position.y).toBeGreaterThanOrEqual(
        area.world.safeBounds.y,
      );
      expect(hotspot?.position.y).toBeLessThanOrEqual(
        area.world.safeBounds.y + area.world.safeBounds.height,
      );

      for (const obstacle of area.obstacles) {
        const inside =
          hotspot !== undefined &&
          hotspot.position.x >= obstacle.bounds.x &&
          hotspot.position.x <= obstacle.bounds.x + obstacle.bounds.width &&
          hotspot.position.y >= obstacle.bounds.y &&
          hotspot.position.y <= obstacle.bounds.y + obstacle.bounds.height;
        if (!inside || hotspot === undefined) {
          continue;
        }
        const nearestEdge = Math.min(
          hotspot.position.x - obstacle.bounds.x,
          obstacle.bounds.x + obstacle.bounds.width - hotspot.position.x,
          hotspot.position.y - obstacle.bounds.y,
          obstacle.bounds.y + obstacle.bounds.height - hotspot.position.y,
        );
        expect(
          hotspot.radius,
          `${item.id} interaction radius cannot escape ${obstacle.id}`,
        ).toBeGreaterThan(nearestEdge);
      }
    });
  });

  it("keeps exits valid and all stage-available areas connected from the start", () => {
    for (const area of AREA_DEFINITIONS) {
      for (const exit of area.exits) {
        const target = getArea(exit.targetAreaId);
        expect(exit.availableFromStage).toBeGreaterThanOrEqual(
          target.availableFromStage,
        );
        expect(exit.targetPosition.x).toBeGreaterThanOrEqual(0);
        expect(exit.targetPosition.x).toBeLessThanOrEqual(target.world.width);
        expect(exit.targetPosition.y).toBeGreaterThanOrEqual(0);
        expect(exit.targetPosition.y).toBeLessThanOrEqual(target.world.height);
      }
    }

    for (let stage = 0; stage <= 6; stage += 1) {
      const expectedAreaIds = AREA_DEFINITIONS.filter(
        (area) => area.availableFromStage <= stage,
      ).map((area) => area.id);
      expect([...reachableAreasAtStage(stage)]).toEqual(
        expect.arrayContaining(expectedAreaIds),
      );
    }
  });

  it("resolves the current item through every ordered progress prefix", () => {
    const returnedItemIds: ItemId[] = [];
    for (const item of LOST_ITEM_DEFINITIONS) {
      expect(getCurrentItem(returnedItemIds)).toBe(item);
      returnedItemIds.push(item.id);
    }
    expect(getCurrentItem(returnedItemIds)).toBeNull();
  });
});
