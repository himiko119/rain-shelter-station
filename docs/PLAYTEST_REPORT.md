# Playtest Report — Art Quality V3

## Result

2026-07-15のローカルrelease candidateは、必須の静的検査、通常操作ルート、E2E、desktop/mobile画面確認、Design QAをすべて通過した。save schema、content ID、collision、hotspot、ending条件はV2から変更していない。

## Automated verification

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

## Browser routes covered

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

## Screenshot evidence

### Before

`artifacts/art-quality-v3/before/` contains 15 desktop and 5 mobile V2 captures.

### After

`artifacts/art-quality-v3/after/` contains 16 desktop and 4 mobile V3 captures:

| File group | States |
| --- | --- |
| `01`–`06` | title and five station areas |
| `07`–`12` | dialogue, notebook, inventory, acquisition, memory, final choice |
| `13`, `17`, `18` | endings B, A, C |
| `16` | settings |
| mobile `14`, `15`, `19`, `20` | exploration, notebook, inventory, dialogue |

All 20 after images were opened and reviewed. `artifacts/art-quality-v3/review/compare-*.jpg` places old and new captures together. `design-qa-full.jpg` and `design-qa-focused.jpg` place the selected Option A source next to the live browser implementation.

## Visual review

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

## Save compatibility

- storage key: `rain-shelter-station.save.v1`
- schema: `saveVersion: 1`
- version-0 migration: unchanged
- malformed, unknown-ID and future-version rejection: unchanged and unit-tested

Static art state is not serialized. Loading or failing an image cannot alter progression or save validity.

## Performance and resilience

- Runtime static image total: 4,048,796 bytes.
- Backgrounds and story stills are WebP; alpha sprites and item art use optimized PNG/WebP.
- Phaser preloads world-consumed images; DOM stills load when needed.
- Re-entering a Scene does not duplicate registered animation keys.
- Reduced-motion freezes decorative loops and uses static action frames.

## Remaining non-blockers

- Firefox/WebKit do not have the same depth of automated coverage as Chromium.
- System Japanese font metrics can vary by OS.
- Phaser remains part of one large initial JavaScript chunk.
- Mobile intentionally omits large dialogue busts to preserve text area.
