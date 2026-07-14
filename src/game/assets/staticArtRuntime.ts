import {
  STATIC_ART_MANIFEST,
  getStaticArtAsset,
  getStaticArtAssetUrl,
  type StaticArtAssetKey,
  type StaticArtFallback,
} from "./staticArtManifest";

export type StaticArtLoadPhase = "unrequested" | "loading" | "ready" | "failed";

export type StaticArtRuntimeStatus =
  | {
      readonly key: StaticArtAssetKey;
      readonly phase: "unrequested";
    }
  | {
      readonly key: StaticArtAssetKey;
      readonly phase: "loading" | "ready";
      readonly url: string;
    }
  | {
      readonly key: StaticArtAssetKey;
      readonly phase: "failed";
      readonly url: string;
      readonly reason: string;
    };

export type StaticArtRuntimeState = Readonly<
  Record<StaticArtAssetKey, StaticArtRuntimeStatus>
>;

export interface StaticArtRuntimeValidation {
  readonly valid: boolean;
  readonly missingKeys: readonly StaticArtAssetKey[];
  readonly invalidKeys: readonly string[];
  readonly readyKeys: readonly StaticArtAssetKey[];
  readonly fallbackKeys: readonly StaticArtAssetKey[];
}

export type StaticArtRenderDecision =
  | {
      readonly source: "static";
      readonly key: StaticArtAssetKey;
      readonly url: string;
    }
  | {
      readonly source: "fallback";
      readonly key: StaticArtAssetKey;
      readonly fallback: StaticArtFallback;
      readonly reason: StaticArtLoadPhase;
    };

const STATIC_ART_KEY_SET: ReadonlySet<string> = new Set(
  STATIC_ART_MANIFEST.map((asset) => asset.key),
);
const LOAD_PHASES: ReadonlySet<string> = new Set([
  "unrequested",
  "loading",
  "ready",
  "failed",
]);

function isRuntimeStatusForKey(
  value: unknown,
  key: string,
): value is StaticArtRuntimeStatus {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Readonly<Record<string, unknown>>;
  if (candidate.key !== key || typeof candidate.phase !== "string") return false;
  if (!LOAD_PHASES.has(candidate.phase)) return false;
  if (candidate.phase === "unrequested") return true;
  if (typeof candidate.url !== "string" || candidate.url.length === 0) return false;
  return candidate.phase !== "failed"
    || (typeof candidate.reason === "string" && candidate.reason.length > 0);
}

export function createStaticArtRuntimeState(): StaticArtRuntimeState {
  return Object.fromEntries(
    STATIC_ART_MANIFEST.map((asset) => [
      asset.key,
      { key: asset.key, phase: "unrequested" },
    ]),
  ) as StaticArtRuntimeState;
}

export function markStaticArtLoading(
  state: StaticArtRuntimeState,
  key: StaticArtAssetKey,
  baseUrl?: string,
): StaticArtRuntimeState {
  getStaticArtAsset(key);
  return {
    ...state,
    [key]: { key, phase: "loading", url: getStaticArtAssetUrl(key, baseUrl) },
  };
}

export function markStaticArtReady(
  state: StaticArtRuntimeState,
  key: StaticArtAssetKey,
  baseUrl?: string,
): StaticArtRuntimeState {
  getStaticArtAsset(key);
  const previous = state[key];
  const url = previous?.phase === "loading" || previous?.phase === "ready"
    ? previous.url
    : getStaticArtAssetUrl(key, baseUrl);
  return { ...state, [key]: { key, phase: "ready", url } };
}

export function markStaticArtFailed(
  state: StaticArtRuntimeState,
  key: StaticArtAssetKey,
  reason: string,
  baseUrl?: string,
): StaticArtRuntimeState {
  getStaticArtAsset(key);
  const normalizedReason = reason.trim() || "asset-load-failed";
  const previous = state[key];
  const url = previous?.phase === "loading" || previous?.phase === "ready"
    ? previous.url
    : getStaticArtAssetUrl(key, baseUrl);
  return {
    ...state,
    [key]: { key, phase: "failed", url, reason: normalizedReason },
  };
}

export function getStaticArtRenderDecision(
  state: StaticArtRuntimeState,
  key: StaticArtAssetKey,
): StaticArtRenderDecision {
  const asset = getStaticArtAsset(key);
  const status = state[key];
  if (status?.phase === "ready") {
    return { source: "static", key, url: status.url };
  }
  return {
    source: "fallback",
    key,
    fallback: asset.fallback,
    reason: status?.phase ?? "unrequested",
  };
}

export function validateStaticArtRuntimeState(
  state: Readonly<Partial<Record<StaticArtAssetKey, StaticArtRuntimeStatus>>>,
): StaticArtRuntimeValidation {
  const runtimeEntries = Object.entries(state) as [string, unknown][];
  const missingKeys = STATIC_ART_MANIFEST
    .map((asset) => asset.key)
    .filter((key) => state[key] === undefined);
  const invalidKeys = runtimeEntries
    .filter(([key, status]) => !STATIC_ART_KEY_SET.has(key) || !isRuntimeStatusForKey(status, key))
    .map(([key]) => key);
  const readyKeys = STATIC_ART_MANIFEST
    .map((asset) => asset.key)
    .filter((key) => state[key]?.phase === "ready");
  const fallbackKeys = STATIC_ART_MANIFEST
    .map((asset) => asset.key)
    .filter((key) => state[key]?.phase !== "ready");

  return {
    valid: missingKeys.length === 0 && invalidKeys.length === 0,
    missingKeys,
    invalidKeys,
    readyKeys,
    fallbackKeys,
  };
}

/** Creates a report directly from Phaser's `textures.exists`-style predicate. */
export function inspectStaticArtAvailability(
  isAvailable: (key: StaticArtAssetKey) => boolean,
): Pick<StaticArtRuntimeValidation, "readyKeys" | "fallbackKeys"> {
  const readyKeys: StaticArtAssetKey[] = [];
  const fallbackKeys: StaticArtAssetKey[] = [];
  for (const asset of STATIC_ART_MANIFEST) {
    (isAvailable(asset.key) ? readyKeys : fallbackKeys).push(asset.key);
  }
  return { readyKeys, fallbackKeys };
}
