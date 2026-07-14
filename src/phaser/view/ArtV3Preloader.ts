import type Phaser from "phaser";

import {
  STATIC_ART_MANIFEST,
  getStaticArtAssetUrl,
} from "../../game/assets";

interface SpriteSheetFrameMetadata {
  readonly width: number;
  readonly height: number;
  readonly count: number;
}

interface SpriteSheetManifestEntry {
  readonly kind: string;
  readonly frame: SpriteSheetFrameMetadata;
}

interface ImageManifestEntry {
  readonly kind: "background" | "item";
}

function isSpriteSheetManifestEntry(value: unknown): value is SpriteSheetManifestEntry {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  if (typeof candidate.frame !== "object" || candidate.frame === null) return false;
  const frame = candidate.frame as Readonly<Record<string, unknown>>;
  return typeof candidate.kind === "string"
    && Number.isInteger(frame.width)
    && Number.isInteger(frame.height)
    && Number.isInteger(frame.count)
    && (frame.width as number) > 0
    && (frame.height as number) > 0
    && (frame.count as number) > 0;
}

function isImageManifestEntry(value: unknown): value is ImageManifestEntry {
  if (typeof value !== "object" || value === null) return false;
  const kind = (value as Readonly<Record<string, unknown>>).kind;
  return kind === "background" || kind === "item";
}

/** Preloads only art consumed by Phaser; DOM-only portraits and stills stay lazy. */
export function preloadArtV3Textures(scene: Phaser.Scene): void {
  for (const asset of STATIC_ART_MANIFEST) {
    if (scene.textures.exists(asset.key)) continue;

    const metadata: unknown = asset;
    if (isSpriteSheetManifestEntry(metadata)) {
      scene.load.spritesheet(asset.key, getStaticArtAssetUrl(asset.key), {
        frameWidth: metadata.frame.width,
        frameHeight: metadata.frame.height,
        endFrame: metadata.frame.count - 1,
      });
      continue;
    }

    if (isImageManifestEntry(metadata)) {
      scene.load.image(asset.key, getStaticArtAssetUrl(asset.key));
    }
  }
}
