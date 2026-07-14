# Art QA Checklist

## Asset integrity

- [ ] Every manifest key is unique and points to an existing project-original file.
- [ ] File dimensions and animation frame metadata match decoded images.
- [ ] Backgrounds are normalized to 1120×630.
- [ ] Transparent assets have clean alpha edges at 1× and 2× zoom.
- [ ] No generated lettering, watermarks, broken architecture, anatomy or duplicated objects remain.
- [ ] Runtime total ≤12MB; background and portrait budgets meet the manifest contract.
- [ ] No unused concept, raw generation or giant source file is shipped under `public`.

## Environment and gameplay sync

- [ ] All exits are visually open and match the existing edge rectangles.
- [ ] Collision objects, hotspots and foreground sortY remain within world bounds.
- [ ] Waiting-room route reads Nagi → clock → rain window → gate.
- [ ] Concourse route reads Nagi → gates → ticket machine → passage.
- [ ] Office route reads entrance → desk → ledger → mirror.
- [ ] Footbridge stair gap remains open; railings are split around it.
- [ ] Platform safety line and track collision are visibly separated.
- [ ] Characters never appear behind floor paint or in front of overhead architecture incorrectly.
- [ ] Foregrounds fade or split instead of hiding the protagonist for long periods.

## Character and item consistency

- [ ] Nagi matches the approved seed in every direction and expression.
- [ ] Four idles, four walks, inspect and acquire have stable bottom-center anchors.
- [ ] Reduced motion stops continuous character bob and nonessential loops.
- [ ] Attendant and five passengers differ in height, shoulder width, posture, age, hair, clothing and hand pose.
- [ ] Returned-state glow does not erase individual silhouettes.
- [ ] Each lost item keeps the same shape, color, damage and motif in world, acquire, inventory and memory uses.

## UI and accessibility

- [ ] Exact Japanese title, labels and story text remain DOM/Phaser text.
- [ ] Decorative images use empty alt; adjacent text carries the accessible name.
- [ ] Title, dialogue, notebook, inventory, settings, records, final choice and endings preserve headings and roles.
- [ ] Focus ring is visible on dark, paper and illustrated surfaces.
- [ ] Dialog focus is trapped and returns to the opener.
- [ ] Typewriter output does not trigger per-character screen-reader announcements.
- [ ] Mouse, keyboard and touch actions still map through the existing action layer.

## 1280×720 visual review

- [ ] No crop, overlap, horizontal scroll, black crush or unreadable low contrast.
- [ ] Persistent UI protects the central playfield.
- [ ] Dialogue is ≤24% height and portrait does not cover text.
- [ ] Each area is recognizable in one glance.
- [ ] Main light, depth layers, protagonist silhouette and interactable target are clear.

## 390×844 visual review

- [ ] No horizontal scroll and safe areas are respected.
- [ ] Touch targets are at least 44px.
- [ ] World, objective and touch controls remain separate.
- [ ] Portrait, item and memory images remain legible without squeezing text.
- [ ] Notebook and inventory scroll; every modal can be closed.
- [ ] Camera-area taps do not activate controls or unintended movement.

## Motion and lifecycle

- [ ] Rain has distant, middle, near, window, drip and ripple layers only where appropriate.
- [ ] No unlimited particle/tween growth across area and stage restarts.
- [ ] Reduced motion lowers rain, ripples, marker movement, shakes and transitions.
- [ ] Audio begins only after user gesture and remains independent from art loading.
- [ ] Missing image fallback keeps gameplay, collisions, save and UI usable.

## Required evidence

- [ ] `artifacts/art-quality-v3/after/desktop`: 15 required states.
- [ ] `artifacts/art-quality-v3/after/mobile`: 5 required states.
- [ ] Nagi four-direction and walk previews.
- [ ] Passenger, item, portrait and memory contact sheets.
- [ ] Platform night / last train / dawn comparison.
- [ ] Reference and implementation comparison at identical viewports.
- [ ] `design-qa.md` ends with exactly `final result: passed`.

## Test and release gates

- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test` — no fewer than 57 tests.
- [ ] `npm run build`
- [ ] `npm run test:e2e` — no fewer than 11 tests.
- [ ] `npm run check`
- [ ] `npm run verify:prod`
- [ ] `npm run verify:live`
- [ ] Normal-input first-return route, wrong return, staged hint, save restore, data deletion and all endings.
- [ ] Desktop Chromium, 390×844 touch and Edge production smoke.
- [ ] No image/audio/favicon 404, console error, page error or production debug exposure.

## Scoring

Score every major screen from 1–5 for illustration finish, consistency, place recognition, protagonist visibility, depth, light/shadow, target clarity, UI harmony, emotion and mobile readability. Average must be ≥4.0 and no item may remain ≤2.
