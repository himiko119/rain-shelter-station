# Art Integration V4 — Initial Audit

## Scope

Art Integration V4 audits the released Art Quality V3 build as a playable spatial experience, not as a collection of finished illustrations. Evidence was captured from the published build and the unchanged V3 source before implementation began.

## Reproduction evidence

| Surface | Evidence | Result |
| --- | --- | --- |
| Full HD waiting room | `artifacts/art-integration-v4/before/desktop-1920/01-waiting-room-1920x1080.png` | failed: world occupies only 1344×756 and is clamped to the upper-left |
| Full HD upward movement | `artifacts/art-integration-v4/before/desktop-1920/02-waiting-wall-intrusion-1920x1080.png` | failed: Nagi reaches the window/wall plane |
| 1280 dialogue | `artifacts/art-integration-v4/before/desktop-1280/02-dialogue-1280x720.png` | readable, but world markers and actor/furniture scale compete with the dialogue |
| 1280 memory | `artifacts/art-integration-v4/before/desktop-1280/04-memory-red-umbrella-1280x720.png` | readable, but the image and narrative occupy a small centered island |
| 390×844 exploration | `artifacts/art-integration-v4/before/mobile-390/01-waiting-room-390x844.png` | operable, but world framing, markers and controls are separately tuned |
| Waiting-room route | `artifacts/art-integration-v4/before/video/01-waiting-room-before.webm` | failed: fixed actor scale and unconstrained movement break the painted perspective |

Baseline automation passed 75 Vitest assertions and 13 Playwright cases. Those tests prove progression and basic responsive operation, but did not exercise the spatial integration failures above.

## Findings

### P0 — The desktop camera cannot fill a Full HD viewport

`CameraLayout.ts` caps desktop zoom at 1.2 and multiplies the fit value by 0.96. A 1120×630 world therefore renders at 1344×756 on 1920×1080. `ExplorationScene` then applies 1120×630 camera bounds; because the viewport is larger than the scaled world, Phaser clamps the image to the upper-left instead of preserving a centered composition. HUD and overlays still use the browser-sized `.app-shell`, producing the visible Canvas/DOM split.

The existing camera unit test encoded `zoom === 1.2` at 1920×1080, so the faulty behavior was protected as an expected result.

### P0 — Gameplay geometry is not registered to the illustrations

The static background is presentation-only. Movement still depends on old axis-aligned rectangles authored for the procedural layout. In the waiting room, the north wall does not prevent Nagi's foot point from entering the window plane. Furniture silhouettes, exits and hotspot art anchors do not share a single authored coordinate model.

Cross-area inspection found more severe mismatches:

- the concourse gate bank, booth, machines and benches do not match their old collision rectangles;
- the station-office art places the desk in the left foreground, shelves and refrigerator on the right, and a rear-center door, unlike the old geometry;
- the footbridge image is a perspective corridor with a stair opening and railings, while old content assumes two benches;
- the platform safe edge is diagonal, while the old collision model treats it as horizontal.

### P1 — Actors are not part of the painted perspective

Nagi and passengers use a constant 0.82 raster scale. Their bottom-center image origins are useful, but the containing actor has no per-area depth profile, light response or floor reflection. NPC positions are copied from content hotspots rather than composed against visible furniture. The red-boots child and old listener consequently read as standing on bench surfaces.

### P1 — Static art still uses procedural effect coordinates

When a static background loads, only the procedural base `Graphics` object is hidden. Procedural text labels remain. Lamp glows, rain regions and ripple bands are still read from the old procedural paint result, so isolated ellipses, indoor rain and misplaced reflections can appear over the illustration.

### P1 — Interaction markers expose implementation detail

Every active hotspot creates a persistent marker. Procedural labels such as area directions remain visible over the static art. The result shows multiple debug-like targets and floating text before the player has approached anything.

### P2 — DOM surfaces do not share a stage coordinate system

`AppUi` places the Canvas host, HUD, objective, prompt, modal, dialogue and touch controls as siblings under a full-viewport `.app-shell`. There is no `.game-stage` boundary. Responsive behavior is split between camera safe insets and independent CSS pixel offsets.

### P2 — Memory and utility modals use space inefficiently

The memory image and copy are clear but occupy a small central composition at 1280×720. Controls and settings retain a generic modal/card rhythm that is less integrated with the station material language than the title and dialogue screens.

## Why Art Quality V3 did not catch this

V3's acceptance model emphasized asset finish, stable IDs, screenshot composition at 1280×720, mobile overflow, progression, fallback behavior and source/mock visual similarity. Those checks succeeded, but the evaluation model had four gaps:

1. Full HD and wider stage occupancy were not release gates.
2. Static screenshots were treated as sufficient evidence for world art, without a same-route movement video.
3. Existing collision and hotspot coordinates were deliberately preserved, so asset integration was never evaluated as geometry.
4. The Design QA score measured illustration and UI cohesion, but not foot-point containment, perspective scaling, occlusion, or effect-mask registration.

This is a criteria failure rather than an individual-review failure. V4 adds explicit spatial, motion and multi-viewport gates so the same class of defect cannot pass again.

## Constraints preserved

- story, dialogue and six-item progression;
- stable area/item/owner/clue/memory/ending IDs;
- `saveVersion: 1` and the existing storage key;
- keyboard, pointer and touch actions;
- DOM ownership of dense narrative and settings UI;
- Web Audio and accessibility settings;
- project-original art and procedural fallback;
- development-only E2E/F2 surfaces excluded from production.

