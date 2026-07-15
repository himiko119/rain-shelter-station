# Playtest Report — Art Integration V4

## V4 result

Art Integration V4は、背景画像を表示するだけだったV3の探索空間へ、5エリア固有の歩行可能ポリゴン、家具・壁・手すり・線路端の障害物ポリゴン、出口トリガー、ホットスポットの表示位置と接近位置を統合した。ナギの論理座標は足元で統一し、キーボード移動とポインター経路はいずれも障害物から14pxのクリアランスを保つ。

セーブ形式は引き続き `saveVersion: 1`、storage keyは `rain-shelter-station.save.v1` である。既存v1セーブの座標がV4の安全領域外にある場合は、ロード時に同一エリア内の最寄り安全点へ決定論的に補正する。進行、所持品、手がかり、記憶、エンディング記録、設定、向きは変更しない。

## V4 automated verification

| Command / gate | Recorded result |
| --- | --- |
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run test` | 94 Vitest tests passed |
| `npm run test:visual-geometry` | 15 focused geometry Vitest tests and 14 visual-geometry Playwright E2E tests passed |
| `npm run verify:stage-layout` | 9 stage-layout Playwright E2E tests passed |
| `npm run test:e2e` | 37/37 Playwright tests passed |
| `npm run build` / `npm run verify:prod` | passed; production bundle contains no E2E/dev sentinel |
| `npm run check` | passed |
| Local production smoke | Chromium desktop, Chromium 390×844 touch, Edge, Firefox passed; audio running, save/reload passed, errors 0 |

`npm run test:visual-geometry` covers named scenarios, real keyboard and pointer input, 14px-safe feet, walls/windows/furniture/track edges, hotspot approaches, exit polygons, pointer waypoints, actor perspective, marker reveal and environmental effects. `npm run verify:stage-layout` covers the shared Canvas/DOM stage at 1280×720, 1366×768, 1536×864, 1920×1080, 2560×1440, 390×844 and 844×390, plus desktop/mobile dialogue containment.

The complete V4 local gate and the published GitHub Pages smoke are recorded. The public bundle filenames match the release build and all four browser profiles passed.

## V4 screenshot and video evidence

`npm run capture:art-integration` generated the V4 after evidence under `artifacts/art-integration-v4/after/`.

| Artifact path | Contents |
| --- | --- |
| `artifacts/art-integration-v4/after/desktop-1280/` | 19 screenshots: five areas, near/far and occlusion positions, dialogue, notebook, inventory, memory and final choice |
| `artifacts/art-integration-v4/after/desktop-1920/` | 1 screenshot at 1920×1080 |
| `artifacts/art-integration-v4/after/mobile-390/` | 4 screenshots: 390×844 exploration/dialogue/notebook and 844×390 landscape |
| `artifacts/art-integration-v4/after/video/` | five 11–13 second WebM movement routes, one per area |
| `artifacts/art-integration-v4/review/` | desktop, mobile, before/after and video contact sheets plus sampled video frames |

The 24 after screenshots are numbered `01`–`24` across the three viewport folders. The five movement recordings are:

- `artifacts/art-integration-v4/after/video/01-waiting-room-after.webm`
- `artifacts/art-integration-v4/after/video/02-concourse-after.webm`
- `artifacts/art-integration-v4/after/video/03-office-after.webm`
- `artifacts/art-integration-v4/after/video/04-footbridge-after.webm`
- `artifacts/art-integration-v4/after/video/05-platform-after.webm`

The V4 evidence is separate from the retained baseline in `artifacts/art-integration-v4/before/` and the earlier Art Quality V3 evidence in `artifacts/art-quality-v3/`.

The local production-build browser matrix is captured in `artifacts/playtest/11-production-desktop-1280x720.png` through `14-production-firefox-1280x720.png`. All four frames were opened and visually reviewed after the automated zero-error, audio, save/reload, layout, and asset checks passed.

## V4 production verification

PR [#2](https://github.com/himiko119/rain-shelter-station/pull/2) merged as `27b3874cd748d20abe99f396109d40b2f8677bd7`. GitHub Actions run [29396133571](https://github.com/himiko119/rain-shelter-station/actions/runs/29396133571) built and deployed Pages deployment `5453065521` successfully at 2026-07-15 16:04:43 JST.

`npm run verify:live` then exercised <https://himiko119.github.io/rain-shelter-station/> in Chromium 149 desktop, Chromium 149 at 390×844 touch, Edge 150, and Firefox 151. Every profile started from title, displayed Canvas and DOM HUD, reached `AudioContext: running` after the user gesture, wrote and restored the save, served the favicon and runtime assets without 404, exposed no production E2E bridge, and emitted zero console, page, request, or HTTP errors. The live JS/CSS filenames matched the final local build.

The final deep smoke added a 1920×1080 normal-input route. Its stage and Canvas measured exactly 1920×1080 and remained centered. Without a production debug bridge, it acquired the red umbrella, investigated the footprints, returned the item to the child, opened the memory, confirmed clock progression to `00:18`, reloaded, and restored the save. A separate valid-save matrix opened all five production areas and confirmed movement plus a nearby investigation in each. The six captured states were opened and visually reviewed; browser, request, HTTP, console, and page error counts remained zero.

## Historical Art Quality V3 record

### Result

2026-07-15のローカルrelease candidateは、必須の静的検査、通常操作ルート、E2E、desktop/mobile画面確認、Design QAをすべて通過した。save schema、content ID、collision、hotspot、ending条件はV2から変更していない。

### Automated verification

| Command / gate | Result |
| --- | --- |
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run test` | 9 files / 75 tests passed |
| `npm run test:e2e` | 13/13 passed in Chromium |
| `npm run build` | passed |
| `npm run check` | passed |
| production sentinel | 1 JS bundle verified; no E2E/dev bridge |
| manifest | 57 unique images, dimensions and budgets passed |

Vite emitted the known non-failing warning that the Phaser-containing JavaScript chunk exceeds 500kB.

### Browser routes covered

- Title → start → controls → waiting room
- Normal keyboard movement → red umbrella acquisition → correct passenger return → memory → save reload
- Wrong return with item retention and staged hint progression
- Pause, sound/text/reduced-motion settings and focusable controls
- Save deletion, settings reset and ending-record reset
- A「終電」、B「始発」、C「雨宿り」through the actual final-choice UI
- 390×844 touch movement, interact, notebook, inventory and pause
- All 57 manifest images through `Image.decode()`
- Forced waiting-room background 404 followed by playable procedural fallback

The E2E fixture treats console error, page error, failed request and unexpected HTTP 4xx/5xx as failure. The intentional 404 test is isolated and asserts continued movement after the forced failure.

### Screenshot evidence

#### Before

`artifacts/art-quality-v3/before/` contains 15 desktop and 5 mobile V2 captures.

#### After

`artifacts/art-quality-v3/after/` contains 16 desktop and 4 mobile V3 captures:

| File group | States |
| --- | --- |
| `01`–`06` | title and five station areas |
| `07`–`12` | dialogue, notebook, inventory, acquisition, memory, final choice |
| `13`, `17`, `18` | endings B, A, C |
| `16` | settings |
| mobile `14`, `15`, `19`, `20` | exploration, notebook, inventory, dialogue |

All 20 after images were opened and reviewed. `artifacts/art-quality-v3/review/compare-*.jpg` places old and new captures together. `design-qa-full.jpg` and `design-qa-focused.jpg` place the selected Option A source next to the live browser implementation.

### Visual review

| Surface | Result |
| --- | --- |
| Title | full-bleed key art, title and four menu actions remain readable |
| Areas | five places are immediately distinguishable by architecture and light |
| Nagi | red scarf/hair silhouette readable; four-direction movement and actions load |
| Passengers | six NPC identities remain distinct at world and portrait scale |
| Dialogue | portrait, speaker plate, body copy and advance hint do not overlap |
| Inventory | shared item image, name, description and held/returned state are explicit |
| Memory | story still, title, text, progress and return action read as one scene |
| Final / endings | choice art and all three outcome compositions are unique |
| 390×844 | no horizontal overflow; world, objective and controls remain vertically separated |

Formal Design QA result: `passed`. Average visual score: 4.65/5; no category is 2 or below.

### Save compatibility

- storage key: `rain-shelter-station.save.v1`
- schema: `saveVersion: 1`
- version-0 migration: unchanged
- malformed, unknown-ID and future-version rejection: unchanged and unit-tested

Static art state is not serialized. Loading or failing an image cannot alter progression or save validity.

### Performance and resilience

- Runtime static image total: 4,048,796 bytes.
- Backgrounds and story stills are WebP; alpha sprites and item art use optimized PNG/WebP.
- Phaser preloads world-consumed images; DOM stills load when needed.
- Re-entering a Scene does not duplicate registered animation keys.
- Reduced-motion freezes decorative loops and uses static action frames.

### Remaining non-blockers

- Firefox now has the same production-smoke route as desktop Chromium and Edge; WebKit does not have equivalent depth of automation.
- System Japanese font metrics can vary by OS.
- Phaser remains part of one large initial JavaScript chunk.
- Mobile intentionally omits large dialogue busts to preserve text area.

### Historical production verification — V3 only

GitHub Pages release `a55f3fa` was verified at <https://himiko119.github.io/rain-shelter-station/>. Chromium desktop, Chromium 390×844 touch and Microsoft Edge each passed start, Canvas/DOM visibility, AudioContext `running`, save/reload, favicon/network, production-debug absence and zero-error checks. The three public screenshots in `artifacts/playtest/11-production-*` through `13-production-*` were opened after a stable post-fade capture and passed visual review.

This production record applies to Art Quality V3. It is not evidence that Art Integration V4 has been deployed or production-verified.
