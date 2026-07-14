import Phaser from "phaser";

import {
  CLUE_DEFINITIONS,
  DIALOGUES,
  ENDING_DEFINITIONS,
  getArea,
  getItem,
  LOST_ITEM_DEFINITIONS,
  MEMORY_DEFINITIONS,
  OWNER_DEFINITIONS,
  type DialogueDefinition,
  type DialogueLine,
  type HotspotDefinition,
} from "./game/content";
import {
  GameStore,
  selectAvailableEndingIds,
  selectClock,
  selectCurrentItemId,
  selectObjective,
  selectStage,
} from "./game/core";
import type {
  AreaId,
  EndingId,
  GameAction,
  GameSettings,
  GameState,
  ItemId,
  MemoryId,
  OwnerId,
} from "./game/core/types";
import { ActionInput, type InputAction } from "./game/input";
import { LocalStorageSaveAdapter } from "./game/save";
import { AudioManager } from "./game/systems/audio";
import {
  ExplorationScene,
  type ExplorationSceneBridge,
} from "./phaser/scenes/ExplorationScene";
import { AppUi } from "./ui/AppUi";
import type {
  DialogueView,
  EndingView,
  InventoryEntry,
  MenuEntry,
  NoteSection,
  RecordEntry,
} from "./ui/types";

const IMPORTANT_SAVE_ACTIONS: ReadonlySet<GameAction["type"]> = new Set([
  "start-new-game",
  "enter-area",
  "acquire-item",
  "discover-clue",
  "return-correct",
  "complete-memory",
  "record-ending",
  "update-settings",
]);

const RETURNED_ITEM_BY_OWNER: Readonly<Partial<Record<OwnerId, ItemId>>> = Object.fromEntries(
  LOST_ITEM_DEFINITIONS.map((item) => [item.ownerId, item.id]),
) as Partial<Record<OwnerId, ItemId>>;

function getDialogue(id: string | undefined): DialogueDefinition | null {
  if (!id) return null;
  return DIALOGUES[id] ?? null;
}

function dialogueTone(line: DialogueLine | undefined): DialogueView["tone"] {
  if (!line) return "station";
  if (line.speaker === "owner_nagi") return "nagi";
  if (line.speaker === "owner_station_attendant") return "attendant";
  if (line.speaker === "narrator" || line.speaker === "station") return "station";
  return "passenger";
}

function dialogueView(
  definition: DialogueDefinition | null,
  fallbackSpeaker = "ナギ",
  fallbackText = "雨音だけが、短く答えた。",
  actions?: readonly MenuEntry[],
): DialogueView {
  if (!definition || definition.lines.length === 0) {
    return { speaker: fallbackSpeaker, lines: [fallbackText], tone: "station", actions };
  }
  const first = definition.lines[0];
  return {
    speaker: first?.name ?? fallbackSpeaker,
    lines: definition.lines.map((line, index) =>
      index === 0 || line.name === first?.name ? line.text : `${line.name}「${line.text}」`,
    ),
    tone: dialogueTone(first),
    actions,
  };
}

function memoryById(memoryId: MemoryId) {
  const memory = MEMORY_DEFINITIONS.find((candidate) => candidate.id === memoryId);
  if (!memory) throw new Error(`Unknown memory: ${memoryId}`);
  return memory;
}

export class GameApplication {
  private readonly ui: AppUi;
  private readonly input: ActionInput;
  private readonly audio: AudioManager;
  private readonly saveAdapter: LocalStorageSaveAdapter;
  private readonly store: GameStore;
  private readonly explorationScene: ExplorationScene;
  private readonly game: Phaser.Game;
  private saveTimer: number | null = null;
  private hintTimer: number | null = null;
  private disposed = false;
  private suppressPersistence = false;
  private stateDirty = false;
  private devPanelCleanup: (() => void) | null = null;

  public constructor(root: HTMLElement) {
    this.ui = new AppUi(root);
    this.saveAdapter = new LocalStorageSaveAdapter(window.localStorage);
    this.store = new GameStore(this.saveAdapter.load());
    this.input = new ActionInput();
    this.audio = new AudioManager(this.store.getState().settings);

    const bridge: ExplorationSceneBridge = {
      input: this.input,
      getState: () => this.store.getState(),
      canAcceptWorldInput: () => !this.ui.isBlockingWorldInput,
      onInteract: (hotspot) => this.handleHotspot(hotspot),
      onLockedExit: (exit) => this.handleLockedExit(exit.lockedDialogId),
      onEnterArea: (exit) => {
        this.store.dispatch({
          type: "enter-area",
          areaId: exit.targetAreaId,
          position: exit.targetPosition,
        });
        this.ui.showToast(`${getArea(exit.targetAreaId).name}へ移動した`);
      },
      onPlayerPosition: (position) => {
        this.store.dispatch({ type: "move-player", position });
      },
      onPrompt: (label) => this.ui.showPrompt(label),
      onReady: () => this.renderHud(),
    };
    this.explorationScene = new ExplorationScene(bridge);
    this.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: this.ui.canvasHost,
      width: 960,
      height: 540,
      backgroundColor: "#071326",
      physics: {
        default: "arcade",
        arcade: { gravity: { x: 0, y: 0 }, debug: false },
      },
      render: { antialias: true, pixelArt: false, roundPixels: true },
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.NO_CENTER,
      },
      scene: [this.explorationScene],
    });

    this.ui.setTextSettings(this.store.getState().settings);
    this.ui.setGameMenuHandlers({
      onNote: () => this.openNotebook(),
      onInventory: () => this.openInventory(),
      onPause: () => this.openPause(),
    });
    this.ui.bindTouchControls({
      onDirection: (direction, active) => {
        this.input.setDirectionHeld(direction, active, `touch:${direction}`, "pointer");
      },
      onAction: (action) => {
        const mapped = action === "note"
          ? "open-note"
          : action === "inventory"
            ? "open-inventory"
            : action;
        this.input.trigger(mapped, "pointer");
      },
    });
    this.input.subscribe((action) => this.handleInput(action));
    this.store.subscribe((state, previous, action) => this.handleStateChange(state, previous, action));
    window.addEventListener("beforeunload", this.handleBeforeUnload);
    this.hintTimer = window.setInterval(() => {
      if (this.store.getState().started && !this.ui.isBlockingWorldInput) {
        this.store.dispatch({ type: "advance-hint-time", elapsedMs: 10_000 });
      }
    }, 10_000);

    this.renderTitle();
    if (import.meta.env.DEV && import.meta.env.MODE === "e2e") {
      void import("./game/debug/e2eBridge").then(({ mountE2EBridge }) => {
        mountE2EBridge({
          store: this.store,
          activate: () => this.activateCurrentStateForE2E(),
          freezeVisuals: (frozen) => this.explorationScene.setVisualsFrozen(frozen),
        });
      });
    } else if (import.meta.env.DEV) {
      void import("./game/debug/devPanel").then(({ mountDevPanel }) => {
        if (this.disposed) return;
        this.devPanelCleanup = mountDevPanel({
          snapshot: () => this.store.getState(),
          onWarp: (areaId: AreaId) => {
            const area = getArea(areaId);
            this.store.dispatch({ type: "enter-area", areaId, position: area.playerStart });
            this.ui.closeDialogue();
            this.ui.closeModal();
            this.ui.showGame();
            this.explorationScene.syncFromState(null);
            this.renderHud();
            this.syncInputGate();
          },
          onAdvanceHint: () => this.store.dispatch({ type: "advance-hint-time", elapsedMs: 90_000 }),
          onResetRun: () => {
            this.store.dispatch({ type: "reset-run" });
            this.saveAdapter.clear();
            this.renderTitle();
          },
        });
      });
    }
  }

  public getState(): GameState {
    return this.store.getState();
  }

  public destroy(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.saveNow(false);
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    if (this.hintTimer !== null) window.clearInterval(this.hintTimer);
    window.removeEventListener("beforeunload", this.handleBeforeUnload);
    this.store.clearListeners();
    this.input.destroy();
    this.audio.destroy();
    this.devPanelCleanup?.();
    this.devPanelCleanup = null;
    this.game.destroy(true);
    this.ui.destroy();
  }

  private renderTitle(): void {
    this.audio.setAmbienceEnabled(true);
    this.ui.showTitle({
      canContinue: this.store.getState().started,
      viewedEndingCount: this.store.getState().viewedEndingIds.length,
      onNewGame: () => {
        if (this.store.getState().started) {
          this.ui.showConfirmation(
            "最初から始めますか？",
            "現在の進行は消えますが、エンディング記録と設定は残ります。",
            "最初から始める",
            () => this.startNewGame(),
            () => this.renderTitle(),
          );
          this.syncInputGate();
        } else {
          this.startNewGame();
        }
      },
      onContinue: () => this.continueGame(),
      onSettings: () => this.openSettings("title"),
      onRecords: () => this.openRecords(),
    });
    this.syncInputGate();
  }

  private activateCurrentStateForE2E(): void {
    const state = this.store.getState();
    this.ui.closeDialogue();
    this.ui.closeModal();
    this.ui.showGame();
    this.explorationScene.syncFromState(null);
    this.renderHud();
    if (state.pendingMemoryId) this.showMemory(state.pendingMemoryId);
    else if (state.activeEndingId) this.showEnding(state.activeEndingId);
    this.syncInputGate();
  }

  private startNewGame(): void {
    this.ui.closeModal();
    const state = this.store.dispatch({ type: "start-new-game" });
    this.explorationScene.syncFromState(null);
    this.ui.showGame();
    this.renderHud();
    this.syncInputGate();
    this.showIntroduction(state);
  }

  private continueGame(): void {
    const state = this.store.getState();
    if (!state.started) return;
    this.ui.showGame();
    this.explorationScene.syncFromState(null);
    this.renderHud();
    if (state.activeEndingId) {
      this.showEnding(state.activeEndingId);
    } else if (state.pendingMemoryId) {
      this.showMemory(state.pendingMemoryId);
    } else if (!state.controlsSeen) {
      this.showControlsAfterIntro();
    }
    this.syncInputGate();
  }

  private showIntroduction(_state: GameState): void {
    this.store.dispatch({ type: "mark-intro-seen" });
    this.showDialogue(
      {
        speaker: "ナギ",
        tone: "nagi",
        lines: [
          "雨……。ここは、どこ？　時計が午前0時で止まってる。",
          "名前は思い出せる。ナギ。それ以外は、霧の向こうみたいだ。",
          "改札の向こうに誰かいる。まずは話を聞いてみよう。",
        ],
      },
      () => this.showControlsAfterIntro(),
    );
  }

  private showControlsAfterIntro(returnToPause = false): void {
    this.ui.showControls(() => {
      this.store.dispatch({ type: "mark-controls-seen" });
      if (returnToPause) this.openPause();
      else this.resumeWorld();
    });
    this.syncInputGate();
  }

  private handleInput(action: InputAction): void {
    if (action.phase !== "trigger") return;
    switch (action.type) {
      case "confirm":
        if (!this.ui.handleConfirm() && !this.ui.isBlockingWorldInput) {
          this.audio.playConfirm();
          this.explorationScene.interactNearest();
        }
        break;
      case "cancel":
        if (!this.ui.handleCancel()) this.openPause();
        break;
      case "interact":
        if (!this.ui.isBlockingWorldInput) {
          this.audio.playConfirm();
          this.explorationScene.interactNearest();
        }
        break;
      case "open-note":
        if (!this.ui.isBlockingWorldInput) this.openNotebook();
        break;
      case "open-inventory":
        if (!this.ui.isBlockingWorldInput) this.openInventory();
        break;
      case "pause":
        if (!this.ui.handleCancel()) this.openPause();
        break;
      default:
        break;
    }
    queueMicrotask(() => this.syncInputGate());
  }

  private handleStateChange(state: GameState, previous: GameState, action: GameAction): void {
    this.stateDirty = true;
    this.ui.setTextSettings(state.settings);
    this.audio.updateSettings(state.settings);
    if (action.type !== "start-new-game") this.explorationScene.syncFromState(previous);
    if (state.started) this.renderHud();

    const currentItemId = selectCurrentItemId(state);
    if (currentItemId) {
      const oldTier = previous.hintTierByItem[currentItemId] ?? 0;
      const newTier = state.hintTierByItem[currentItemId] ?? 0;
      if (newTier > oldTier) this.ui.showToast("ノートに新しいヒントが加わった");
    }

    if (action.type === "move-player" || action.type === "advance-hint-time" || action.type === "inspect") {
      this.scheduleSave();
    } else {
      this.saveNow(IMPORTANT_SAVE_ACTIONS.has(action.type) && state.started);
    }
  }

  private handleHotspot(hotspot: HotspotDefinition): void {
    if (this.ui.isBlockingWorldInput) return;
    this.store.dispatch({
      type: "move-player",
      position: this.explorationScene.getPlayerPosition(),
    });
    const state = this.store.getState();
    const itemProgress = hotspot.itemId
      ? !state.inventoryItemIds.includes(hotspot.itemId) && !state.returnedItemIds.includes(hotspot.itemId)
      : false;
    const hotspotClue = hotspot.clueId
      ? CLUE_DEFINITIONS.find((clue) => clue.id === hotspot.clueId)
      : undefined;
    const clueProgress = hotspotClue
      ? hotspotClue.itemId === selectCurrentItemId(state) && !state.foundClueIds.includes(hotspotClue.id)
      : false;
    const firstInspection = !state.inspectedHotspotIds.includes(hotspot.id);
    this.store.dispatch({
      type: "inspect",
      hotspotId: hotspot.id,
      madeProgress: itemProgress || clueProgress || firstInspection,
    });

    switch (hotspot.kind) {
      case "item":
        this.acquireItem(hotspot);
        break;
      case "clue":
        this.discoverClue(hotspot);
        break;
      case "owner":
      case "mirror":
        this.talkToOwner(hotspot, firstInspection);
        break;
      case "ending":
        this.openFinalChoice();
        break;
      case "inspect":
        if (hotspot.clueId) this.discoverClue(hotspot);
        else this.showDialogueById(firstInspection ? hotspot.dialogId : hotspot.repeatDialogId ?? hotspot.dialogId);
        break;
    }
  }

  private acquireItem(hotspot: HotspotDefinition): void {
    if (!hotspot.itemId) return;
    const item = getItem(hotspot.itemId);
    const state = this.store.getState();
    if (state.inventoryItemIds.includes(item.id) || state.returnedItemIds.includes(item.id)) {
      this.showDialogueById(hotspot.repeatDialogId ?? hotspot.dialogId);
      return;
    }
    const clueId = hotspot.clueId ?? item.clueIds[0];
    this.store.dispatch({ type: "acquire-item", itemId: item.id, clueId });
    this.audio.playItem(item.id);
    this.ui.showToast(`「${item.name}」を拾った`);
    this.showDialogueById(
      hotspot.dialogId,
      undefined,
      "ナギ",
      `${item.inventoryDescription} ノートに記録しておこう。`,
    );
  }

  private discoverClue(hotspot: HotspotDefinition): void {
    if (!hotspot.clueId) {
      this.showDialogueById(hotspot.dialogId);
      return;
    }
    const clue = CLUE_DEFINITIONS.find((candidate) => candidate.id === hotspot.clueId);
    const alreadyFound = this.store.getState().foundClueIds.includes(hotspot.clueId);
    if (!alreadyFound && clue?.itemId === selectCurrentItemId(this.store.getState())) {
      this.store.dispatch({ type: "discover-clue", clueId: hotspot.clueId });
      if (this.store.getState().foundClueIds.includes(hotspot.clueId)) {
        this.ui.showToast(`手がかり「${clue.title}」を記録した`);
      }
    }
    this.showDialogueById(
      alreadyFound ? hotspot.repeatDialogId ?? hotspot.dialogId : hotspot.dialogId,
      undefined,
      "ナギ",
      clue?.observation,
    );
  }

  private talkToOwner(hotspot: HotspotDefinition, firstInspection: boolean): void {
    if (!hotspot.ownerId) {
      this.showDialogueById(hotspot.dialogId);
      return;
    }
    if (hotspot.clueId && !this.store.getState().foundClueIds.includes(hotspot.clueId)) {
      this.store.dispatch({ type: "discover-clue", clueId: hotspot.clueId });
    }
    const owner = OWNER_DEFINITIONS.find((candidate) => candidate.id === hotspot.ownerId);
    const ownerItemId = RETURNED_ITEM_BY_OWNER[hotspot.ownerId];
    const ownerAlreadyHelped = ownerItemId ? this.store.getState().returnedItemIds.includes(ownerItemId) : false;
    let definition = getDialogue(
      ownerAlreadyHelped
        ? owner?.returnedDialogId
        : firstInspection
          ? hotspot.dialogId ?? owner?.ambientDialogId
          : hotspot.ownerId === "owner_station_attendant"
            ? hotspot.repeatDialogId ?? owner?.ambientDialogId ?? hotspot.dialogId
            : owner?.ambientDialogId ?? hotspot.dialogId,
    );

    if (hotspot.ownerId === "owner_station_attendant") {
      const currentItemId = selectCurrentItemId(this.store.getState());
      const tier = currentItemId ? this.store.getState().hintTierByItem[currentItemId] ?? 0 : 0;
      if (currentItemId && tier > 0) {
        const hintId = getItem(currentItemId).hintDialogIds[tier - 1];
        definition = getDialogue(hintId) ?? definition;
      }
    }

    const inventory = this.store.getState().inventoryItemIds;
    const actions: MenuEntry[] = inventory.map((itemId) => {
      const item = getItem(itemId);
      return {
        label: `「${item.name}」を返してみる`,
        detail: item.shortDescription,
        onSelect: () => this.attemptReturn(itemId, hotspot.ownerId as OwnerId),
      };
    });
    if (actions.length > 0) {
      actions.push({ label: "今は返さない", onSelect: () => this.resumeWorld() });
    }
    const view = dialogueView(definition, owner?.name ?? "影の乗客", "影は静かにこちらを見ている。", actions);
    this.showDialogue(view);
  }

  private attemptReturn(itemId: ItemId, ownerId: OwnerId): void {
    const result = this.store.tryReturn(itemId, ownerId);
    if (result.correct && result.memoryId) {
      this.audio.playMemory(result.memoryId);
      this.showDialogueById(result.dialogId, () => this.showMemory(result.memoryId as MemoryId));
    } else {
      this.showDialogueById(result.dialogId, () => {
        this.ui.showToast("忘れものは手元に戻った。もう一度、手がかりを見よう。", 3_200);
        this.resumeWorld();
      });
    }
  }

  private showMemory(memoryId: MemoryId): void {
    const memory = memoryById(memoryId);
    this.ui.showMemory(
      {
        title: memory.title,
        lines: memory.beats.map((beat) => beat.text),
        accent: memory.beats[0]?.color,
      },
      () => {
        this.store.dispatch({ type: "complete-memory", memoryId });
        this.audio.playClock();
        this.ui.showGame();
        this.renderHud();
        this.ui.showToast(`時計が ${selectClock(this.store.getState())} へ進んだ`, 3_000);
        this.syncInputGate();
      },
    );
    this.syncInputGate();
  }

  private openFinalChoice(): void {
    const available = selectAvailableEndingIds(this.store.getState());
    if (available.length === 0) {
      this.showDialogue({
        speaker: "ナギ",
        tone: "nagi",
        lines: ["まだ選べない。ノートに残った記憶を、最後まで確かめよう。"],
      });
      return;
    }
    const entries: MenuEntry[] = available.map((endingId) => {
      const ending = ENDING_DEFINITIONS.find((candidate) => candidate.id === endingId);
      return {
        label: ending?.choiceLabel ?? "この行き先を選ぶ",
        detail: ending?.conditionSummary,
        tone: endingId === "ending_first_train" ? "warm" : "default",
        onSelect: () => this.chooseEnding(endingId),
      };
    });
    if (available.includes("ending_last_train")) {
      entries.push({
        label: "もう少し駅を調べる",
        detail: "白紙の切符の持ち主を探す",
        onSelect: () => this.resumeWorld(),
      });
    }
    this.ui.showMenu("最後の選択", "雨の向こうで、列車の扉が開いている。", entries, () => this.resumeWorld());
    this.syncInputGate();
  }

  private chooseEnding(endingId: EndingId): void {
    const previousEnding = this.store.getState().activeEndingId;
    this.store.dispatch({ type: "record-ending", endingId });
    if (this.store.getState().activeEndingId === previousEnding) return;
    this.audio.playEnding(endingId);
    this.showEnding(endingId);
  }

  private showEnding(endingId: EndingId): void {
    const ending = ENDING_DEFINITIONS.find((candidate) => candidate.id === endingId);
    if (!ending) return;
    const view: EndingView = {
      endingId,
      label: ending.recordLabel,
      title: ending.title,
      paragraphs: [...ending.paragraphs, ending.closingLine],
    };
    this.ui.showEnding(view, () => this.ui.showCredits(() => {
      this.store.dispatch({ type: "clear-active-ending" });
      this.saveNow(false);
      this.renderTitle();
    }));
    this.syncInputGate();
  }

  private openNotebook(): void {
    if (!this.store.getState().started) return;
    const state = this.store.getState();
    const currentItemId = selectCurrentItemId(state);
    const sections: NoteSection[] = [
      {
        title: "目的",
        entries: [
          {
            title: `${selectClock(state)} · ${getArea(state.areaId).name}`,
            body: selectObjective(state),
            marker: String(selectStage(state)),
          },
          ...(currentItemId && (state.hintTierByItem[currentItemId] ?? 0) > 0
            ? [{
                title: "駅員のヒント",
                body: this.latestHintText(currentItemId),
                marker: "灯",
              }]
            : []),
        ],
      },
      {
        title: "忘れもの",
        entries: LOST_ITEM_DEFINITIONS
          .filter((item) => state.inventoryItemIds.includes(item.id) || state.returnedItemIds.includes(item.id))
          .map((item) => ({
            title: item.name,
            body: item.note,
            marker: state.returnedItemIds.includes(item.id) ? "返" : "拾",
          })),
      },
      {
        title: "手がかり",
        entries: CLUE_DEFINITIONS
          .filter((clue) => state.foundClueIds.includes(clue.id))
          .map((clue) => ({ title: clue.title, body: clue.notebookText, marker: "鍵" })),
      },
      {
        title: "記憶",
        entries: MEMORY_DEFINITIONS
          .filter((memory) => state.viewedMemoryIds.includes(memory.id))
          .map((memory) => ({ title: memory.title, body: memory.summary, marker: "憶" })),
      },
    ];
    this.ui.showNotebook(sections, () => this.resumeWorld());
    this.syncInputGate();
  }

  private openInventory(): void {
    if (!this.store.getState().started) return;
    const state = this.store.getState();
    const entries: InventoryEntry[] = LOST_ITEM_DEFINITIONS
      .filter((item) => state.inventoryItemIds.includes(item.id) || state.returnedItemIds.includes(item.id))
      .map((item) => ({
        itemId: item.id,
        name: item.name,
        description: item.inventoryDescription,
        returned: state.returnedItemIds.includes(item.id),
        symbol: item.visual.glyph,
      }));
    this.ui.showInventory(entries, () => this.resumeWorld());
    this.syncInputGate();
  }

  private openPause(): void {
    if (!this.store.getState().started || this.store.getState().activeEndingId) return;
    const entries: MenuEntry[] = [
      { label: "ゲームに戻る", primary: true, onSelect: () => this.resumeWorld() },
      { label: "操作方法", onSelect: () => this.showControlsAfterIntro(true) },
      { label: "設定", onSelect: () => this.openSettings("pause") },
      {
        label: "タイトルへ戻る",
        detail: "現在位置を自動保存します",
        onSelect: () => {
          this.store.dispatch({ type: "move-player", position: this.explorationScene.getPlayerPosition() });
          this.saveNow(true);
          this.renderTitle();
        },
      },
    ];
    this.ui.showMenu("ポーズ", "進行は自動で保存されています。", entries, () => this.resumeWorld());
    this.syncInputGate();
  }

  private openSettings(origin: "title" | "pause"): void {
    const state = this.store.getState();
    this.ui.showSettings(
      state.settings,
      {
        onChange: (settings: Partial<GameSettings>) => {
          this.store.dispatch({ type: "update-settings", settings });
        },
        onDeleteSave: () => {
          this.suppressPersistence = true;
          if (this.saveTimer !== null) {
            window.clearTimeout(this.saveTimer);
            this.saveTimer = null;
          }
          this.saveAdapter.clear();
          window.location.reload();
        },
      },
      () => {
        if (origin === "title") this.renderTitle();
        else this.openPause();
      },
    );
    this.syncInputGate();
  }

  private openRecords(): void {
    const viewed = this.store.getState().viewedEndingIds;
    const entries: RecordEntry[] = ENDING_DEFINITIONS.map((ending) => ({
      endingId: ending.id,
      label: ending.recordLabel,
      title: ending.title,
      unlocked: viewed.includes(ending.id),
      summary: ending.summary,
    }));
    this.ui.showRecords(entries, () => this.renderTitle());
    this.syncInputGate();
  }

  private latestHintText(itemId: ItemId): string {
    const item = getItem(itemId);
    const tier = this.store.getState().hintTierByItem[itemId] ?? 0;
    const hintId = item.hintDialogIds[Math.max(0, tier - 1)];
    const dialogue = getDialogue(hintId);
    return dialogue?.lines.map((line) => line.text).join("　") ?? item.objective;
  }

  private showDialogueById(
    id: string | undefined,
    onComplete?: () => void,
    fallbackSpeaker?: string,
    fallbackText?: string,
  ): void {
    this.showDialogue(dialogueView(getDialogue(id), fallbackSpeaker, fallbackText), onComplete);
  }

  private showDialogue(view: DialogueView, onComplete?: () => void): void {
    this.ui.showDialogue(view, () => {
      onComplete?.();
      if (!onComplete) this.resumeWorld();
    });
    this.syncInputGate();
  }

  private handleLockedExit(dialogId: string | undefined): void {
    this.showDialogueById(
      dialogId,
      undefined,
      "駅員",
      "その先はまだ暗い。時計が動けば、道も目を覚ますでしょう。",
    );
  }

  private resumeWorld(): void {
    this.ui.closeDialogue();
    this.ui.closeModal();
    this.ui.showGame();
    this.renderHud();
    this.syncInputGate();
  }

  private renderHud(): void {
    const state = this.store.getState();
    this.ui.updateHud({
      areaName: getArea(state.areaId).name,
      clock: selectClock(state),
      objective: selectObjective(state),
    });
  }

  private syncInputGate(): void {
    this.input.setModalActive(this.ui.isBlockingWorldInput);
  }

  private scheduleSave(): void {
    if (this.saveTimer !== null) window.clearTimeout(this.saveTimer);
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      this.saveNow(false);
    }, 900);
  }

  private saveNow(showFeedback: boolean): void {
    if (this.saveTimer !== null) {
      window.clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    if (this.suppressPersistence) return;
    if (!this.stateDirty) return;
    if (this.saveAdapter.save(this.store.getState())) {
      this.stateDirty = false;
      if (showFeedback) this.ui.showToast("自動セーブしました", 1_300);
    }
  }

  private readonly handleBeforeUnload = (): void => {
    if (!this.disposed && !this.suppressPersistence && this.stateDirty) {
      this.saveAdapter.save(this.store.getState());
    }
  };
}

export function createGameApplication(root: HTMLElement): GameApplication {
  return new GameApplication(root);
}
