# 公開手順と本番確認 — Art Quality V3

## Published release

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

## Workflow result

| Job | Result | Duration |
| --- | --- | ---: |
| build | success | 22 s |
| deploy | success | 8 s |

The workflow uses `actions/checkout@v7`, Node.js 22, `npm ci`, `npm run build`, `actions/upload-pages-artifact@v5` and `actions/deploy-pages@v5`. It needs no application secret or environment variable. Vite `base: "./"` keeps images, JavaScript, CSS and favicon valid under the repository subpath.

## Release contents

- 57 typed project-original runtime images / 4,048,796 bytes
- Five distinct station areas and three platform stages
- Four-direction Nagi idle/walk plus inspect/acquire actions
- Six passenger idle sprites and 17 dialogue portraits
- Six shared lost-item images and six memory stills
- Separate title, final choice and three ending compositions
- Procedural/CSS fallback for every progression-relevant visual
- Save schema remains `saveVersion: 1`

## Pre-publish gates

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

## Production smoke

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

## Deployment trigger

`.github/workflows/deploy-pages.yml` runs on pushes to `codex/rain-shelter-station-game` and `workflow_dispatch`. A feature-branch push alone stores the work but does not publish it. Release changes should reach the Pages branch through a reviewed PR or a verified fast-forward/merge without force-push.

## Rollback

If production develops a blank screen, asset 404, save regression or input failure, redeploy the previous known-good merge through the same workflow. Art V3 did not change the storage key, serialized fields or current save version, so rollback does not require reverse migration.

## Remaining non-blockers

- Firefox/WebKit do not have equivalent depth of automation.
- System Japanese font metrics may vary by OS.
- Phaser remains in one large initial JavaScript chunk.
- Web Audio still waits for the first user gesture as required by browser autoplay policy.
