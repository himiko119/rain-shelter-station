export const CAMERA_WORLD_SIZE = Object.freeze({
  width: 1_120,
  height: 630,
} as const);

export type CameraLayoutMode = "desktop" | "tablet" | "portrait";

export interface CameraViewportSize {
  readonly width: number;
  readonly height: number;
}

export interface CameraViewportRect extends CameraViewportSize {
  /** Screen-space viewport owned by the Phaser camera. */
  readonly x: number;
  readonly y: number;
}

export interface CameraSafeInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface CameraSafeArea {
  /** Screen-space region used to bias follow framing around DOM overlays. */
  readonly insets: CameraSafeInsets;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface CameraZoomPolicy {
  readonly value: number;
  readonly preferred: number;
  readonly fitWorld: number;
  readonly min: number;
  readonly max: number;
}

export interface CameraDeadzone {
  readonly width: number;
  readonly height: number;
  readonly unit: "screen-pixels";
}

export interface FixedCameraPolicy {
  readonly kind: "fixed";
  readonly center: {
    readonly x: number;
    readonly y: number;
  };
}

export interface FollowCameraPolicy {
  readonly kind: "follow";
  readonly lerp: {
    readonly x: number;
    readonly y: number;
  };
  readonly deadzone: CameraDeadzone;
  /** Offset from the viewport center to the unobscured UI-safe center. */
  readonly screenFocusOffset: {
    readonly x: number;
    readonly y: number;
  };
}

export type CameraTrackingPolicy = FixedCameraPolicy | FollowCameraPolicy;

export interface CameraLayout {
  readonly mode: CameraLayoutMode;
  readonly viewport: CameraViewportSize;
  readonly cameraViewport: CameraViewportRect;
  readonly world: typeof CAMERA_WORLD_SIZE;
  readonly safeArea: CameraSafeArea;
  readonly zoom: CameraZoomPolicy;
  readonly visibleWorld: CameraViewportSize;
  readonly safeVisibleWorld: CameraViewportSize;
  readonly showsEntireWorld: boolean;
  readonly tracking: CameraTrackingPolicy;
  readonly roundPixels: false;
  readonly clampToWorldBounds: true;
}

interface CameraProfile {
  readonly zoom: {
    readonly min: number;
    readonly max: number;
    readonly preferred: number;
  };
  readonly safeInsets: CameraSafeInsets;
}

const CAMERA_PROFILES: Readonly<Record<CameraLayoutMode, CameraProfile>> = {
  desktop: {
    zoom: { min: 0.45, max: 1.2, preferred: 1 },
    safeInsets: { top: 72, right: 20, bottom: 84, left: 20 },
  },
  tablet: {
    zoom: { min: 0.82, max: 1.16, preferred: 1.02 },
    safeInsets: { top: 68, right: 16, bottom: 132, left: 16 },
  },
  portrait: {
    zoom: { min: 1.25, max: 1.4, preferred: 1.32 },
    safeInsets: { top: 62, right: 12, bottom: 304, left: 12 },
  },
};

const round = (value: number): number => Math.round(value * 1_000) / 1_000;
const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

function assertViewport(viewport: CameraViewportSize): void {
  if (
    !Number.isFinite(viewport.width) ||
    !Number.isFinite(viewport.height) ||
    viewport.width <= 0 ||
    viewport.height <= 0
  ) {
    throw new RangeError("Camera viewport dimensions must be finite positive numbers.");
  }
}

export function classifyCameraLayout(viewport: CameraViewportSize): CameraLayoutMode {
  assertViewport(viewport);
  const aspectRatio = viewport.width / viewport.height;
  if (aspectRatio <= 0.9) return "portrait";
  if (viewport.width < 1_180 || aspectRatio < 1.6) return "tablet";
  return "desktop";
}

function resolveSafeArea(
  viewport: CameraViewportSize,
  requested: CameraSafeInsets,
): CameraSafeArea {
  const insets: CameraSafeInsets = {
    top: round(Math.min(requested.top, viewport.height * 0.22)),
    right: round(Math.min(requested.right, viewport.width * 0.16)),
    bottom: round(Math.min(requested.bottom, viewport.height * 0.36)),
    left: round(Math.min(requested.left, viewport.width * 0.16)),
  };
  return {
    insets,
    x: insets.left,
    y: insets.top,
    width: round(viewport.width - insets.left - insets.right),
    height: round(viewport.height - insets.top - insets.bottom),
  };
}

function resolveCameraViewport(
  mode: CameraLayoutMode,
  viewport: CameraViewportSize,
  safeArea: CameraSafeArea,
): CameraViewportRect {
  if (mode === "portrait") {
    return {
      x: 0,
      y: safeArea.y,
      width: viewport.width,
      height: safeArea.height,
    };
  }

  if (mode !== "desktop") {
    return { x: 0, y: 0, width: viewport.width, height: viewport.height };
  }

  const worldAspectRatio = CAMERA_WORLD_SIZE.width / CAMERA_WORLD_SIZE.height;
  const viewportAspectRatio = viewport.width / viewport.height;
  const width = viewportAspectRatio > worldAspectRatio
    ? round(viewport.height * worldAspectRatio)
    : viewport.width;
  const height = viewportAspectRatio > worldAspectRatio
    ? viewport.height
    : round(viewport.width / worldAspectRatio);

  return {
    x: round((viewport.width - width) / 2),
    y: round((viewport.height - height) / 2),
    width,
    height,
  };
}

function resolveZoom(
  mode: CameraLayoutMode,
  viewport: CameraViewportSize,
  cameraViewport: CameraViewportRect,
  profile: CameraProfile,
): CameraZoomPolicy {
  const fitWorld = Math.min(
    cameraViewport.width / CAMERA_WORLD_SIZE.width,
    cameraViewport.height / CAMERA_WORLD_SIZE.height,
  );

  if (mode === "desktop") {
    // A fixed 16:9 room must cover its camera viewport exactly. Capping or
    // rounding this value exposes camera background around the world at large
    // desktop sizes.
    return {
      value: fitWorld,
      preferred: fitWorld,
      fitWorld,
      min: Math.min(profile.zoom.min, fitWorld),
      max: Math.max(profile.zoom.max, fitWorld),
    };
  }

  const rawPreferred = mode === "portrait"
    ? profile.zoom.preferred * (viewport.width / 390)
    : Math.max(profile.zoom.preferred, fitWorld * 1.04);
  const preferred = clamp(rawPreferred, profile.zoom.min, profile.zoom.max);
  return {
    value: round(preferred),
    preferred: round(preferred),
    fitWorld: round(fitWorld),
    min: profile.zoom.min,
    max: profile.zoom.max,
  };
}

function resolveTracking(
  mode: CameraLayoutMode,
  viewport: CameraViewportSize,
  safeArea: CameraSafeArea,
): CameraTrackingPolicy {
  if (mode === "desktop") {
    return {
      kind: "fixed",
      center: {
        x: CAMERA_WORLD_SIZE.width / 2,
        y: CAMERA_WORLD_SIZE.height / 2,
      },
    };
  }

  const portrait = mode === "portrait";
  return {
    kind: "follow",
    lerp: portrait ? { x: 0.12, y: 0.1 } : { x: 0.09, y: 0.09 },
    deadzone: {
      width: round(safeArea.width * (portrait ? 0.38 : 0.46)),
      height: round(safeArea.height * (portrait ? 0.24 : 0.38)),
      unit: "screen-pixels",
    },
    screenFocusOffset: {
      x: round(safeArea.x + safeArea.width / 2 - viewport.width / 2),
      y: round(safeArea.y + safeArea.height / 2 - viewport.height / 2),
    },
  };
}

/**
 * Resolves renderer-only camera policy from CSS viewport dimensions.
 * Gameplay coordinates remain in the fixed 1120x630 world.
 */
export function resolveCameraLayout(viewport: CameraViewportSize): CameraLayout {
  assertViewport(viewport);
  const normalizedViewport = { width: viewport.width, height: viewport.height };
  const mode = classifyCameraLayout(normalizedViewport);
  const profile = CAMERA_PROFILES[mode];
  const safeArea = resolveSafeArea(normalizedViewport, profile.safeInsets);
  const cameraViewport = resolveCameraViewport(mode, normalizedViewport, safeArea);
  const zoom = resolveZoom(mode, normalizedViewport, cameraViewport, profile);
  const visibleWorld = {
    width: round(cameraViewport.width / zoom.value),
    height: round(cameraViewport.height / zoom.value),
  };
  const safeVisibleWorld = {
    width: round(safeArea.width / zoom.value),
    height: round(safeArea.height / zoom.value),
  };

  return {
    mode,
    viewport: normalizedViewport,
    cameraViewport,
    world: CAMERA_WORLD_SIZE,
    safeArea,
    zoom,
    visibleWorld,
    safeVisibleWorld,
    showsEntireWorld:
      visibleWorld.width >= CAMERA_WORLD_SIZE.width &&
      visibleWorld.height >= CAMERA_WORLD_SIZE.height,
    tracking: resolveTracking(mode, normalizedViewport, safeArea),
    roundPixels: false,
    clampToWorldBounds: true,
  };
}
