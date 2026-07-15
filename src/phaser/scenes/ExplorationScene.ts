import Phaser from "phaser";

import {
  depthScaleAt,
  findPathOnGrid,
  getArea,
  getAreaArtLayout,
  getItem,
  isSafePoint,
  pointInPolygon,
  projectToSafePoint,
  resolveSafeStep,
  type AreaArtLayout,
  type AreaExitDefinition,
  type ArtHotspotDefinition,
  type HotspotDefinition,
} from "../../game/content";
import { selectStage } from "../../game/core";
import type { Facing, GameState, PlayerPosition, Point } from "../../game/core/types";
import type { ActionInput } from "../../game/input";
import { preloadArtV3Textures } from "../view/ArtV3Preloader";
import { resolveCameraLayout } from "../view/CameraLayout";
import { createWorldItemVisual } from "../view/ItemVisual";
import {
  applyActorArtIntegration,
  createForegroundOccluders,
  createHotspotMarker,
  createNagi,
  createPassenger,
  paintArea,
  playNagiAction,
  setNagiMotion,
  WORLD_HEIGHT,
  WORLD_WIDTH,
  type AreaVisual,
  type ForegroundOccluderVisual,
} from "../view/StationView";
import { DebugGeometryOverlay } from "../view/DebugGeometryOverlay";

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

export interface ExplorationVisualProbe {
  readonly areaId: GameState["areaId"];
  readonly stage: number;
  readonly player: {
    readonly x: number;
    readonly y: number;
    readonly facing: Facing;
    readonly safe: boolean;
    readonly scale: number;
    readonly depth: number;
    readonly lightIntensity: number;
    readonly lightColor: string | null;
  };
  readonly passengers: readonly {
    readonly ownerId: string;
    readonly x: number;
    readonly y: number;
    readonly safe: boolean;
    readonly scale: number;
    readonly depth: number;
    readonly lightIntensity: number;
  }[];
  readonly markers: readonly {
    readonly id: string;
    readonly visible: boolean;
    readonly distance: number;
  }[];
  readonly pointerPath: readonly Point[];
  readonly foregroundOccluders: readonly {
    readonly id: string;
    readonly depth: number;
    readonly visible: boolean;
  }[];
  readonly effects: ReturnType<AreaVisual["probe"]> | null;
  readonly camera: {
    readonly viewport: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    readonly worldView: { readonly x: number; readonly y: number; readonly width: number; readonly height: number };
    readonly zoom: number;
    readonly roundPixels: boolean;
  };
  readonly geometryOverlayVisible: boolean;
}

interface ActiveHotspot {
  readonly definition: HotspotDefinition;
  readonly artDefinition: ArtHotspotDefinition;
  readonly marker: Phaser.GameObjects.Container | null;
}

interface ActivePassenger {
  readonly ownerId: string;
  readonly container: Phaser.GameObjects.Container;
}

const EXIT_COOLDOWN_MS = 500;
const PLAYER_CLEARANCE = 14;
const NAVIGATION_CELL_SIZE = 12;
const WAYPOINT_REACHED_DISTANCE = 8;

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

function facingFromVelocity(x: number, y: number, fallback: Facing): Facing {
  if (Math.abs(x) > Math.abs(y)) return x < 0 ? "left" : "right";
  if (Math.abs(y) > 0) return y < 0 ? "up" : "down";
  return fallback;
}

export class ExplorationScene extends Phaser.Scene {
  private player: Phaser.GameObjects.Container | null = null;
  private areaVisual: AreaVisual | null = null;
  private foregroundOccluders: ForegroundOccluderVisual | null = null;
  private debugGeometryOverlay: DebugGeometryOverlay | null = null;
  private artLayout: AreaArtLayout | null = null;
  private activeHotspots: ActiveHotspot[] = [];
  private activePassengers: ActivePassenger[] = [];
  private nearbyHotspot: HotspotDefinition | null = null;
  private pointerPath: Phaser.Math.Vector2[] = [];
  private lastPositionSync = 0;
  private exitCooldownUntil = 0;
  private currentFacing: Facing = "down";
  private currentStage = 0;
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
    this.currentStage = stage;
    this.artLayout = getAreaArtLayout(state.areaId);
    const safeStart = projectToSafePoint(this.artLayout, state.playerPosition, {
      clearance: PLAYER_CLEARANCE,
    });
    this.currentFacing = state.playerPosition.facing;
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.cameras.main.setBackgroundColor("#071326");
    if (!state.settings.reducedMotion) this.cameras.main.fadeIn(240, 7, 19, 38);
    this.areaVisual = paintArea(this, state.areaId, stage, state.settings.reducedMotion);

    this.createHotspots(area.hotspots, state, stage);

    this.player = createNagi(this, safeStart, state.settings.reducedMotion);
    this.player.setVisible(state.started);
    applyActorArtIntegration(this.player, this.artLayout, safeStart, stage);
    this.foregroundOccluders = createForegroundOccluders(this, state.areaId, stage);
    if (import.meta.env.DEV) {
      this.debugGeometryOverlay = new DebugGeometryOverlay(this, this.artLayout);
      this.debugGeometryOverlay.updateFoot(safeStart);
    }

    this.applyCameraLayout();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown, this);
    this.bridge.onPrompt(null);
    this.bridge.onReady();
    if (safeStart.x !== state.playerPosition.x || safeStart.y !== state.playerPosition.y) {
      this.bridge.onPlayerPosition(this.getPlayerPosition());
    }
  }

  public override update(time: number, delta: number): void {
    if (!this.player || !this.artLayout) return;
    if (!this.visualsFrozen) this.areaVisual?.update(time, delta);
    const state = this.bridge.getState();
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    const acceptsInput = state.started && this.bridge.canAcceptWorldInput();
    let movementX = 0;
    let movementY = 0;
    let activeWaypoint: Phaser.Math.Vector2 | null = null;

    if (acceptsInput) {
      const inputVector = this.bridge.input.getMovementVector();
      movementX = inputVector.x;
      movementY = inputVector.y;
      if (movementX !== 0 || movementY !== 0) this.pointerPath = [];

      while (movementX === 0 && movementY === 0 && this.pointerPath.length > 0) {
        const waypoint = this.pointerPath[0];
        if (!waypoint) break;
        const distance = Phaser.Math.Distance.Between(this.player.x, this.player.y, waypoint.x, waypoint.y);
        if (distance <= WAYPOINT_REACHED_DISTANCE) {
          this.pointerPath.shift();
          continue;
        }
        activeWaypoint = waypoint;
        const directionToWaypoint = new Phaser.Math.Vector2(
          waypoint.x - this.player.x,
          waypoint.y - this.player.y,
        ).normalize();
        movementX = directionToWaypoint.x;
        movementY = directionToWaypoint.y;
        break;
      }
    } else {
      this.pointerPath = [];
    }

    const direction = new Phaser.Math.Vector2(movementX, movementY);
    if (direction.lengthSq() > 1) direction.normalize();
    const speed = this.bridge.input.isDashHeld ? 230 : 150;
    const stepDistance = speed * Math.min(Math.max(delta, 0), 50) / 1_000;
    const start = { x: this.player.x, y: this.player.y };
    let desired = {
      x: start.x + direction.x * stepDistance,
      y: start.y + direction.y * stepDistance,
    };
    if (activeWaypoint) {
      const remaining = Phaser.Math.Distance.Between(start.x, start.y, activeWaypoint.x, activeWaypoint.y);
      if (remaining <= stepDistance) desired = { x: activeWaypoint.x, y: activeWaypoint.y };
    }
    const resolved = resolveSafeStep(this.artLayout, start, desired, PLAYER_CLEARANCE);
    this.player.setPosition(resolved.x, resolved.y);
    body.setVelocity(0, 0);
    if (
      activeWaypoint
      && Phaser.Math.Distance.Between(resolved.x, resolved.y, activeWaypoint.x, activeWaypoint.y)
        <= WAYPOINT_REACHED_DISTANCE
    ) this.pointerPath.shift();

    const movedX = resolved.x - start.x;
    const movedY = resolved.y - start.y;
    const isMoving = movedX * movedX + movedY * movedY > 0.01;
    this.currentFacing = facingFromVelocity(movedX, movedY, this.currentFacing);
    applyActorArtIntegration(
      this.player,
      this.artLayout,
      { x: this.player.x, y: this.player.y },
      this.currentStage,
    );
    this.debugGeometryOverlay?.updateFoot({ x: this.player.x, y: this.player.y });
    setNagiMotion(
      this.player,
      this.currentFacing,
      isMoving,
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
      this.activateHotspot(this.nearbyHotspot);
      return true;
    }

    const state = this.bridge.getState();
    const stage = selectStage(state);
    const area = getArea(state.areaId);
    const lockedExit = area.exits.find((exit) => {
      const artExit = this.artLayout?.exits.find((candidate) => candidate.id === exit.id);
      return Boolean(
        artExit
        && stage < exit.availableFromStage
        && Phaser.Math.Distance.Between(
          this.player?.x ?? 0,
          this.player?.y ?? 0,
          artExit.approachPoint.x,
          artExit.approachPoint.y,
        ) <= 72
      );
    });
    if (lockedExit) {
      this.pointerPath = [];
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
      const safePosition = projectToSafePoint(
        getAreaArtLayout(state.areaId),
        state.playerPosition,
        { clearance: PLAYER_CLEARANCE },
      );
      this.player.setPosition(safePosition.x, safePosition.y);
      this.currentFacing = state.playerPosition.facing;
    }
  }

  public setVisualsFrozen(frozen: boolean): void {
    this.visualsFrozen = frozen;
    if (frozen) {
      this.cameras.main.resetFX();
      this.areaVisual?.seek(2_400);
    }
  }

  public stabilizeVisuals(time = 2_400): void {
    this.visualsFrozen = true;
    this.cameras.main.resetFX();
    this.areaVisual?.seek(time);
  }

  public toggleGeometryOverlay(force?: boolean): boolean {
    if (!this.debugGeometryOverlay) return false;
    const visible = force ?? !this.debugGeometryOverlay.isVisible;
    this.debugGeometryOverlay.setVisible(visible);
    return visible;
  }

  public worldToScreen(point: Point): Point {
    const camera = this.cameras.main;
    return {
      x: camera.x + (point.x - camera.worldView.x) * camera.zoom,
      y: camera.y + (point.y - camera.worldView.y) * camera.zoom,
    };
  }

  public getVisualProbe(): ExplorationVisualProbe | null {
    if (!this.player || !this.artLayout) return null;
    const camera = this.cameras.main;
    const playerPoint = { x: this.player.x, y: this.player.y };
    return {
      areaId: this.bridge.getState().areaId,
      stage: this.currentStage,
      player: {
        ...playerPoint,
        facing: this.currentFacing,
        safe: isSafePoint(this.artLayout, playerPoint, PLAYER_CLEARANCE),
        scale: this.player.scaleX,
        depth: this.player.depth,
        lightIntensity: Number(this.player.getData("actorArtLightIntensity") ?? 0),
        lightColor: (this.player.getData("actorArtLightColor") as string | undefined) ?? null,
      },
      passengers: this.activePassengers.map(({ ownerId, container }) => ({
        ownerId,
        x: container.x,
        y: container.y,
        safe: isSafePoint(this.artLayout as AreaArtLayout, { x: container.x, y: container.y }),
        scale: container.scaleX,
        depth: container.depth,
        lightIntensity: Number(container.getData("actorArtLightIntensity") ?? 0),
      })),
      markers: this.activeHotspots.map((active) => ({
        id: active.definition.id,
        visible: active.marker?.visible ?? false,
        distance: Phaser.Math.Distance.Between(
          this.player?.x ?? 0,
          this.player?.y ?? 0,
          active.artDefinition.approachPoint.x,
          active.artDefinition.approachPoint.y,
        ),
      })),
      pointerPath: this.pointerPath.map((point) => ({ x: point.x, y: point.y })),
      foregroundOccluders: (this.foregroundOccluders?.images ?? []).map((image) => ({
        id: image.name.replace("foreground-occluder:", ""),
        depth: image.depth,
        visible: image.visible,
      })),
      effects: this.areaVisual?.probe() ?? null,
      camera: {
        viewport: { x: camera.x, y: camera.y, width: camera.width, height: camera.height },
        worldView: {
          x: camera.worldView.x,
          y: camera.worldView.y,
          width: camera.worldView.width,
          height: camera.worldView.height,
        },
        zoom: camera.zoom,
        roundPixels: camera.roundPixels,
      },
      geometryOverlayVisible: this.debugGeometryOverlay?.isVisible ?? false,
    };
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

  private createHotspots(
    hotspots: readonly HotspotDefinition[],
    state: GameState,
    stage: number,
  ): void {
    this.activeHotspots = [];
    this.activePassengers = [];
    for (const hotspot of hotspots) {
      if (!availabilityMatches(hotspot, state, stage)) continue;
      const artDefinition = this.artLayout?.hotspots.find((candidate) => candidate.id === hotspot.id);
      if (!artDefinition) continue;
      let marker: Phaser.GameObjects.Container | null = null;
      const alreadyFound = hotspot.clueId ? state.foundClueIds.includes(hotspot.clueId) : false;
      const isOwner = hotspot.kind === "owner" || hotspot.kind === "mirror";
      if (isOwner && hotspot.ownerId) {
        const returned = hotspot.ownerId === "owner_nagi"
          ? state.returnedItemIds.includes("item_blank_ticket")
          : state.returnedItemIds.some((itemId) => getItem(itemId).ownerId === hotspot.ownerId);
        const passenger = createPassenger(
          this,
          hotspot.ownerId,
          artDefinition.artAnchor,
          returned,
          state.settings.reducedMotion,
        );
        if (this.artLayout) {
          applyActorArtIntegration(passenger, this.artLayout, artDefinition.artAnchor, stage);
        }
        this.activePassengers.push({ ownerId: hotspot.ownerId, container: passenger });
        marker = createHotspotMarker(this, artDefinition.artAnchor, 0xeacb7d, state.settings.reducedMotion);
      } else if (!alreadyFound || hotspot.kind === "ending") {
        marker = createHotspotMarker(
          this,
          artDefinition.artAnchor,
          hotspot.kind === "item" ? 0xeea07e : 0x8bcdd0,
          state.settings.reducedMotion,
        );
        if (hotspot.itemId) this.createWorldItem(hotspot, artDefinition.artAnchor);
      }
      marker?.setVisible(false);
      this.activeHotspots.push({ definition: hotspot, artDefinition, marker });
    }
  }

  private createWorldItem(hotspot: HotspotDefinition, artAnchor: Point): void {
    if (!hotspot.itemId) return;
    const item = getItem(hotspot.itemId);
    const baseScale = item.visual.shape === "hairclip" ? 1.08 : 1;
    const perspectiveScale = this.artLayout
      ? Phaser.Math.Clamp(depthScaleAt(this.artLayout, artAnchor.y) / 0.68, 0.82, 1.16)
      : 1;
    createWorldItemVisual(this, artAnchor, item.id, item.visual, {
      depth: artAnchor.y + 21,
      scale: baseScale * perspectiveScale,
    });
  }

  private applyCameraLayout(): void {
    const camera = this.cameras.main;
    const state = this.bridge.getState();
    const gameSize = this.scale.gameSize;
    const layout = resolveCameraLayout({ width: gameSize.width, height: gameSize.height });
    const portraitViewport = layout.mode === "portrait";
    camera.setViewport(
      layout.cameraViewport.x,
      layout.cameraViewport.y,
      layout.cameraViewport.width,
      layout.cameraViewport.height,
    );
    camera.setZoom(layout.zoom.value);
    camera.roundPixels = layout.roundPixels;

    if (layout.tracking.kind === "fixed") {
      camera.stopFollow();
      camera.setDeadzone();
      // A bounded camera whose viewport is as large as its world is clamped to
      // the bounds origin by Phaser before centering. Fixed room views own an
      // explicit 16:9 viewport, so remove bounds and place the world directly.
      camera.removeBounds();
      camera.centerOn(layout.tracking.center.x, layout.tracking.center.y);
      return;
    }

    camera.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    if (!state.started || !this.player) {
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
      for (const active of this.activeHotspots) active.marker?.setVisible(false);
      if (this.nearbyHotspot) this.bridge.onPrompt(null);
      this.nearbyHotspot = null;
      return;
    }
    let closest: HotspotDefinition | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    let closestReveal: ActiveHotspot | null = null;
    let closestRevealDistance = Number.POSITIVE_INFINITY;
    for (const active of this.activeHotspots) {
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        active.artDefinition.approachPoint.x,
        active.artDefinition.approachPoint.y,
      );
      if (distance <= active.artDefinition.revealRadius && distance < closestRevealDistance) {
        closestReveal = active;
        closestRevealDistance = distance;
      }
      const threshold = active.artDefinition.interactionRadius;
      if (distance <= threshold && distance < closestDistance) {
        closest = active.definition;
        closestDistance = distance;
      }
    }
    for (const active of this.activeHotspots) {
      active.marker?.setVisible(active === closestReveal);
    }
    if (closest?.id !== this.nearbyHotspot?.id) {
      this.nearbyHotspot = closest;
      this.bridge.onPrompt(closest ? closest.prompt : null);
    }
  }

  private updateExit(time: number): boolean {
    if (
      !this.player
      || !this.artLayout
      || time < this.exitCooldownUntil
      || !this.bridge.canAcceptWorldInput()
    ) return false;
    const state = this.bridge.getState();
    const stage = selectStage(state);
    const area = getArea(state.areaId);
    const artExit = this.artLayout.exits.find((candidate) =>
      pointInPolygon({ x: this.player?.x ?? 0, y: this.player?.y ?? 0 }, candidate.zone)
    );
    if (!artExit) return false;
    const exit = area.exits.find((candidate) => candidate.id === artExit.id);
    if (!exit) return false;
    this.exitCooldownUntil = time + EXIT_COOLDOWN_MS;
    this.pointerPath = [];
    if (stage >= exit.availableFromStage) {
      this.bridge.onEnterArea({
        ...exit,
        targetAreaId: artExit.targetAreaId,
        targetPosition: { ...artExit.targetSafeSpawn },
      });
    } else {
      const body = this.player.body as Phaser.Physics.Arcade.Body;
      body.setVelocity(0, 0);
      const safePosition = projectToSafePoint(this.artLayout, artExit.approachPoint, {
        clearance: PLAYER_CLEARANCE,
      });
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
    if (
      worldPoint.x < 0
      || worldPoint.x > WORLD_WIDTH
      || worldPoint.y < 0
      || worldPoint.y > WORLD_HEIGHT
    ) return;
    const target = this.activeHotspots
      .map((active) => ({
        active,
        distance: Phaser.Math.Distance.Between(
          worldPoint.x,
          worldPoint.y,
          active.artDefinition.artAnchor.x,
          active.artDefinition.artAnchor.y,
        ),
      }))
      .sort((left, right) => left.distance - right.distance)[0];
    if (target && target.distance <= Math.max(42, target.active.definition.radius)) {
      const playerDistance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        target.active.artDefinition.approachPoint.x,
        target.active.artDefinition.approachPoint.y,
      );
      if (playerDistance <= target.active.artDefinition.interactionRadius) {
        this.activateHotspot(target.active.definition);
      } else {
        this.setNavigationTarget(target.active.artDefinition.approachPoint);
      }
      return;
    }
    this.setNavigationTarget(worldPoint);
  };

  private activateHotspot(hotspot: HotspotDefinition): void {
    if (!this.player) return;
    this.pointerPath = [];
    playNagiAction(
      this.player,
      hotspot.kind === "item" ? "acquire" : "inspect",
      this.bridge.getState().settings.reducedMotion,
    );
    this.bridge.onInteract(hotspot);
  }

  private setNavigationTarget(target: Point): void {
    if (!this.player || !this.artLayout) return;
    const start = projectToSafePoint(
      this.artLayout,
      { x: this.player.x, y: this.player.y },
      { clearance: PLAYER_CLEARANCE },
    );
    if (start.x !== this.player.x || start.y !== this.player.y) {
      this.player.setPosition(start.x, start.y);
    }
    const safeTarget = projectToSafePoint(this.artLayout, target, {
      clearance: PLAYER_CLEARANCE,
    });
    const path = findPathOnGrid(this.artLayout, start, safeTarget, {
      cellSize: NAVIGATION_CELL_SIZE,
      clearance: PLAYER_CLEARANCE,
      allowDiagonal: true,
    });
    this.pointerPath = path
      ? path.slice(1).map((point) => new Phaser.Math.Vector2(point.x, point.y))
      : [];
  }

  private readonly handleResize = (): void => {
    this.applyCameraLayout();
  };

  private readonly handleShutdown = (): void => {
    this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown, this);
    this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.debugGeometryOverlay?.destroy();
    this.debugGeometryOverlay = null;
    this.foregroundOccluders?.destroy();
    this.foregroundOccluders = null;
    this.areaVisual?.destroy();
    this.areaVisual = null;
    this.artLayout = null;
    this.activeHotspots = [];
    this.activePassengers = [];
    this.player = null;
    this.nearbyHotspot = null;
    this.pointerPath = [];
    this.bridge.onPrompt(null);
  };
}
