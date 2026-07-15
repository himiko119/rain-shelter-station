# Art Integration V4 — Implementation Plan

## Direction

Treat every background as an authored 2.5D stage. One per-area layout definition will connect the illustration to movement, exits, interactions, actor scale, lighting, rain, reflections and foreground occlusion. Gameplay state remains outside Phaser; the scene consumes layout data as renderer/input geometry.

## Delivery sequence

1. Preserve the pre-change 1920×1080, 1280×720, 390×844 and waiting-route video evidence.
2. Introduce a centered `.game-stage` containing `.game-world` and `.game-stage-ui`.
3. Make the desktop camera exactly fit the 16:9 world and use a DPR-capped painterly renderer.
4. Add typed `AreaArtLayout` data and pure point/polygon/projection utilities.
5. Constrain keyboard, pointer and restored save positions by foot-point geometry.
6. Register exits and hotspot approach points to visible architecture.
7. Apply per-area perspective scale, actor grounding, light influence and depth.
8. Duplicate and mask the loaded background into foreground occluder layers instead of generating replacement scenery.
9. Replace legacy static-art lamp/rain/ripple coordinates with layout-owned regions.
10. Show only the nearest contextual marker and remove static procedural labels from loaded-art scenes.
11. Integrate HUD, dialogue, memory, settings and touch controls inside the stage boundary.
12. Add deterministic named scenarios, geometry tests, movement tests, seven-viewport layout tests, marker/effect tests and per-area movement videos.
13. Run the complete command set, perform visual comparison and Design QA, then publish through the existing Pages branch.

## Architecture boundaries

- `src/game/content/areaArtLayouts.ts`: serializable authored stage data and pure geometry helpers.
- `src/phaser/view/AreaArtLayout.ts`: Phaser adapters, debug overlays, masks and visual interpolation.
- `src/phaser/scenes/ExplorationScene.ts`: foot-point movement validation and view orchestration only.
- `src/phaser/view/StationView.ts`: static background, actors and layout-owned effects.
- `src/ui/AppUi.ts` / `src/styles/main.css`: shared DOM stage and responsive narrative/UI surfaces.

No progression rule will depend on a sprite, tween, mask or camera lifetime.

## Acceptance gates

- 1920×1080 stage height at least 90% and opposing margins differ by at most 8px;
- no foot point outside the area's walkable polygon or inside an obstacle;
- every exit and hotspot approach point is reachable;
- monotonic per-area depth scaling with valid light regions;
- no persistent multi-marker state or procedural static-art label;
- Canvas, HUD, dialogue and modals share the stage bounds;
- 390×844 and 844×390 retain 44px targets and non-overlapping controls;
- at least 75 Vitest assertions and 13 Playwright cases continue to pass;
- all required local commands and public Chromium/Edge smoke checks pass;
- Design QA average at least 4.2, with no score below 3 and no P0/P1 finding.

