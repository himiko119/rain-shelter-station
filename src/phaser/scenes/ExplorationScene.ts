import Phaser from "phaser";

import {
  getArea,
  getItem,
  type AreaExitDefinition,
  type HotspotDefinition,
} from "../../game/content";
import { selectStage } from "../../game/core";
import type { Facing, GameState, PlayerPosition } from "../../game/core/types";
import type { ActionInput } from "../../game/input";
import { preloadArtV3Textures } from "../view/ArtV3Preloader";
import { resolveCameraLayout } from "../view/CameraLayout";
import { createWorldItemVisual } from "../view/ItemVisual";
import {
  createHotspotMarker,
  createNagi,
  createPassenger,
  paintArea,
  playNagiAction,
  setNagiMotion,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type AreaVisual,
} from "../view/StationView";

export interface ExplorationSceneBridge {
  readonly input: ActionInput;
  readonly getState: () => GameState;
  readonly canAcceptWorldInput: () => boolean;
  readonly onInteract: (hotspot: HotspotDefinition) => void;
  readonly onLockedExit: (exit: AreaExitDefinition) => void;
  readonly onEnterArea: (exit: AreaExitDefinition) => void;
  readonly onPlayerPosition: (position: PlayerPosition) => void;
  readonly onPrompt: (label: string | null) => void;
  readonly onReady: () => void;
}

interface ActiveHotspot {
  readonly definition: HotspotDefinition;
  readonly marker: Phaser.GameObjects.Container | null;
}

const INTERACTION_DISTANCE = 96;
const EXIT_COOLDOWN_MS = 500;

function availabilityMatches(definition: HotspotDefinition, state: GameState, stage: number): boolean {
  const availability = definition.availability;
  if (stage < availability.availableFromStage) return false;
  if (availability.availableUntilStage !== undefined && stage > availability.availableUntilStage) return false;
  if (availability.requiresReturnedItemIds?.some((itemId) => !state.returnedItemIds.includes(itemId))) return false;
  if (availability.requiresInventoryItemIds?.some((itemId) => !state.inventoryItemIds.includes(itemId))) return false;
  if (definition.kind === "item" && definition.itemId) {
    if (state.inventoryItemIds.includes(definition.itemId) || state.returnedItemIds.includes(definition.itemId)) return false;
  }
  return true;
}

function pointInBounds(x: number, y: number, bounds: AreaExitDefinition["bounds"]): boolean {
  return x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
}

function positionInsideRoom(exit: AreaExitDefinition): { x: number; y: number } {
  const margin = 38;
  const centerX = exit.bounds.x + exit.bounds.width / 2;
  const centerY = exit.bounds.y + exit.bounds.height / 2;

  if (exit.bounds.x <= 0) return { x: exit.bounds.x + exit.bounds.width + margin, y: centerY };
  if (exit.bounds.x + exit.bounds.width >= WORLD_WIDTH) return { x: exit.bounds.x - margin, y: centerY };
  if (exit.bounds.y <= 0) return { x: centerX, y: exit.bounds.y + exit.bounds.height + margin };
  if (exit.bounds.y + exit.bounds.height >= WORLD_HEIGHT) return { x: centerX, y: exit.bounds.y - margin };

  return { x: centerX, y: centerY };
}

function facingFromVelocity(x: number, y: number, fallback: Facing): Facing {
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? "left" : "right";
  if (Math.abs(y) > 0) return y < 0 ? "up" : "down";
  return fallback;
}

export class ExplorationScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Container | null = null;
  private areaVisual: AreaVisual | null = null;
  private activeHotspots: ActiveHotspot[] = [];
  private nearbyHotspot: HotspotDefinition | null = null;
  private pointerTarget: Phaser.Math.Vector2 | null = null;
  private lastPositionSync = 0;
  private exitCooldownUntil = 0;
  private currentFacing: Facing = "down";
  private visualsFrozen = false;

  public constructor(private readonly bridge: ExplorationSceneBridge) {
    super({ key: "exploration" });
  }

  public preload(): void {
    preloadArtV3Textures(this);
  }

  public create(): void {
    const state = this.bridge.getState();
    const stage = selectStage(state);
    const area = getArea(state.areaId);
    this.currentFacing = state.playerPosition.facing;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#071326");
    if (!state.settings.reducedMotion) this.cameras.main.fadeIn(240, 7, 19, 38);
    this.areaVisual = paintArea(this, state.areaId, stage, state.settings.reducedMotion);

    this.createObstacles(area.obstacles);
    this.createHotspots(area.hotspots, state, stage);

    this.player = createNagi(this, state.playerPosition, state.settings.reducedMotion);
    this.player.setVisible(state.started);
    this.createPlayerColliders(area.obstacles);

    this.applyCameraLayout();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.bridge.onPrompt(null);
    this.bridge.onReady();
  }

  public override update(time: number, delta: number): void {
    if (!this.player) return;
    if (!this.visualsFrozen) this.areaVisual?.update(time, delta);
    const state = this.bridge.getState();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const acceptsInput = state.started && this.bridge.canAcceptWorldInput();
    let movementX = 0;
    let movementY = 0;

    if (acceptsInput) {
      const inputVector = this.bridge.input.getMovementVector();
      movementX = inputVector.x;
      movementY = inputVector.y;
      if (movementX !== 0 || movementY !== 0) this.pointerTarget = null;

      if (movementX === 0 && movementY === 0 && this.pointerTarget) {
        const distance = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          this.pointerTarget.x,
          this.pointerTarget.y,
        );
        if (distance <= 12) {
          this.pointerTarget = null;
        } else {
          const direction = new Phaser.Math.Vector2(
            this.pointerTarget.x - this.player.x,
            this.pointerTarget.y - this.player.y,
          ).normalize();
          movementX = direction.x;
          movementY = direction.y;
        }
      }
    } else {
      this.pointerTarget = null;
    }

    const direction = new Phaser.Math.Vector2(movementX, movementY);
    if (direction.lengthSq() > 1) direction.normalize();
    const speed = this.bridge.input.isDashHeld ? 230 : 150;
    body.setVelocity(direction.x * speed, direction.y * speed);
    this.currentFacing = facingFromVelocity(direction.x, direction.y, this.currentFacing);
    this.player.setDepth(this.player.y + 40);
    setNagiMotion(
      this.player,
      this.currentFacing,
      direction.lengthSq() > 0,
      time,
      state.settings.reducedMotion,
    );

    this.updateNearbyHotspot();
    const handledExit = this.updateExit(time);
    if (!handledExit && time - this.lastPositionSync >= 500) {
      this.lastPositionSync = time;
      this.bridge.onPlayerPosition(this.getPlayerPosition());
    }
  }

  public interactNearest(): boolean {
    if (!this.bridge.canAcceptWorldInput() || !this.player) return false;
    if (this.nearbyHotspot) {
      this.pointerTarget = null;
      playNagiAction(
        this.player,
        this.nearbyHotspot.kind === "item" ? "acquire" : "inspect",
        this.bridge.getState().settings.reducedMotion,
      );
      this.bridge.onInteract(this.nearbyHotspot);
      return true;
    }

    const state = this.bridge.getState();
    const stage = selectStage(state);
    const area = getArea(state.areaId);
    const lockedExit = area.exits.find((exit) =>
      stage < exit.availableFromStage && pointInBounds(this.player?.x ?? 0, this.player?.y ?? 0, {
        x: exit.bounds.x - 46,
        y: exit.bounds.y - 46,
        width: exit.bounds.width + 92,
        height: exit.bounds.height + 92,
      }),
    );
    if (lockedExit) {
      this.bridge.onLockedExit(lockedExit);
      return true;
    }
    return false;
  }

  public syncFromState(previous: GameState | null = null): void {
    const state = this.bridge.getState();
    const shouldRestart =
      previous === null ||
      previous.areaId !== state.areaId ||
      selectStage(previous) !== selectStage(state) ||
      previous.inventoryItemIds.length !== state.inventoryItemIds.length ||
      previous.foundClueIds.length !== state.foundClueIds.length ||
      previous.settings.reducedMotion !== state.settings.reducedMotion ||
      previous.started !== state.started;
    if (shouldRestart && this.scene.isActive()) {
      this.scene.restart();
      return;
    }
    if (this.player && previous === null) {
      this.player.setPosition(state.playerPosition.x, state.playerPosition.y);
      this.currentFacing = state.playerPosition.facing;
    }
  }

  public setVisualsFrozen(frozen: boolean): void {
    this.visualsFrozen = frozen;
    if (frozen) this.cameras.main.resetFX();
  }

  public resetCameraFx(): void {
    this.cameras.main.resetFX();
  }

  public getPlayerPosition(): PlayerPosition {
    const state = this.bridge.getState();
    return {
      x: Math.round(this.player?.x ?? state.playerPosition.x),
      y: Math.round(this.player?.y ?? state.playerPosition.y),
      facing: this.currentFacing,
    };
  }

  private createObstacles(obstacles: ReturnType<typeof getArea>["obstacles"]): void {
    for (const obstacle of obstacles) {
      const rectangle = this.add.rectangle(
        obstacle.bounds.x + obstacle.bounds.width / 2,
        obstacle.bounds.y + obstacle.bounds.height / 2,
        obstacle.bounds.width,
        obstacle.bounds.height,
        0x000000,
        0,
      );
      rectangle.name = `obstacle:${obstacle.id}`;
      this.physics.add.existing(rectangle, true);
    }
  }

  private createPlayerColliders(obstacles: ReturnType<typeof getArea>["obstacles"]): void {
    if (!this.player) return;
    for (const obstacle of obstacles) {
      const rectangle = this.children.getByName(`obstacle:${obstacle.id}`);
      if (rectangle) this.physics.add.collider(this.player, rectangle);
    }
  }

  private createHotspots(
    hotspots: readonly HotspotDefinition[],
    state: GameState,
    stage: number,
  ): void {
    this.activeHotspots = [];
    for (const hotspot of hotspots) {
      if (!availabilityMatches(hotspot, state, stage)) continue;
      let marker: Phaser.GameObjects.Container | null = null;
      const alreadyFound = hotspot.clueId ? state.foundClueIds.includes(hotspot.clueId) : false;
      const isOwner = hotspot.kind === "owner" || hotspot.kind === "mirror";
      if (isOwner && hotspot.ownerId) {
        const returned = hotspot.ownerId === "owner_nagi"
          ? state.returnedItemIds.includes("item_blank_ticket")
          : state.returnedItemIds.some((itemId) => getItem(itemId).ownerId === hotspot.ownerId);
        createPassenger(
          this,
          hotspot.ownerId,
          hotspot.position,
          returned,
          state.settings.reducedMotion,
        );
        marker = createHotspotMarker(this, hotspot.position, 0xeacb7d, state.settings.reducedMotion);
      } else if (!alreadyFound || hotspot.kind === "ending") {
        marker = createHotspotMarker(
          this,
          hotspot.position,
          hotspot.kind === "item" ? 0xeea07e : 0x8bcdd0,
          state.settings.reducedMotion,
        );
        if (hotspot.itemId) this.createWorldItem(hotspot);
      }
      this.activeHotspots.push({ definition: hotspot, marker });
    }
  }

  private createWorldItem(hotspot: HotspotDefinition): void {
    if (!hotspot.itemId) return;
    const item = getItem(hotspot.itemId);
    createWorldItemVisual(this, hotspot.position, item.id, item.visual, {
      depth: hotspot.position.y + 21,
      scale: item.visual.shape === "hairclip" ? 1.08 : 1,
    });
  }

  private applyCameraLayout(): void {
    const camera = this.cameras.main;
    const state = this.bridge.getState();
    const gameSize = this.scale.gameSize;
    const layout = resolveCameraLayout({ width: gameSize.width, height: gameSize.height });
    const portraitViewport = layout.mode === "portrait";
    camera.setViewport(
      0,
      portraitViewport ? layout.safeArea.y : 0,
      gameSize.width,
      portraitViewport ? layout.safeArea.height : gameSize.height,
    );
    camera.setZoom(layout.zoom.value);
    camera.roundPixels = layout.roundPixels;
    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    if (!state.started || !this.player || layout.tracking.kind === "fixed") {
      camera.stopFollow();
      camera.setDeadzone();
      camera.centerOn(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
      return;
    }

    camera.startFollow(
      this.player,
      layout.roundPixels,
      layout.tracking.lerp.x,
      layout.tracking.lerp.y,
      portraitViewport ? 0 : layout.tracking.screenFocusOffset.x / layout.zoom.value,
      portraitViewport ? 0 : layout.tracking.screenFocusOffset.y / layout.zoom.value,
    );
    camera.setDeadzone(
      layout.tracking.deadzone.width / layout.zoom.value,
      layout.tracking.deadzone.height / layout.zoom.value,
    );
  }

  private updateNearbyHotspot(): void {
    if (!this.player || !this.bridge.canAcceptWorldInput()) {
      if (this.nearbyHotspot) this.bridge.onPrompt(null);
      this.nearbyHotspot = null;
      return;
    }
    let closest: HotspotDefinition | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (const active of this.activeHotspots) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        active.definition.position.x,
        active.definition.position.y,
      );
      const threshold = Math.max(INTERACTION_DISTANCE, active.definition.radius);
      if (distance <= threshold && distance < closestDistance) {
        closest = active.definition;
        closestDistance = distance;
      }
    }
    if (closest?.id !== this.nearbyHotspot?.id) {
      this.nearbyHotspot = closest;
      this.bridge.onPrompt(closest ? closest.prompt : null);
    }
  }

  private updateExit(time: number): boolean {
    if (!this.player || time < this.exitCooldownUntil || !this.bridge.canAcceptWorldInput()) return false;
    const state = this.bridge.getState();
    const stage = selectStage(state);
    const area = getArea(state.areaId);
    const exit = area.exits.find((candidate) => pointInBounds(this.player?.x ?? 0, this.player?.y ?? 0, candidate.bounds));
    if (!exit) return false;
    this.exitCooldownUntil = time + EXIT_COOLDOWN_MS;
    this.pointerTarget = null;
    if (stage >= exit.availableFromStage) {
      this.bridge.onEnterArea(exit);
    } else {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      const safePosition = positionInsideRoom(exit);
      this.player.setPosition(safePosition.x, safePosition.y);
      this.bridge.onPlayerPosition(this.getPlayerPosition());
      this.bridge.onLockedExit(exit);
    }
    return true;
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (!this.player || !this.bridge.canAcceptWorldInput()) return;
    const camera = this.cameras.main;
    if (
      pointer.x < camera.x ||
      pointer.x > camera.x + camera.width ||
      pointer.y < camera.y ||
      pointer.y > camera.y + camera.height
    ) return;
    const worldPoint = pointer.positionToCamera(camera) as Phaser.Math.Vector2;
    const target = this.activeHotspots
      .map((active) => ({
        hotspot: active.definition,
        distance: Phaser.Math.Distance.Between(
          worldPoint.x,
          worldPoint.y,
          active.definition.position.x,
          active.definition.position.y,
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
    if (target && target.distance <= Math.max(42, target.hotspot.radius)) {
      const playerDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        target.hotspot.position.x,
        target.hotspot.position.y,
      );
      if (playerDistance <= Math.max(INTERACTION_DISTANCE, target.hotspot.radius)) {
        this.bridge.onInteract(target.hotspot);
      } else {
        this.pointerTarget = new Phaser.Math.Vector2(target.hotspot.position.x, target.hotspot.position.y + 36);
      }
      return;
    }
    this.pointerTarget = new Phaser.Math.Vector2(worldPoint.x, worldPoint.y);
  };

  private readonly handleResize = (): void => {
    this.applyCameraLayout();
  };

  private readonly handleShutdown = (): void => {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.areaVisual?.destroy();
    this.areaVisual = null;
    this.activeHotspots = [];
    this.player = null;
    this.nearbyHotspot = null;
    this.pointerTarget = null;
    this.bridge.onPrompt(null);
  };
}
