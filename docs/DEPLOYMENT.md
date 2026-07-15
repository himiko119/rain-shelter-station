# 公開手順と本番確認 — Art Integration V4

## Current V4 release status

Art Integration V4 is published and verified at <https://himiko119.github.io/rain-shelter-station/>. Every local gate, the reviewed merge, the GitHub Pages build/deploy, public bundle identity, and the Chromium/Edge/Firefox production smoke completed successfully.

| Gate | V4 status |
| --- | --- |
| `npm run test` | completed: 94 Vitest tests passed |
| `npm run test:visual-geometry` | completed: 15 focused Vitest and 14 visual-geometry E2E tests passed |
| `npm run verify:stage-layout` | completed: 9 stage-layout E2E tests passed |
| Local visual evidence | completed: 24 screenshots and five 11–13 second area videos |
| `npm run test:e2e` | completed: 37/37 passed |
| `npm run check` / `npm run verify:prod` | completed |
| Local production smoke | completed: Chromium desktop, Chromium 390×844 touch, Edge, Firefox; zero errors |
| GitHub Pages deployment | completed: merge `27b3874`, deployment `5453065521` |
| `npm run verify:live` | completed on the public HTTPS URL: 4/4 profiles passed |

## Published V4 release

| Item | Result |
| --- | --- |
| Public URL | <https://himiko119.github.io/rain-shelter-station/> |
| Repository | <https://github.com/himiko119/rain-shelter-station> |
| Feature branch | `codex/art-integration-v4` |
| Pages branch | `codex/rain-shelter-station-game` |
| Pull request | [#2 Art Integration V4](https://github.com/himiko119/rain-shelter-station/pull/2) |
| Release merge commit | `27b3874cd748d20abe99f396109d40b2f8677bd7` |
| Actions run | [29396133571](https://github.com/himiko119/rain-shelter-station/actions/runs/29396133571) |
| Pages deployment ID | `5453065521` |
| Deploy completed | 2026-07-15 16:04:43 JST |
| Production smoke completed | 2026-07-15 16:08 JST |

The public HTML referenced `assets/index-gPh6Jz8j.js` and `assets/index-BCkkwDqP.css`, exactly matching the final local production build.

| Profile | Browser | Audio | Save/reload | Errors | Result |
| --- | --- | --- | --- | ---: | --- |
| desktop 1280×720 | Chromium 149.0.7827.55 | running | passed | 0 | passed |
| touch 390×844 | Chromium 149.0.7827.55 | running | passed | 0 | passed |
| desktop 1280×720 | Microsoft Edge 150.0.4078.65 | running | passed | 0 | passed |
| desktop 1280×720 | Firefox 151.0 | running | passed | 0 | passed |

The four public frames are `artifacts/playtest/11-production-desktop-1280x720.png` through `14-production-firefox-1280x720.png`. All were opened after capture and passed visual inspection.

An additional deep public smoke used normal pointer/keyboard/UI input at 1920×1080. The measured stage and Canvas were exactly 1920×1080 at `(0, 0)`. The route completed title → red umbrella acquisition → footprint investigation → correct return → memory → save reload, with Web Audio running and no browser/network errors. Valid version-1 saves then opened each of the five areas in the production build; every area accepted movement and a nearby investigation with zero errors. All six resulting frames were visually inspected.

## V4 pre-publish gates

Run the release gates serially so the Playwright commands do not contend for port 4173:

```powershell
npm ci
npx playwright install chromium firefox
npm run lint
npm run typecheck
npm run test
npm run test:visual-geometry
npm run verify:stage-layout
npm run test:e2e
npm run build
npm run verify:prod
```

`npm run test:visual-geometry` runs the two focused geometry Vitest files and 14 Playwright tests for movement/reachability, actor perspective, markers and effects. `npm run verify:stage-layout` runs 9 Playwright tests across seven viewports and desktop/mobile dialogue containment. The authoritative complete browser regression gate passed 37/37 before publication.

## V4 evidence capture

The capture command defaults to the after phase:

```powershell
npm run capture:art-integration
```

It writes 24 screenshots and five area videos to:

- `artifacts/art-integration-v4/after/desktop-1280/`
- `artifacts/art-integration-v4/after/desktop-1920/`
- `artifacts/art-integration-v4/after/mobile-390/`
- `artifacts/art-integration-v4/after/video/`

The five `01`–`05` WebM files are 11–13 seconds each. Contact sheets and sampled frames are stored in `artifacts/art-integration-v4/review/`. The retained baseline is under `artifacts/art-integration-v4/before/`.

## V4 save and rollback behavior

V4 retains the `rain-shelter-station.save.v1` key and `saveVersion: 1`. On load, an existing v1 player position outside the authored walkable geometry or inside a 14px-inflated obstacle is moved to a deterministic safe point in the same area. Story progress and facing are preserved. Because serialized fields and the schema version are unchanged, rolling back to the verified V3 release does not require a reverse migration.

After future releases reach the Pages branch and the deployment workflow succeeds, run:

```powershell
npm run verify:live
```

The V4 results above record desktop, 390×844 touch, Edge, Firefox, audio, save/reload, network, production-debug and screenshot verification.

## Historical Art Quality V3 release

### Published release

| Item | Value |
| --- | --- |
| Public URL | <https://himiko119.github.io/rain-shelter-station/> |
| Repository | <https://github.com/himiko119/rain-shelter-station> |
| Feature branch | `codex/art-quality-v3` |
| Pages branch | `codex/rain-shelter-station-game` |
| Pull request | [#1 Art Quality V3](https://github.com/himiko119/rain-shelter-station/pull/1) |
| Release merge commit | `a55f3facfbf85cfb2c966be09a2fb0cc0823a15f` |
| Actions run | [29355517252](https://github.com/himiko119/rain-shelter-station/actions/runs/29355517252) |
| Pages deployment ID | `5445348692` |
| Deploy completed | 2026-07-15 02:52:25 JST |
| Production smoke completed | 2026-07-15 02:57 JST |

The feature branch was pushed, reviewed through PR #1 and merged without force-push. The workflow built the merge commit, uploaded `dist` and deployed the same SHA to the `github-pages` environment.

### Workflow result

| Job | Result | Duration |
| --- | --- | ---: |
| build | success | 22 s |
| deploy | success | 8 s |

The workflow uses `actions/checkout@v7`, Node.js 22, `npm ci`, `npm run build`, `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5`. It needs no application secret or environment variable. Vite `base: "./"` keeps images, JavaScript, CSS and favicon valid under the repository subpath.

### Release contents

- 57 typed project-original runtime images / 4,048,796 bytes
- Five distinct station areas and three platform stages
- Four-direction Nagi idle/walk plus inspect/acquire actions
- Six passenger idle sprites and 17 dialogue portraits
- Six shared lost-item images and six memory stills
- Separate title, final choice and three ending compositions
- Procedural/CSS fallback for every progression-relevant visual
- Save schema remains `saveVersion: 1`

### Pre-publish gates

```powershell
npm ci
npx playwright install chromium
npm run check
npm run test:e2e
```

| Gate | V3 result |
| --- | --- |
| ESLint | passed |
| TypeScript | passed |
| Vitest | 9 files / 75 tests passed |
| Playwright | 13/13 passed |
| Vite build | passed |
| production sentinel | passed |
| Design QA | `final result: passed` |
| local after evidence | 20/20 reviewed |

The sole build warning is the existing non-failing Phaser JavaScript chunk-size warning.

### Production smoke

`npm run verify:live` opens the actual HTTPS URL, starts the game, confirms Canvas and DOM HUD, triggers Web Audio, verifies the save key, reloads, checks that Continue is enabled, rejects production E2E/dev globals, checks favicon/network/browser errors and captures a stable post-fade frame.

| Profile | Browser | Audio | Save/reload | Errors | Result |
| --- | --- | --- | --- | ---: | --- |
| desktop 1280×720 | Chromium 149.0.7827.55 | running | passed | 0 | passed |
| mobile 390×844 touch | Chromium 149.0.7827.55 | running | passed | 0 | passed |
| desktop 1280×720 | Microsoft Edge 150.0.4078.65 | running | passed | 0 | passed |

Mobile also passed no-horizontal-overflow, objective/control separation and 44×44 minimum touch-target checks. Production images were opened and visually reviewed:

- `artifacts/playtest/11-production-desktop-1280x720.png`
- `artifacts/playtest/12-production-mobile-390x844.png`
- `artifacts/playtest/13-production-edge-1280x720.png`

All three show the V3 waiting-room illustration and normalized sprite/item art. The Edge and Chromium desktop compositions match; mobile keeps the world, objective and touch controls in separate vertical zones.

### Deployment trigger

`.github/workflows/deploy-pages.yml` runs on pushes to `codex/rain-shelter-station-game` and `workflow_dispatch`. A feature-branch push alone stores the work but does not publish it. Release changes should reach the Pages branch through a reviewed PR or a verified fast-forward/merge without force-push.

### Rollback

If production develops a blank screen, asset 404, save regression or input failure, redeploy the previous known-good merge through the same workflow. Art V3 did not change the storage key, serialized fields or current save version, so rollback does not require reverse migration.

### Remaining non-blockers

- Firefox/WebKit do not have equivalent depth of automation.
- System Japanese font metrics may vary by OS.
- Phaser remains in one large initial JavaScript chunk.
- Web Audio still waits for the first user gesture as required by browser autoplay policy.
