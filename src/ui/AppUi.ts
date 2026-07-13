import type { GameSettings } from "../game/core/types";
import { GAME_META } from "../game/content/meta";
import type {
  DialogueView,
  EndingView,
  HudView,
  InventoryEntry,
  MemoryView,
  MenuEntry,
  NoteSection,
  RecordEntry,
  SettingsHandlers,
  TitleView,
  TouchHandlers,
} from "./types";

const TYPE_SPEED_MS: Readonly<Record<GameSettings["textSpeed"], number>> = {
  slow: 58,
  normal: 34,
  fast: 16,
  instant: 0,
};

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(entry: MenuEntry): HTMLButtonElement {
  const control = element("button", "menu-button");
  control.type = "button";
  control.disabled = entry.disabled ?? false;
  if (entry.primary) control.classList.add("menu-button--primary");
  if (entry.tone && entry.tone !== "default") control.classList.add(`menu-button--${entry.tone}`);

  const label = element("span", "menu-button__label", entry.label);
  control.append(label);
  if (entry.detail) control.append(element("small", "menu-button__detail", entry.detail));
  control.addEventListener("click", () => entry.onSelect());
  return control;
}

export class AppUi {
  public readonly canvasHost: HTMLDivElement;

  private readonly shell: HTMLDivElement;
  private readonly screenLayer: HTMLDivElement;
  private readonly hud: HTMLElement;
  private readonly areaLabel: HTMLSpanElement;
  private readonly clockLabel: HTMLTimeElement;
  private readonly objectiveLabel: HTMLParagraphElement;
  private readonly prompt: HTMLDivElement;
  private readonly toast: HTMLDivElement;
  private readonly modalLayer: HTMLDivElement;
  private readonly dialogueLayer: HTMLDivElement;
  private readonly touchLayer: HTMLDivElement;
  private readonly noteButton: HTMLButtonElement;
  private readonly inventoryButton: HTMLButtonElement;
  private readonly pauseButton: HTMLButtonElement;

  private textSettings: Pick<GameSettings, "textSpeed" | "showAllText"> = {
    textSpeed: "normal",
    showAllText: false,
  };
  private typingTimer: number | null = null;
  private dialogueAdvance: (() => void) | null = null;
  private modalClose: (() => void) | null = null;
  private toastTimer: number | null = null;

  public constructor(root: HTMLElement) {
    root.replaceChildren();
    this.shell = element("div", "app-shell");
    this.canvasHost = element("div", "game-world");
    this.canvasHost.id = "game-world";
    this.canvasHost.setAttribute("aria-label", "雨ノ間駅の探索画面");

    this.hud = element("header", "game-hud");
    this.hud.hidden = true;
    const location = element("div", "game-hud__location");
    location.append(element("span", "game-hud__line", "雨ノ間駅"));
    this.areaLabel = element("span", "game-hud__area", "待合室");
    location.append(this.areaLabel);

    const timePanel = element("div", "game-hud__clock");
    timePanel.append(element("span", "game-hud__clock-label", "STATION CLOCK"));
    this.clockLabel = element("time", "game-hud__clock-time", "00:00");
    timePanel.append(this.clockLabel);

    const tools = element("nav", "game-hud__tools");
    tools.setAttribute("aria-label", "ゲームメニュー");
    this.noteButton = this.makeToolButton("N", "ノート");
    this.inventoryButton = this.makeToolButton("I", "所持品");
    this.pauseButton = this.makeToolButton("Esc", "ポーズ");
    tools.append(this.noteButton, this.inventoryButton, this.pauseButton);
    this.hud.append(location, timePanel, tools);

    const objective = element("aside", "objective-chip");
    objective.append(element("span", "objective-chip__label", "いまの目的"));
    this.objectiveLabel = element("p", "objective-chip__text", "駅員に話を聞こう");
    objective.append(this.objectiveLabel);

    this.prompt = element("div", "interaction-prompt");
    this.prompt.hidden = true;
    this.prompt.setAttribute("role", "status");

    this.toast = element("div", "toast");
    this.toast.hidden = true;
    this.toast.setAttribute("role", "status");
    this.toast.setAttribute("aria-live", "polite");

    this.screenLayer = element("div", "screen-layer");
    this.modalLayer = element("div", "modal-layer");
    this.modalLayer.hidden = true;
    this.dialogueLayer = element("div", "dialogue-layer");
    this.dialogueLayer.hidden = true;
    this.touchLayer = this.createTouchControls();
    this.touchLayer.hidden = true;

    this.shell.append(
      this.canvasHost,
      this.hud,
      objective,
      this.prompt,
      this.toast,
      this.screenLayer,
      this.modalLayer,
      this.dialogueLayer,
      this.touchLayer,
    );
    root.append(this.shell);
  }

  public setGameMenuHandlers(handlers: {
    readonly onNote: () => void;
    readonly onInventory: () => void;
    readonly onPause: () => void;
  }): void {
    this.noteButton.addEventListener("click", () => {
      if (!this.isBlockingWorldInput) handlers.onNote();
    });
    this.inventoryButton.addEventListener("click", () => {
      if (!this.isBlockingWorldInput) handlers.onInventory();
    });
    this.pauseButton.addEventListener("click", () => {
      if (!this.isBlockingWorldInput) handlers.onPause();
    });
  }

  public bindTouchControls(handlers: TouchHandlers): void {
    const directionButtons = this.touchLayer.querySelectorAll<HTMLButtonElement>("[data-direction]");
    for (const control of directionButtons) {
      const direction = control.dataset.direction as "up" | "down" | "left" | "right";
      const activate = (event: Event): void => {
        event.preventDefault();
        control.classList.add("is-active");
        handlers.onDirection(direction, true);
      };
      const deactivate = (event: Event): void => {
        event.preventDefault();
        control.classList.remove("is-active");
        handlers.onDirection(direction, false);
      };
      control.addEventListener("pointerdown", activate);
      control.addEventListener("pointerup", deactivate);
      control.addEventListener("pointercancel", deactivate);
      control.addEventListener("pointerleave", deactivate);
    }

    const actionButtons = this.touchLayer.querySelectorAll<HTMLButtonElement>("[data-ui-action]");
    for (const control of actionButtons) {
      control.addEventListener("click", () => {
        const action = control.dataset.uiAction as "interact" | "note" | "inventory" | "pause";
        handlers.onAction(action);
      });
    }
  }

  public setTextSettings(settings: Pick<GameSettings, "textSpeed" | "showAllText" | "reducedMotion">): void {
    this.textSettings = settings;
    this.shell.dataset.reducedMotion = String(settings.reducedMotion);
  }

  public showTitle(view: TitleView): void {
    this.closeDialogue();
    this.closeModal();
    this.hud.hidden = true;
    this.touchLayer.hidden = true;
    this.screenLayer.hidden = false;
    this.syncBackgroundInteractivity();
    this.screenLayer.className = "screen-layer screen-layer--title";
    this.screenLayer.replaceChildren();

    const panel = element("main", "title-panel");
    panel.append(element("p", "title-panel__eyebrow", "A quiet station between memory and dawn"));
    const title = element("h1", "title-panel__title");
    title.append(document.createTextNode("雨宿り駅の"), element("span", "title-panel__title-accent", "忘れもの"));
    panel.append(title, element("p", "title-panel__tagline", GAME_META.tagline));

    const menu = element("nav", "title-menu");
    menu.setAttribute("aria-label", "タイトルメニュー");
    menu.append(
      button({ label: "はじめから", detail: "新しい夜を歩く", primary: true, onSelect: view.onNewGame }),
      button({
        label: "つづきから",
        detail: view.canContinue ? "最後の自動セーブから" : "セーブデータはありません",
        disabled: !view.canContinue,
        onSelect: view.onContinue,
      }),
      button({ label: "設定", detail: "音・文字・演出", onSelect: view.onSettings }),
      button({
        label: "記録",
        detail: `${view.viewedEndingCount} / 3 の結末`,
        onSelect: view.onRecords,
      }),
    );
    panel.append(menu, element("p", "title-panel__controls", "移動 WASD / 矢印 · 調べる E · ノート N"));
    this.screenLayer.append(panel);
    queueMicrotask(() => menu.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus());
  }

  public showGame(): void {
    this.screenLayer.hidden = true;
    this.hud.hidden = false;
    this.touchLayer.hidden = false;
    this.syncBackgroundInteractivity();
  }

  public updateHud(view: HudView): void {
    this.areaLabel.textContent = view.areaName;
    this.clockLabel.textContent = view.clock;
    this.clockLabel.dateTime = view.clock;
    this.objectiveLabel.textContent = view.objective;
    if (view.autosaveLabel) this.showToast(view.autosaveLabel, 1_400);
  }

  public showPrompt(label: string | null): void {
    if (!label) {
      this.prompt.hidden = true;
      this.prompt.replaceChildren();
      return;
    }
    this.prompt.replaceChildren(element("kbd", undefined, "E"), document.createTextNode(label));
    this.prompt.hidden = false;
  }

  public showToast(message: string, duration = 2_600): void {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.toast.textContent = message;
    this.toast.hidden = false;
    this.toast.classList.remove("toast--leave");
    this.toastTimer = window.setTimeout(() => {
      this.toast.classList.add("toast--leave");
      this.toastTimer = window.setTimeout(() => {
        this.toast.hidden = true;
        this.toast.classList.remove("toast--leave");
      }, 220);
    }, duration);
  }

  public showDialogue(view: DialogueView, onComplete?: () => void): void {
    this.closeDialogue();
    this.dialogueLayer.hidden = false;
    this.dialogueLayer.setAttribute("role", "dialog");
    this.dialogueLayer.setAttribute("aria-modal", "true");
    this.dialogueLayer.tabIndex = -1;
    this.syncBackgroundInteractivity();
    this.dialogueLayer.className = `dialogue-layer dialogue-layer--${view.tone ?? "station"}`;
    const portrait = element("div", "dialogue-portrait");
    portrait.setAttribute("aria-hidden", "true");
    const panel = element("section", "dialogue-panel");
    panel.setAttribute("aria-live", "polite");
    const speaker = element("h2", "dialogue-panel__speaker", view.speaker);
    const text = element("p", "dialogue-panel__text");
    const footer = element("div", "dialogue-panel__footer", "Enter / Space / クリックで送る");
    const actions = element("div", "dialogue-panel__actions");
    panel.append(speaker, text, actions, footer);
    this.dialogueLayer.append(portrait, panel);

    let lineIndex = 0;
    let typing = false;
    let completeLine = (): void => undefined;
    const finish = (): void => {
      if (view.actions && view.actions.length > 0) {
        footer.hidden = true;
        actions.replaceChildren(...view.actions.map((entry) => button({
          ...entry,
          onSelect: () => {
            this.closeDialogue();
            entry.onSelect();
          },
        })));
        actions.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
        this.dialogueAdvance = null;
      } else {
        this.closeDialogue();
        onComplete?.();
      }
    };

    const renderLine = (): void => {
      const line = view.lines[lineIndex] ?? "";
      const speed = this.textSettings.showAllText ? 0 : TYPE_SPEED_MS[this.textSettings.textSpeed];
      if (speed === 0) {
        text.textContent = line;
        typing = false;
        completeLine = (): void => undefined;
        return;
      }
      text.textContent = "";
      typing = true;
      let cursor = 0;
      const revealAll = (): void => {
        if (this.typingTimer !== null) window.clearInterval(this.typingTimer);
        this.typingTimer = null;
        text.textContent = line;
        cursor = line.length;
        typing = false;
      };
      completeLine = revealAll;
      this.typingTimer = window.setInterval(() => {
        cursor += 1;
        text.textContent = line.slice(0, cursor);
        if (cursor >= line.length) revealAll();
      }, speed);
    };

    const advance = (): void => {
      if (typing) {
        completeLine();
        return;
      }
      if (lineIndex < view.lines.length - 1) {
        lineIndex += 1;
        renderLine();
      } else {
        finish();
      }
    };
    this.dialogueAdvance = advance;
    panel.addEventListener("click", (event) => {
      const target = event.target;
      if (!(target instanceof Element && target.closest("button"))) advance();
    });
    renderLine();
    this.dialogueLayer.focus();
  }

  public showMenu(title: string, subtitle: string, entries: readonly MenuEntry[], onClose: () => void): void {
    const content = element("div", "modal-card__content menu-list");
    for (const entry of entries) content.append(button(entry));
    this.openModal(title, subtitle, content, onClose);
  }

  public showNotebook(sections: readonly NoteSection[], onClose: () => void): void {
    const content = element("div", "notebook");
    const tabs = element("div", "notebook__tabs");
    const pages = element("div", "notebook__pages");

    const activate = (index: number): void => {
      tabs.querySelectorAll("button").forEach((control, controlIndex) => {
        control.classList.toggle("is-active", controlIndex === index);
        control.setAttribute("aria-selected", String(controlIndex === index));
      });
      pages.querySelectorAll<HTMLElement>(".notebook__page").forEach((page, pageIndex) => {
        page.hidden = pageIndex !== index;
      });
    };

    sections.forEach((section, index) => {
      const tab = element("button", "notebook__tab", section.title);
      tab.type = "button";
      tab.setAttribute("role", "tab");
      tab.addEventListener("click", () => activate(index));
      tabs.append(tab);
      const page = element("section", "notebook__page");
      page.setAttribute("role", "tabpanel");
      if (section.entries.length === 0) page.append(element("p", "empty-copy", "まだ書かれていない。"));
      for (const entry of section.entries) {
        const article = element("article", "note-entry");
        if (entry.muted) article.classList.add("note-entry--muted");
        const heading = element("h3", "note-entry__title");
        if (entry.marker) heading.append(element("span", "note-entry__marker", entry.marker));
        heading.append(document.createTextNode(entry.title));
        article.append(heading, element("p", "note-entry__body", entry.body));
        page.append(article);
      }
      pages.append(page);
    });
    content.append(tabs, pages);
    this.openModal("ナギのノート", "拾った言葉を、忘れないように。", content, onClose, "modal-card--wide");
    activate(0);
  }

  public showInventory(entries: readonly InventoryEntry[], onClose: () => void): void {
    const content = element("div", "inventory-grid");
    if (entries.length === 0) content.append(element("p", "empty-copy", "手元には、まだ何もない。"));
    for (const entry of entries) {
      const item = element("article", "inventory-card");
      if (entry.returned) item.classList.add("inventory-card--returned");
      item.append(element("span", "inventory-card__symbol", entry.symbol));
      const copy = element("div", "inventory-card__copy");
      copy.append(
        element("h3", "inventory-card__name", entry.name),
        element("p", "inventory-card__description", entry.description),
        element("span", "inventory-card__state", entry.returned ? "返却済み" : "所持中"),
      );
      item.append(copy);
      content.append(item);
    }
    this.openModal("所持品", "拾ったものは、なくならない。", content, onClose);
  }

  public showControls(onClose: () => void): void {
    const content = element("div", "controls-guide");
    const controls: readonly [string, string, string][] = [
      ["WASD / 矢印", "歩く", "Shiftを押しながらでダッシュ"],
      ["E / Enter / Space", "調べる・決定", "近くの光や人に使う"],
      ["N", "ノート", "手がかりと次の目的を確認"],
      ["I", "所持品", "拾った忘れものを確認"],
      ["Escape", "ポーズ・戻る", "設定やタイトルへ戻る"],
      ["クリック / タッチ", "移動・調査", "光を選ぶと近くまで歩く"],
    ];
    for (const [keys, action, description] of controls) {
      const row = element("div", "control-row");
      row.append(
        element("kbd", "control-row__keys", keys),
        element("strong", "control-row__action", action),
        element("span", "control-row__description", description),
      );
      content.append(row);
    }
    const start = button({
      label: "駅を歩き始める",
      detail: "操作説明はポーズ画面から再確認できます",
      primary: true,
      onSelect: () => {
        this.closeModal();
        onClose();
      },
    });
    content.append(start);
    this.openModal("操作方法", "光る場所へ近づいて、調べてください。", content, onClose, "modal-card--wide");
  }

  public showSettings(
    settings: GameSettings,
    handlers: SettingsHandlers,
    onClose: () => void,
  ): void {
    const form = element("form", "settings-form");
    const ambient = this.createRange("環境音", settings.ambientVolume, (value) => handlers.onChange({ ambientVolume: value }));
    const effect = this.createRange("効果音", settings.effectVolume, (value) => handlers.onChange({ effectVolume: value }));
    const muted = this.createToggle("すべての音をミュート", settings.muted, (value) => handlers.onChange({ muted: value }));
    const showAll = this.createToggle("文章を一括表示", settings.showAllText, (value) => handlers.onChange({ showAllText: value }));
    const reduced = this.createToggle("演出を軽減", settings.reducedMotion, (value) => handlers.onChange({ reducedMotion: value }));

    const speedRow = element("label", "setting-row");
    speedRow.append(element("span", "setting-row__label", "文字表示速度"));
    const speed = element("select", "setting-row__select");
    const options: readonly [GameSettings["textSpeed"], string][] = [
      ["slow", "ゆっくり"],
      ["normal", "ふつう"],
      ["fast", "はやい"],
      ["instant", "一括"],
    ];
    for (const [value, label] of options) {
      const option = element("option", undefined, label);
      option.value = value;
      option.selected = value === settings.textSpeed;
      speed.append(option);
    }
    speed.addEventListener("change", () => handlers.onChange({ textSpeed: speed.value as GameSettings["textSpeed"] }));
    speedRow.append(speed);
    form.append(ambient, effect, muted, speedRow, showAll, reduced);

    if (handlers.onDeleteSave) {
      const danger = element("section", "settings-danger");
      danger.append(element("h3", undefined, "セーブデータ"));
      const deleteButton = button({
        label: "セーブデータを削除",
        detail: "進行・設定・記録を初期化します",
        tone: "danger",
        onSelect: () => this.showConfirmation(
          "本当に削除しますか？",
          "進行とエンディング記録は元に戻せません。",
          "削除する",
          handlers.onDeleteSave ?? (() => undefined),
          () => this.showSettings(settings, handlers, onClose),
        ),
      });
      danger.append(deleteButton);
      form.append(danger);
    }
    this.openModal("設定", "いつでも、自分に合う読み方へ。", form, onClose);
  }

  public showRecords(entries: readonly RecordEntry[], onClose: () => void): void {
    const content = element("div", "records-grid");
    for (const entry of entries) {
      const card = element("article", "record-card");
      if (!entry.unlocked) card.classList.add("record-card--locked");
      card.append(
        element("span", "record-card__label", entry.unlocked ? entry.label : "未記録"),
        element("h3", "record-card__title", entry.unlocked ? entry.title : "まだ見ていない結末"),
        element("p", "record-card__summary", entry.unlocked ? entry.summary : "雨の向こうに、別の選択が残っている。"),
      );
      content.append(card);
    }
    this.openModal("エンディング記録", "一度選んだ行き先は、ここに残る。", content, onClose);
  }

  public showMemory(view: MemoryView, onComplete: () => void): void {
    this.closeDialogue();
    this.closeModal();
    this.screenLayer.hidden = false;
    this.syncBackgroundInteractivity();
    this.screenLayer.className = "screen-layer screen-layer--memory";
    this.screenLayer.style.setProperty("--memory-accent", view.accent ?? "#f2a77e");
    this.screenLayer.replaceChildren();
    const card = element("main", "memory-scene");
    card.append(element("span", "memory-scene__label", "MEMORY"), element("h1", "memory-scene__title", view.title));
    const line = element("p", "memory-scene__line");
    const progress = element("div", "memory-scene__progress");
    view.lines.forEach((_value, index) => progress.append(element("span", index === 0 ? "is-active" : undefined)));
    const next = element("button", "memory-scene__next", "記憶をたどる");
    next.type = "button";
    card.append(line, progress, next);
    this.screenLayer.append(card);
    let index = 0;
    const render = (): void => {
      line.textContent = view.lines[index] ?? "";
      progress.querySelectorAll("span").forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
      next.textContent = index === view.lines.length - 1 ? "駅へ戻る" : "記憶をたどる";
    };
    next.addEventListener("click", () => {
      if (index < view.lines.length - 1) {
        index += 1;
        render();
      } else {
        this.screenLayer.hidden = true;
        this.syncBackgroundInteractivity();
        onComplete();
      }
    });
    render();
    next.focus();
  }

  public showEnding(view: EndingView, onCredits: () => void): void {
    this.closeDialogue();
    this.closeModal();
    this.hud.hidden = true;
    this.touchLayer.hidden = true;
    this.screenLayer.hidden = false;
    this.syncBackgroundInteractivity();
    this.screenLayer.className = `screen-layer screen-layer--ending screen-layer--${view.endingId}`;
    this.screenLayer.replaceChildren();
    const article = element("main", "ending-scene");
    article.append(
      element("span", "ending-scene__label", view.label),
      element("h1", "ending-scene__title", view.title),
    );
    const copy = element("div", "ending-scene__copy");
    for (const paragraph of view.paragraphs) copy.append(element("p", undefined, paragraph));
    article.append(copy);
    const continueButton = element("button", "ending-scene__continue", "クレジットへ");
    continueButton.type = "button";
    continueButton.addEventListener("click", onCredits);
    article.append(continueButton);
    this.screenLayer.append(article);
    continueButton.focus();
  }

  public showCredits(onTitle: () => void): void {
    this.screenLayer.hidden = false;
    this.syncBackgroundInteractivity();
    this.screenLayer.className = "screen-layer screen-layer--credits";
    this.screenLayer.replaceChildren();
    const article = element("main", "credits-scene");
    article.append(
      element("p", "credits-scene__eyebrow", "雨は、いつか上がる。"),
      element("h1", "credits-scene__title", GAME_META.title),
    );
    const list = element("dl", "credits-scene__list");
    const credits: readonly [string, string][] = [
      ["企画・物語", "Original browser game production"],
      ["ゲームエンジン", "Phaser 3"],
      ["描画・音", "Original procedural shapes / Web Audio"],
      ["フォント", "OS標準の日本語フォント"],
      ["素材", "外部画像・外部音源は使用していません"],
    ];
    for (const [term, description] of credits) {
      list.append(element("dt", undefined, term), element("dd", undefined, description));
    }
    const thanks = element("p", "credits-scene__thanks", "遊んでくださって、ありがとうございました。" );
    const titleButton = element("button", "credits-scene__button", "タイトルへ戻る");
    titleButton.type = "button";
    titleButton.addEventListener("click", onTitle);
    article.append(list, thanks, titleButton);
    this.screenLayer.append(article);
    titleButton.focus();
  }

  public showConfirmation(
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void,
    onCancel: () => void,
  ): void {
    const content = element("div", "confirmation");
    content.append(element("p", "confirmation__message", message));
    const actions = element("div", "confirmation__actions");
    actions.append(
      button({ label: "やめる", onSelect: onCancel }),
      button({ label: confirmLabel, tone: "danger", onSelect: onConfirm }),
    );
    content.append(actions);
    this.openModal(title, "この操作は取り消せません。", content, onCancel, "modal-card--compact");
  }

  public handleConfirm(): boolean {
    if (this.dialogueAdvance) {
      this.dialogueAdvance();
      return true;
    }
    return false;
  }

  public handleCancel(): boolean {
    if (!this.dialogueLayer.hidden) {
      if (this.dialogueAdvance) this.dialogueAdvance();
      else this.closeDialogue();
      return true;
    }
    if (this.modalClose) {
      this.modalClose();
      return true;
    }
    return false;
  }

  public get isBlockingWorldInput(): boolean {
    return !this.modalLayer.hidden || !this.dialogueLayer.hidden || !this.screenLayer.hidden;
  }

  public closeDialogue(): void {
    if (this.typingTimer !== null) window.clearInterval(this.typingTimer);
    this.typingTimer = null;
    this.dialogueAdvance = null;
    this.dialogueLayer.hidden = true;
    this.dialogueLayer.replaceChildren();
    this.syncBackgroundInteractivity();
  }

  public closeModal(): void {
    this.modalClose = null;
    this.modalLayer.hidden = true;
    this.modalLayer.replaceChildren();
    this.syncBackgroundInteractivity();
  }

  public destroy(): void {
    if (this.toastTimer !== null) window.clearTimeout(this.toastTimer);
    this.closeDialogue();
    this.closeModal();
    this.shell.remove();
  }

  private makeToolButton(key: string, label: string): HTMLButtonElement {
    const control = element("button", "hud-tool");
    control.type = "button";
    control.append(element("kbd", "hud-tool__key", key), element("span", "hud-tool__label", label));
    return control;
  }

  private createTouchControls(): HTMLDivElement {
    const root = element("div", "touch-controls");
    root.setAttribute("aria-label", "タッチ操作");
    const pad = element("div", "touch-pad");
    const directions: readonly [string, string, string][] = [
      ["up", "↑", "上へ移動"],
      ["left", "←", "左へ移動"],
      ["down", "↓", "下へ移動"],
      ["right", "→", "右へ移動"],
    ];
    for (const [direction, symbol, label] of directions) {
      const control = element("button", `touch-button touch-button--${direction}`, symbol);
      control.type = "button";
      control.dataset.direction = direction;
      control.setAttribute("aria-label", label);
      pad.append(control);
    }
    const actions = element("div", "touch-actions");
    const actionData: readonly [string, string, string][] = [
      ["note", "N", "ノート"],
      ["inventory", "持", "所持品"],
      ["interact", "調べる", "調べる・決定"],
      ["pause", "Ⅱ", "ポーズ"],
    ];
    for (const [action, symbol, label] of actionData) {
      const control = element("button", `touch-button touch-action touch-action--${action}`, symbol);
      control.type = "button";
      control.dataset.uiAction = action;
      control.setAttribute("aria-label", label);
      actions.append(control);
    }
    root.append(pad, actions);
    return root;
  }

  private openModal(
    title: string,
    subtitle: string,
    content: HTMLElement,
    onClose: () => void,
    modifier = "",
  ): void {
    this.closeDialogue();
    this.closeModal();
    this.modalLayer.hidden = false;
    this.syncBackgroundInteractivity();
    this.modalLayer.setAttribute("role", "dialog");
    this.modalLayer.setAttribute("aria-modal", "true");
    const card = element("section", `modal-card ${modifier}`.trim());
    const header = element("header", "modal-card__header");
    const heading = element("div");
    const titleId = `modal-title-${String(Date.now())}`;
    const titleNode = element("h2", "modal-card__title", title);
    titleNode.id = titleId;
    heading.append(titleNode, element("p", "modal-card__subtitle", subtitle));
    const close = element("button", "modal-card__close", "閉じる ×");
    close.type = "button";
    close.addEventListener("click", () => {
      this.closeModal();
      onClose();
    });
    header.append(heading, close);
    card.append(header, content);
    this.modalLayer.append(card);
    this.modalLayer.setAttribute("aria-labelledby", titleId);
    this.modalClose = () => {
      this.closeModal();
      onClose();
    };
    queueMicrotask(() => card.querySelector<HTMLElement>("button:not(:disabled), input, select")?.focus());
  }

  private syncBackgroundInteractivity(): void {
    const overlayOpen = !this.modalLayer.hidden || !this.dialogueLayer.hidden;
    const worldBlocked = overlayOpen || !this.screenLayer.hidden;
    this.screenLayer.toggleAttribute("inert", overlayOpen);
    this.canvasHost.toggleAttribute("inert", worldBlocked);
    this.hud.toggleAttribute("inert", worldBlocked);
    this.touchLayer.toggleAttribute("inert", worldBlocked);
  }

  private createRange(label: string, value: number, onChange: (value: number) => void): HTMLLabelElement {
    const row = element("label", "setting-row setting-row--range");
    const heading = element("span", "setting-row__label", label);
    const output = element("output", "setting-row__value", `${Math.round(value * 100)}%`);
    const input = element("input", "setting-row__range");
    input.type = "range";
    input.min = "0";
    input.max = "1";
    input.step = "0.05";
    input.value = String(value);
    input.addEventListener("input", () => {
      const next = Number(input.value);
      output.textContent = `${Math.round(next * 100)}%`;
      onChange(next);
    });
    row.append(heading, output, input);
    return row;
  }

  private createToggle(label: string, checked: boolean, onChange: (value: boolean) => void): HTMLLabelElement {
    const row = element("label", "setting-row setting-row--toggle");
    const input = element("input", "setting-row__checkbox");
    input.type = "checkbox";
    input.checked = checked;
    input.addEventListener("change", () => onChange(input.checked));
    row.append(input, element("span", "setting-row__label", label));
    return row;
  }
}
