# Static Asset Manifest Contract

## Source of truth

`src/game/assets/staticArtManifest.ts` owns every runtime illustration. Phaser and DOM consume stable keys and never hard-code public file paths. The current manifest contains 57 project-original assets totaling 4,048,796 bytes.

```ts
interface StaticArtAssetDefinition {
  key: StaticArtAssetKey;
  kind: "background" | "ui" | "ending" | "memory" | "portrait" | "sprite" | "item";
  path: `assets/art-v3/${string}.${"webp" | "png"}`;
  dimensions: { width: number; height: number };
  budgetBytes: number;
  description: string;
  license: { id: "project-original"; externalRights: false };
  fallback: StaticArtFallback;
  frame?: { width: number; height: number; count: number };
}
```

## Key families

| Family | Keys / count |
| --- | --- |
| Background | `art-v3.background.*` / 7 |
| Nagi sprites | `art-v3.character.nagi-*` / 10 |
| Passenger sprites | `art-v3.character.*-idle` / 6 |
| Items | `art-v3.item.*` / 6 |
| Portraits | `art-v3.portrait.*` / 17 |
| Memories | `art-v3.memory.*` / 6 |
| UI stills | `art-v3.ui.*` / 2 |
| Endings | `art-v3.ending.*` / 3 |

The platform has three background keys: night, last-train and dawn. `getAreaStaticArtKey` selects them by story stage without adding art state to the save.

## Stable content mappings

- `AREA_STATIC_ART_KEYS` / `getAreaStaticArtKey`: `AreaId` → background
- `NAGI_STATIC_ART_KEYS`: direction and action → sprite sheet
- `OWNER_STATIC_ART_KEYS`: `OwnerId` → idle sprite
- `ITEM_STATIC_ART_KEYS`: `ItemId` → shared item image
- `OWNER_PORTRAIT_STATIC_ART_KEYS`: `OwnerId` + normal/released → portrait
- `NAGI_PORTRAIT_STATIC_ART_KEYS`: explicit Nagi mood → portrait
- `MEMORY_STATIC_ART_KEYS`: `MemoryId` → story still
- `ENDING_STATIC_ART_KEYS`: `EndingId` → ending still

Dialogue selection uses `DialogueSpeaker` and explicit `portraitMood`; UI display names are never parsed to select art. Memory and ending views carry their stable IDs.

## Path rules

- Runtime root is `public/assets/art-v3`.
- Manifest paths have no leading slash, backslash, URL scheme, query, fragment, empty segment, `.` or `..`.
- `resolvePublicAssetUrl` combines the path with Vite `BASE_URL`, including `./` and `/rain-shelter-station/` Pages hosting.
- Production source, mattes, rejected candidates and absolute local paths are not shipped.

## Loading

`ArtV3Preloader.ts` loads only Phaser-consumed background, sprite and item entries. A sprite entry must declare 96×112 cells and a count whose product exactly matches the sheet dimensions. DOM portraits and stills create an image only when their surface is shown.

The loader skips an existing texture key and animation registration checks `scene.anims.exists`, so Scene restart does not duplicate resources.

## Fallback

| Asset kind | Failure behavior |
| --- | --- |
| Background | pre-existing procedural area remains visible |
| Nagi/passenger sprite | pre-existing Phaser Graphics character remains visible |
| World item | pre-existing Phaser Graphics item remains visible |
| DOM portrait/item/still | failed `<img>` removes itself; CSS/procedural fallback remains |

Image dimensions and pixels never define collision, exits, hotspot radius or progression. A forced waiting-room 404 E2E confirms that the player can still move in the procedural fallback.

## Budgets

| Asset | Per-file gate |
| --- | ---: |
| Background / memory / ending / UI | 1,000,000 bytes |
| Portrait / item | 400,000 bytes |
| Sprite strip | 250,000 bytes |
| All runtime images | 12,000,000 bytes |

Current total uses about one third of the global gate. WebP is used for opaque scenes; transparency-preserving PNG/WebP is used for characters, portraits and props.

## Provenance

Every manifest entry uses `project-original` and `externalRights: false`. The visuals were generated and edited for this game using only the existing game and project-created references. External franchise art, logos, stock images and audio were not imported.

## Verification

- Unit tests validate unique key/path, safe path, project-original metadata, dimensions, sprite frame divisibility, file existence and byte budgets.
- URL tests cover `./`, root, named Pages subpath and absolute deployment base.
- Browser E2E calls `Image.decode()` on all 57 entries and checks natural dimensions.
- The global browser fixture fails on console errors, page errors, request failures and unexpected HTTP errors.
- The intentional 404 route is isolated and asserts continued movement.
