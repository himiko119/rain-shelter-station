import { AREA_DEFINITIONS } from "../content";
import { selectCurrentItemId, selectStage } from "../core";
import type { AreaId, GameState } from "../core/types";

export const DEV_PANEL_SENTINEL = "__RAIN_SHELTER_DEV_PANEL__" as const;

export interface DevPanelDependencies {
  readonly snapshot: () => Readonly<GameState>;
  readonly onWarp: (areaId: AreaId) => void;
  readonly onAdvanceHint: () => void;
  readonly onResetRun: () => void;
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const control = document.createElement("button");
  control.type = "button";
  control.textContent = label;
  control.style.cssText = "padding:5px 7px;border:1px solid #6f99a8;border-radius:4px;color:#eef8f4;background:#173044;cursor:pointer;font:inherit";
  control.addEventListener("click", onClick);
  return control;
}

export function mountDevPanel(dependencies: DevPanelDependencies): () => void {
  const panel = document.createElement("aside");
  panel.dataset.sentinel = DEV_PANEL_SENTINEL;
  panel.hidden = true;
  panel.setAttribute("aria-label", "開発用ゲーム状態パネル");
  panel.style.cssText = "position:fixed;z-index:1000;top:10px;left:10px;width:min(390px,calc(100vw - 20px));max-height:calc(100vh - 20px);overflow:auto;padding:10px;border:1px solid #78b7bf;border-radius:7px;color:#e9f5ef;background:rgba(4,16,28,.94);box-shadow:0 8px 30px rgba(0,0,0,.45);font:12px/1.45 ui-monospace,Consolas,monospace";

  const heading = document.createElement("strong");
  heading.textContent = "雨ノ間駅 DEV · F2で開閉";
  const status = document.createElement("pre");
  status.style.cssText = "margin:8px 0;white-space:pre-wrap";
  const areas = document.createElement("div");
  areas.style.cssText = "display:flex;flex-wrap:wrap;gap:5px;margin:7px 0";
  const utilities = document.createElement("div");
  utilities.style.cssText = "display:flex;flex-wrap:wrap;gap:5px";

  const areaButtons = AREA_DEFINITIONS.map((area) => {
    const control = makeButton(area.name, () => dependencies.onWarp(area.id));
    areas.append(control);
    return { area, control };
  });
  utilities.append(
    makeButton("ヒント時間 +90秒", dependencies.onAdvanceHint),
    makeButton("ランを初期化", dependencies.onResetRun),
  );
  panel.append(heading, status, areas, utilities);
  document.body.append(panel);

  const render = (): void => {
    const state = dependencies.snapshot();
    const stage = selectStage(state);
    status.textContent = [
      `revision=${state.revision}  started=${String(state.started)}  stage=${String(stage)}`,
      `area=${state.areaId}  pos=${state.playerPosition.x},${state.playerPosition.y}/${state.playerPosition.facing}`,
      `current=${selectCurrentItemId(state) ?? "ending"}`,
      `inventory=${state.inventoryItemIds.join(",") || "-"}`,
      `clues=${String(state.foundClueIds.length)}  returned=${state.returnedItemIds.join(",") || "-"}`,
      `pendingMemory=${state.pendingMemoryId ?? "-"}  ending=${state.activeEndingId ?? "-"}`,
    ].join("\n");
    for (const { area, control } of areaButtons) {
      control.disabled = !state.started || area.availableFromStage > stage;
      control.style.opacity = control.disabled ? "0.45" : "1";
      control.style.cursor = control.disabled ? "not-allowed" : "pointer";
    }
  };
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.code !== "F2") return;
    event.preventDefault();
    panel.hidden = !panel.hidden;
    if (!panel.hidden) render();
  };
  window.addEventListener("keydown", onKeyDown);
  const interval = window.setInterval(() => {
    if (!panel.hidden) render();
  }, 250);

  return () => {
    window.clearInterval(interval);
    window.removeEventListener("keydown", onKeyDown);
    panel.remove();
  };
}
