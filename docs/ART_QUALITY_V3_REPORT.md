# Art Quality V3 — Completion Report

## Outcome

「雨宿り駅の忘れもの」の画面を、既存の進行・当たり判定・save schemaを変えず、project-originalの静的アートを主表示にする構成へ更新した。タイトルから5エリア、7人物、6忘れもの、6記憶、最終選択、3エンディングまで同じart directionで通している。静的画像が欠けても既存procedural/CSS表現へ戻り、進行は継続する。

## Workflow and tool roles

1. Mood Board Explorer: 既存20画面と8点の生成方向を16タイルで比較した。
2. Product Design / Ideate: UI案をA/B/Cの3案だけ作り、品質・統一感・操作性・実装可能性で採点した。
3. ImageGen / Sprite Pipeline: 背景、人物、sprite strip、忘れもの、記憶、story stillを制作・正規化した。
4. Product Design / Image to Code + Game UI Frontend: 採用案Aを既存DOM semanticsとPhaser描画層へ実装した。
5. Design QA: sourceとbrowser captureを同一comparison imageへ置き、desktopとmobileを比較した。
6. Game Playtest: 通常操作、save、誤返却、hint、3 ending、touch、404 fallbackをPlaywrightで確認した。

Generative Polishはタイトルkey visualだけに限定した。Figmaは、既存browser画面・Option A・実装screenshotが正確なsource of truthであり、別の同期対象を増やす効果が小さいため使用していない。

## Direction selection

| Option | Quality | Cohesion | Usability | Feasibility | Total |
| --- | ---: | ---: | ---: | ---: | ---: |
| A — Quiet Signage | 5 | 5 | 5 | 5 | 20/20 |
| B — Picture-book Paper | 4 | 4 | 4 | 4 | 16/20 |
| C — Instrument Panel | 4 | 4 | 3 | 5 | 16/20 |

Option Aを採用した。濃紺の駅名標、琥珀の焦点、生成りの本文、最小限のcoral accentが既存物語と最も一致し、1280×720と390×844の双方へ安全に落とし込めた。

## Delivered art

| Family | Count | Runtime format / size |
| --- | ---: | --- |
| Area backgrounds | 7 | WebP, 1120×630 |
| Nagi animation strips | 10 | alpha PNG, 96×112 cells |
| Passenger idle strips | 6 | alpha PNG, 3 cells each |
| Dialogue portraits | 17 | alpha WebP, 512×640 |
| Shared lost items | 6 | alpha PNG, 512×512 |
| Memory stills | 6 | WebP, 1120×630 |
| Title / final choice | 2 | WebP, 1280×720 |
| Ending stills | 3 | WebP, 1280×720 |
| Total manifest assets | 57 | 4,048,796 bytes |

Large generation sources, mattes and rejected candidates were removed from the repository after normalization. The compact approved mood board, three UI options, runtime assets and review contact sheets remain.

## Runtime architecture

- `src/game/assets/staticArtManifest.ts` owns stable keys, relative paths, declared dimensions, byte budgets, project-original provenance and fallback strategy.
- Phaser preloads only backgrounds, sprites and world items. DOM portraits and stills load lazily/eagerly at the point of use.
- Nagi uses separate up/down/left/right idle and walk strips plus inspect/acquire one-shots. The 25×23 physics body and existing world coordinates are unchanged.
- Passenger and item art resolve from `OwnerId` / `ItemId`; dialogue portraits resolve from `DialogueSpeaker`; memory and ending art resolve from `MemoryId` / `EndingId`. Display-name inference was removed.
- Platform background changes from rain night to last train at stage 5 and dawn at stage 6.
- A failed image removes itself or falls back to the pre-existing procedural representation. Broken-image chrome is never shown.

## Visual QA score

Scores are 1–5 after browser capture review.

| Surface | Score |
| --- | ---: |
| Illustration finish | 4.8 |
| Cross-screen consistency | 4.7 |
| Place recognition | 4.8 |
| Protagonist visibility | 4.4 |
| Depth and composition | 4.7 |
| Light / shadow storytelling | 4.8 |
| Interaction target clarity | 4.4 |
| UI harmony | 4.7 |
| Emotional communication | 4.7 |
| Mobile readability | 4.5 |
| Average | 4.65 |

No category is 2 or below. Formal Design QA has no remaining actionable P0/P1/P2 finding; see `design-qa.md`.

## Verification results

| Check | Result |
| --- | --- |
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run test` | 9 files / 75 tests passed |
| `npm run test:e2e` | 13/13 passed |
| `npm run build` | passed |
| `npm run check` | passed |
| Manifest decode | 57/57 passed |
| Forced waiting-room 404 | procedural fallback remained playable |
| Before evidence | 20 screenshots |
| After evidence | 20 screenshots |

The only build warning is Vite's non-failing 500kB chunk warning for the Phaser-containing JavaScript bundle.

## Evidence

- Mood board: `artifacts/art-quality-v3/design/moodboard/app/mood-board.html`
- UI options: `artifacts/art-quality-v3/design/ideate/`
- Before: `artifacts/art-quality-v3/before/`
- After: `artifacts/art-quality-v3/after/`
- Source/implementation comparisons: `artifacts/art-quality-v3/review/`
- Design QA: `design-qa.md`

## Remaining non-blockers

- System Japanese font metrics may differ slightly on untested operating systems.
- Mobile intentionally prioritizes text over large dialogue portraits.
- Phaser is still delivered in one large initial JavaScript chunk.
- Static scenery is presentation-only; authoritative collision and exits remain the tested content geometry.

## Production release

PR [#1](https://github.com/himiko119/rain-shelter-station/pull/1) merged V3 into the Pages branch as `a55f3facfbf85cfb2c966be09a2fb0cc0823a15f`. Actions run [29355517252](https://github.com/himiko119/rain-shelter-station/actions/runs/29355517252) completed build and deploy successfully. The public URL passed Chromium desktop, Chromium 390×844 touch and Microsoft Edge checks with running audio, successful save/reload and zero browser/network errors.
