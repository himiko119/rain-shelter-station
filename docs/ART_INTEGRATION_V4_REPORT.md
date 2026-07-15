# Art Integration V4 — Final Integration Report

## Status summary

Art Integration V4 changes the five static station illustrations from presentation backdrops into authored 2.5D stages. The current code connects each background to walkable geometry, furniture/architecture obstacles, exits, hotspot approaches, depth scale, actor grounding, lighting, rain, ripples, reflections, and foreground occlusion. Canvas and DOM UI now share one responsive stage.

The committed visual evidence and completed local release gates support the V4 design/spatial acceptance result: **8.73 / 10**, with no open P0 or P1 finding in the audited scope. GitHub-hosted CI, deployment, and V4 public-site verification remain pending.

## Root causes addressed

1. Desktop camera zoom was capped below the value needed to fill Full HD, while camera bounds pulled the undersized world to the upper-left.
2. Movement, exits, hotspots, furniture, and effects still used coordinates from the procedural layout instead of the static illustrations.
3. Actors used fixed display scale and weak grounding, without per-area depth or light response.
4. Every active hotspot exposed a persistent marker and procedural labels remained visible over static art.
5. Canvas and DOM overlays were viewport siblings rather than layers of one stage.
6. V3 QA prioritized illustration finish and mockup similarity, but did not gate spatial containment, motion, occlusion, Full-HD occupancy, or effect-mask alignment.

The original failures and evaluation gap remain documented in `docs/ART_INTEGRATION_V4_AUDIT.md`.

## Stage and camera integration

`src/ui/AppUi.ts` now mounts `.game-world` and `.game-stage-ui` inside `.game-stage`. HUD, objective, prompts, dialogue, modal, screen, and touch layers therefore use the same stage coordinate system as the Phaser canvas. `src/styles/main.css` keeps the desktop stage centered at 16:9, fills portrait viewports intentionally, and provides dedicated 390×844 and 844×390 layouts.

The visible result is captured in:

- Before: `artifacts/art-integration-v4/before/desktop-1920/01-waiting-room-1920x1080.png`
- After: `artifacts/art-integration-v4/after/desktop-1920/01-waiting-room-1920x1080.png`
- Comparison: `artifacts/art-integration-v4/review/before-after-contact-sheet.jpg`

The after image fills 1920×1080 without the previous right/bottom void. The landscape mobile capture uses equal side margins rather than a one-sided crop: `artifacts/art-integration-v4/after/mobile-390/24-landscape-844x390.png`.

## Authored area geometry

`src/game/content/areaArtLayouts.ts` is the shared source for each area's:

- walkable polygon and furniture/architecture obstacle polygons;
- exit visual anchors, approach points, and trigger zones;
- hotspot visual anchors, approach points, and reveal radius;
- far/near depth profile;
- light, rain, ripple, reflection, and occluder definitions.

Keyboard and pointer movement use the actor's foot point rather than the image rectangle. Unsafe restored positions are projected to a deterministic safe point while story progress and IDs remain unchanged.

| Area | Main spatial alignment | Committed evidence |
| --- | --- | --- |
| Waiting room | Window/wall boundary, umbrella rack, center/window benches, booth, rain windows, warm lamp | `after/desktop-1280/03-waiting-room-far.png` through `07-photo-booth.png`; `after/video/01-waiting-room-after.webm` |
| Concourse | Counter, ticket machines, gate bank, phone, benches, gate approaches | `08-concourse.png`, `09-concourse-gates.png`; `after/video/02-concourse-after.webm` |
| Station office | Desk/chair foreground, shelving, refrigerator, rear door, ledger/key approaches | `10-station-office.png`, `11-behind-desk.png`; `after/video/03-office-after.webm` |
| Footbridge | Perspective corridor, stair opening, railings, window rain, fluorescent/warm depth lights | `12-footbridge.png`, `13-footbridge-railing.png`; `after/video/04-footbridge-after.webm` |
| Rain platform | Diagonal safe platform edge, track exclusion, bench/machine/column structure, outdoor rain/reflection | `14-rain-platform.png`, `15-platform-edge.png`; `after/video/05-platform-after.webm` |

## Actors, depth, grounding, and NPC placement

Per-area depth profiles interpolate final actor scale between authored far and near Y positions. Actor imagery remains bottom-center anchored; attached floor shadows, restrained vertical reflections, rim response, and light-zone influence are updated from the actor foot point.

NPCs are composed on floor positions rather than bench surfaces. The red-boots child and old listener are no longer presented as standing on furniture. The office, bridge, and platform samples show the player remaining on their illustrated floor plane as depth changes.

The strongest motion comparison is `artifacts/art-integration-v4/review/video-contact-sheet.jpg`, backed by the t=2s/t=6s frames in `artifacts/art-integration-v4/review/video-frames/`.

## Foreground occlusion

Static background crops are reused for foreground occluders rather than replaced with invented scenery. Definitions cover the waiting-room rack/benches/booth, concourse counter/gates/machines/benches, office desk/chair/shelf, bridge rail/stair structure, and platform foreground architecture. Depth ordering is derived from authored occluder thresholds so actors can pass behind visible furniture while remaining in front of the floor.

Representative evidence:

- `artifacts/art-integration-v4/after/desktop-1280/05-behind-umbrella-rack.png`
- `artifacts/art-integration-v4/after/desktop-1280/11-behind-desk.png`
- `artifacts/art-integration-v4/after/desktop-1280/13-footbridge-railing.png`

## Lighting, rain, ripples, and reflections

Static-art scenes now consume the active `AreaArtLayout` rather than legacy procedural coordinates. Light zones correspond to visible lamps, windows, machines, fluorescent fixtures, and platform lighting. Rain is constrained to window/door/outdoor polygons; ripple/reflection regions remain on floor or outdoor surfaces. Story-stage filters select the correct night, train, or dawn effects.

The desktop and video contact sheets show no isolated legacy lamp ellipse or room-wide indoor rain:

- `artifacts/art-integration-v4/review/desktop-contact-sheet.jpg`
- `artifacts/art-integration-v4/review/video-contact-sheet.jpg`

Current `tests/e2e/markers-and-effects.spec.ts` also defines checks for unique active effect IDs, platform stage filtering, removal of expired rain, and deterministic effect time.

## Investigation markers and exits

Normal exploration no longer displays every hotspot. Distant markers remain hidden; the nearest eligible target is revealed at approach range, with its action copy presented in the DOM prompt. Procedural floating direction labels are not rendered for loaded static art. Exit triggers and walk-to points are registered to visible doors, passages, stairs, and platform access.

Evidence includes:

- no distant marker crowd in `after/desktop-1280/03-waiting-room-far.png`;
- one contextual umbrella prompt in `05-behind-umbrella-rack.png`;
- one platform target and prompt in `15-platform-edge.png`.

## HUD, dialogue, utility surfaces, and memory

The HUD is stage-local: area plate at upper-left, clock at upper-center, tools at upper-right, short objective at lower-left, and a transient interaction prompt near the active target. Dialogue remains inside the stage and preserves the world behind a restrained darkening layer.

Utility UI uses station materials rather than generic application cards:

- notebook as a lined station record: `after/desktop-1280/17-note.png`;
- inventory as a paper luggage/record ticket: `after/desktop-1280/18-inventory.png`;
- dialogue with integrated portrait and station plate: `after/desktop-1280/16-dialogue.png`.

The memory presentation now uses a large clear foreground still, the same real image as a quiet blurred backdrop, a lined paper narrative panel, progress, and an integrated action: `artifacts/art-integration-v4/after/desktop-1280/19-memory.png`.

## Mobile and landscape

The 390×844 composition reserves the upper stage for exploration and the lower stage for the short objective and touch controls. Dialogue uses a compact portrait crop and hides gameplay controls while the modal interaction is active. Notebook tabs reflow horizontally and remain inside the stage. The 844×390 layout keeps the world at 16:9 with equal side margins and compact 44px-class controls.

Evidence:

- `artifacts/art-integration-v4/after/mobile-390/21-exploration-390x844.png`
- `artifacts/art-integration-v4/after/mobile-390/22-dialogue-390x844.png`
- `artifacts/art-integration-v4/after/mobile-390/23-note-390x844.png`
- `artifacts/art-integration-v4/after/mobile-390/24-landscape-844x390.png`
- `artifacts/art-integration-v4/review/mobile-contact-sheet.jpg`

## Save compatibility

The storage key and `saveVersion: 1` remain unchanged. V4 adds safe position recovery for coordinates that are no longer valid under authored geometry; it does not change story progress, inventory, clues, viewed memories, endings, settings, facing, or the stable content ID system. Save position normalization is implemented in `src/game/save/position.ts` and integrated through the current save adapter.

## Recorded local verification

The following results were rerun against the final local release candidate and are recorded in `docs/PLAYTEST_REPORT.md`.

| Gate | Recorded V4 result |
| --- | --- |
| `npm run lint` | passed |
| `npm run typecheck` | passed |
| `npm run test` | 94 Vitest tests passed |
| `npm run test:visual-geometry` | 15 focused geometry Vitest and 14 visual-geometry Playwright tests passed |
| `npm run verify:stage-layout` | 9 stage-layout Playwright tests passed |
| `npm run test:e2e` | 37/37 Playwright tests passed |
| `npm run build` / `npm run verify:prod` / `npm run check` | passed |
| Local production smoke | Chromium desktop, Chromium touch, Edge, and Firefox passed with zero errors |

The current test sources cover geometry validity/reachability, keyboard and pointer containment, perspective monotonicity, marker restraint, effect registration, seven stage viewports, and desktop/mobile dialogue containment.

The remaining release gates are GitHub-hosted CI, V4 GitHub Pages deployment, and the smoke route against the public HTTPS URL. The historical public verification in `docs/PLAYTEST_REPORT.md` still applies to V3 only until those gates complete.

## Design QA result

`design-qa.md` scores the 15 requested V4 criteria at **8.73 / 10**. The available implementation, screenshot, and sampled movement evidence contains no open P0 or P1 finding.

Non-blocking observations remain:

- small character sprites are still visually crisper than the painterly backgrounds at some far-depth positions;
- sparse inventory states leave unused record space;
- deterministic captures often include the transient autosave toast;
- a specialist accessibility audit and WebKit-specific coverage remain outside the completed browser matrix.

## Artifact index

| Path | Contents |
| --- | --- |
| `artifacts/art-integration-v4/before/` | retained V3 baseline at 1920, 1280, 390, and the waiting-room route video |
| `artifacts/art-integration-v4/after/desktop-1920/` | Full-HD waiting room |
| `artifacts/art-integration-v4/after/desktop-1280/` | 19 numbered area/UI states |
| `artifacts/art-integration-v4/after/mobile-390/` | portrait exploration/dialogue/notebook and landscape exploration |
| `artifacts/art-integration-v4/after/video/` | five 11–13 second per-area movement routes |
| `artifacts/art-integration-v4/review/` | before/after, desktop, mobile, video contact sheets, and sampled frames |
| `artifacts/playtest/11-production-*` through `14-production-*` | local production-build Chromium, mobile, Edge, and Firefox smoke frames |

## Current local history

The local `codex/art-integration-v4` history contains these V4 milestones:

- `25f224d` — ship Full-HD station backgrounds
- `ce1c865` — add per-area art layout geometry
- `75eb8d1` — align movement geometry and save recovery
- `7bcd5e9` — integrate perspective actors and environment effects
- `3c860d5` — integrate HUD, dialogue, and memory with the stage
- `a142d58` — add movement perspective and Full-HD coverage
- `30f7bee` — resolve art-integration playtest findings
- `701ebaa` — record V4 visual-QA artifacts
- `facdd16` — close final route, pointer, tablet, passenger-approach, and browser-matrix regressions

This local history is not yet evidence of a successful GitHub Actions run, merge, or deployment.

## Release disposition

**V4 design/spatial integration: passed.**

**Local release certification: passed.**

**Publication certification: pending.** Complete and record GitHub CI, deployment, and the public-site smoke before describing V4 as published.
