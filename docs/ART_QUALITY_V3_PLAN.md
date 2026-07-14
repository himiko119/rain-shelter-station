# Art Quality V3 Plan

## Goal

「雨宿り駅の忘れもの」を、既存の進行・セーブ・衝突・入力を維持したまま、手続き図形中心の画面から静的イラストとコード演出のハイブリッドへ移行する。

## Fixed constraints

- ワールド座標は `1120 × 630` のままにする。
- `saveVersion: 1`、storage key、全stable ID、進行条件を変えない。
- 背景画像へゲーム座標を合わせず、画像を既存座標へ正規化する。
- 雨、波紋、反射、灯り、夜明け、フェード、カメラ、調査表示はコードで重ねる。
- 静的画像が欠けても、既存のPhaser Graphics / CSS描画へ安全に戻る。
- 画像内へ日本語や案内文字を焼き込まず、正確なDOMまたはPhaser Textを使う。

## Baseline

- Branch before work: `codex/visual-overhaul-v2` at `72cf5b0`.
- `npm install`: success, 0 vulnerabilities.
- `npm run check`: success; Vitest 57 tests, production sentinel and build passed.
- Baseline Playwright suite was launched before changes. The game reached its expected states, but concurrent desktop tooling caused a browser-context teardown timeout. The committed V2 release evidence records 11/11; V3 must finish with a clean isolated run at no fewer than 11 tests.
- 15 desktop and 5 mobile reference frames are fixed under `artifacts/art-quality-v3/before`.

## Design workflow

1. **Mood Board Explorer** — 16 tiles combine eight new original visual-direction images with eight shipped-product anchors.
2. **Product Design / Ideate** — three independent 1280×720 UI concepts use the same source screenshots.
3. **Self-selection** — score consistency, readability, playfield protection, mobile translation and implementation risk.
4. **Image to Code** — implement the selected target against exact browser screenshots.
5. **Sprite Pipeline** — approve one Nagi seed, then generate strip-level animation families and normalize bottom-center anchors.
6. **Design QA** — compare reference and implementation at matching viewports; record `design-qa.md` with `final result: passed`.
7. **Game Playtest** — complete normal-input, save, endings, responsive and asset-failure routes.

Figma is intentionally skipped. This project already has a working DOM/CSS design system and exact browser states; introducing a second editable source would add synchronization cost without improving the direct reference-to-browser comparison.

## UI option selection

| Option | Visual unity | Text clarity | Playfield protection | 390px translation | Feasibility | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| A — Quiet Station Signage | 5 | 5 | 5 | 5 | 5 | **25** |
| B — Rainy Picture-Book Page | 4 | 4 | 3 | 2 | 3 | 16 |
| C — Last-Train Instrument Panel | 4 | 5 | 2 | 2 | 3 | 16 |

Option A is selected. It keeps the current information hierarchy, uses the smallest persistent surfaces, leaves the illustrated station visible, and translates to mobile without paper tabs or a full hardware frame.

Design evidence:

- Mood board: `artifacts/art-quality-v3/design/moodboard/app/mood-board.html`
- Selected option: `artifacts/art-quality-v3/design/ideate/option-a-quiet-signage.png`
- Rejected explorations remain in the design evidence folder only and are not shipped as runtime assets.

## Delivery phases

### A1 — Direction and evidence

- Freeze before screenshots.
- Create mood board, three UI options, style bible, manifest contract, sprite specification and QA checklist.
- Commit as `docs: define art quality v3 direction`.

### A2 — Static-art foundation

- Add shared visual tokens.
- Add typed stable-key manifest and Pages-safe URL resolver.
- Preload static assets, record failures, and expose deterministic E2E diagnostics.
- Keep procedural fallbacks.
- Add environment-object sync validation.

### A3 — Waiting-room vertical slice

- Illustrated waiting room, Nagi, station attendant, child, umbrella, portrait, memory art, title UI, rain and light.
- Compare 1280×720 and 390×844 against selected target before propagating.

### A4–A6 — Full art replacement

- Remaining four environments and platform time variants.
- Nagi animation families, attendant and five passengers, portraits and six shared items.
- Six memories, final choice, title and three distinct endings.

### A7–A8 — UI, QA and release

- Reduce HUD/dialogue chrome, preserve notebook/inventory metaphors and accessibility.
- Generate all after evidence and sprite/item/portrait/memory preview sheets.
- Run full commands, normal-input playtest, static-asset failure route and save compatibility checks.
- Commit by meaningful phase, push, integrate through the current Pages branch, verify production desktop/mobile/Edge and asset 404s.

## Definition of done

- Five visibly distinct illustrated areas.
- Nagi has readable four-direction idle/walk plus inspect/acquire actions.
- Seven individually recognizable station characters and illustrated dialogue portraits.
- Six shared item assets and six coherent memory illustrations.
- Title, final choice and three endings use separate compositions.
- Runtime static art stays within the documented budget and never becomes required for progression.
- All required commands and production checks pass; after screenshots and review documentation are complete.
