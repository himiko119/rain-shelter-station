# ART DIRECTION — 雨宿り駅の忘れもの / V3

## Visual thesis

濃紺の静かな地方駅を主面に、雨青を空気、琥珀を進路、生成りを可読領域、coralを記憶の印として使う。怖さより「言えなかった言葉が残る静けさ」を優先する。画面内文字はすべてruntime textとし、生成画像へロゴ、標識、台詞を焼き込まない。

採用したUI方向は `artifacts/art-quality-v3/design/ideate/option-a-quiet-signage.png`。Mood Board → UI案3種 → asset production → implementation → Design QA → Game Playtestの順で制作した。

## Shared tokens

| Role | Value | Use |
| --- | --- | --- |
| Night ink | `#040A16` | page最暗部、shadow |
| Night navy | `#071326` | world frame、panel back |
| Panel | `#10253A` | dialogue、modal |
| Panel raised | `#173344` | HUD、active surface |
| Rain blue | `#6F9DA8` | wet edge、marker |
| Rain mist | `#B8D8DD` | secondary type、glint |
| Cream | `#F2E8D3` | primary text、paper |
| Lamp | `#E5BF70` | focus、route、station light |
| Memory coral | `#C96F61` | scarf、memory state |
| Dawn blue / pink | `#B9D8DB` / `#E8B7A6` | stage 6、Ending B |

Tokens are defined once in `src/game/theme/visualTokens.ts`, injected as CSS custom properties and exported as Phaser numeric colors.

## Area compositions

All backgrounds are 1120×630 and display without changing content geometry.

| Area | Visual anchor | Navigation preservation |
| --- | --- | --- |
| Waiting room | rain windows, central lamp, umbrella rack, photo booth | right exit remains visually open; item/passenger coordinates stay authoritative |
| Concourse | ticket gates, service window, machine glow | route labels and markers remain runtime overlays |
| Station office | desk lamp, ledger, mirror, shelves | collision continues to use `AreaDefinition.obstacles` |
| Footbridge | long wet perspective, windows, railings, stairs | stair exits retain runtime labels and bounds |
| Rain platform | roof lamp, yellow tactile line, rails, water reflections | stage 3/4 night, stage 5 last train, stage 6 dawn |

Static backgrounds sit at depth -100. Procedural world art remains as a hidden fallback; rain, lamp glow, puddle ripple, markers and runtime labels remain live Phaser layers.

## Character system

### Nagi

- 96×112 cell grid; bottom-center anchor.
- Idle: 3 frames × down/up/left/right.
- Walk: 6 frames × down/up/left/right.
- Inspect: 4 frames; acquire: 5 frames.
- Separate left/right art is used instead of mirroring identity details.
- Action animation holds until complete; reduced-motion displays a short static action pose.
- Physics body remains 25×23 and is independent of sprite dimensions.

### Passengers

The station attendant and five passengers each have a three-frame idle strip and normal/released dialogue portraits. Identity is preserved through silhouette and one narrative accessory: cap, red boots/star, navy bag, headphones, ginkgo/book, crescent pin.

### Dialogue portraits

- Nagi: normal, anxious, surprised, remembering, relieved.
- Every non-player owner: normal and released.
- Portrait selection uses `DialogueSpeaker`, not speaker display text.
- Desktop uses a bottom-anchored bust; ≤620px intentionally hides the large bust so dialogue remains readable.

## Lost-item system

Six 512×512 alpha PNGs are shared by world, acquisition, inventory and fallback memory presentation through `ItemId`.

1. Red umbrella with white-star repair
2. Navy star bento
3. Cassette player and headphones
4. Ginkgo-shaped silver hairclip
5. Faded photo-booth strip
6. Completely blank destination ticket

The images retain transparent padding for predictable scale. Hotspot radius, coordinates and acquisition logic do not depend on image bounds.

## Story stills

- Six 1120×630 memory illustrations show a specific remembered action rather than a decorative close-up.
- Title, final choice and three endings are separate 1280×720 compositions.
- Ending A is empty rainy departure, B is first-train dawn, C is Nagi keeping the station lamp.
- Generative Polish was used only for the title key visual; UI text remains DOM.

## DOM surfaces

The UI follows the same station-sign language: thin rain-blue rules, squared ticket corners, small amber edge, compact uppercase eyebrow, Mincho narrative hierarchy and strong visible focus. Title, dialogue, inventory, memory, final choice, records and endings use real manifest images. CSS/procedural pictures remain only as error fallback.

The notebook and settings are intentionally paper/instrument surfaces because their task is reading and adjustment, not illustration. Touch controls keep 44px minimum targets, and the main interact button remains the dominant warm action.

## Motion, rain and accessibility

- Rain and lamp animation never encode mandatory information.
- `reducedMotion` stops sprite loops, large fades and decorative movement.
- Focus rings use cream/amber with outer dark separation.
- Important states include copy, outline or stamp in addition to hue.
- Decorative images use empty alt text; headings, buttons and status copy remain semantic DOM.

## Asset contract

`src/game/assets/staticArtManifest.ts` is the source of truth for all 57 runtime images. It records stable key, project-relative path, dimensions, byte budget, project-original provenance and fallback. Paths are Pages-safe and may not contain a root slash, URL scheme, query, fragment or traversal.

Current runtime image total is 4,048,796 bytes against a 12MB gate. Generated source candidates and mattes are not shipped. Details and automated verification are in `docs/STATIC_ASSET_MANIFEST.md`.

## QA standard

- 1280×720 and 390×844 screenshots are compared against the same-state V2 baseline.
- Option A and the live dialogue screen are also placed in one source/implementation comparison.
- No P0/P1/P2 finding may remain in `design-qa.md`.
- Browser errors, failed requests, invalid dimensions or asset budget violations fail automated tests.
- Visual evidence lives in `artifacts/art-quality-v3/`.
