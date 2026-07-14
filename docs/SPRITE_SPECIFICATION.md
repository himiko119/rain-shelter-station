# Sprite Specification

## Approved seed

- Source: `artifacts/art-quality-v3/design/moodboard/source/07-nagi-character-seed.png`.
- The seed locks Nagi's hair, amber clip, coat, cream collar, coral scarf, satchel, skirt, socks and shoes.
- All derivatives must be compared to this seed before runtime inclusion.

## Runtime geometry

- World coordinate: `1120 × 630`.
- Normal rendered height: 80px desktop world scale; the camera may scale this uniformly on mobile.
- Frame canvas target: `96 × 112` transparent.
- Anchor: bottom-center `(0.5, 1.0)` at the shoe contact point.
- Existing physics container remains authoritative: body `25 × 23`, offset `(-12, -2)`.
- Sprite imagery never defines physics size or hotspot distance.

## Nagi animation set

| Key suffix | Frames | FPS | Repeat | Notes |
| --- | ---: | ---: | ---: | --- |
| `idle.down` | 3 | 3 | -1 | breathing and scarf only |
| `idle.up` | 3 | 3 | -1 | satchel and hair silhouette fixed |
| `idle.left` | 3 | 3 | -1 | unique left direction |
| `idle.right` | 3 | 3 | -1 | unique right direction; do not mirror hairclip blindly |
| `walk.down` | 6 | 9 | -1 | even contact/pass cycle |
| `walk.up` | 6 | 9 | -1 | same stride length |
| `walk.left` | 6 | 9 | -1 | scarf trails toward back |
| `walk.right` | 6 | 9 | -1 | independently checked silhouette |
| `inspect.down` | 4 | 7 | 0 | lean, hand, return to base |
| `inspect.up` | 4 | 7 | 0 | no position drift |
| `inspect.left` | 4 | 7 | 0 | nearest-hand gesture |
| `inspect.right` | 4 | 7 | 0 | nearest-hand gesture |
| `acquire.down` | 5 | 8 | 0 | object-light response, no embedded item art |
| `acquire.left` | 5 | 8 | 0 | same timing |
| `acquire.right` | 5 | 8 | 0 | same timing |

If a required direction fails quality review, use the full procedural Nagi fallback rather than mixing unrelated art styles.

## Strip pipeline

1. Use one approved seed only.
2. Generate a complete horizontal strip per animation, never separate frames.
3. Keep exact frame count, equal cells, full shoes, stable camera and flat removable backdrop.
4. Remove backdrop, normalize a common body-height scale and bottom-center baseline.
5. Keep canvas size identical across all Nagi strips.
6. Check edge contamination, alpha halos and left/right identity details.
7. Produce a preview sheet containing four idles, four walks, inspect and acquire.
8. Inspect the real Phaser output at 1× and mobile camera scale.
9. Reduced motion uses the facing-specific first idle frame and does not bob.

## NPCs

- Canvas target: `96 × 112`, bottom-center anchor.
- Each NPC gets a 3-frame low-amplitude idle strip at 2–3 FPS.
- Station attendant: straight posture, old uniform, cap, white gloves, brass accent; face partly obscured.
- Red-boots child: shortest, narrow shoulders, toes turned slightly inward, red boots and star detail.
- Navy-bag commuter: taller, forward shoulders, one hand guarding the bag.
- Old listener: softened back, headphones, one relaxed hand near cable.
- Ginkgo student: slim, book posture, ginkgo accessory and guarded stance.
- Crescent youth: tallest, loose asymmetrical coat, crescent accent, hands low.
- Returned state uses expression/light overlay, not a wholly different body design.

## Portraits

- Chest-up canvas: `512 × 640`, transparent or simple vignette background.
- Desktop display width: 118–180px. Mobile: 88–112px.
- Nagi: normal, anxious, surprised, remembering, relieved.
- Attendant: normal, final chapter.
- Each passenger: normal and memory-released.
- Shadow passengers retain partial facial ambiguity but use eyes, silhouette, age, hair and rim light for individuality.

## QA gates

- Hair, clip, scarf, coat, satchel and body proportions remain constant across directions and frames.
- No limb multiplication, cropped shoes, sliding baseline, background pixels or empty cells.
- Walk cycle reads at actual 80px height without frame-to-frame scale pumping.
- Inspect/acquire one-shots cannot be overwritten by movement animation until complete or explicitly cancelled.
- Scene restart does not register duplicate animations or listeners.
