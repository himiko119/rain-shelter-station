export type VisualHexColor = `#${string}`;
export type VisualCssVariable = `--rain-station-${string}`;

export const VISUAL_COLOR_TOKENS = Object.freeze({
  nightInk: "#040a16",
  nightNavy: "#071326",
  panel: "#10253a",
  panelRaised: "#173344",
  rainBlue: "#6f9da8",
  rainMist: "#b8d8dd",
  wetSlate: "#506a78",
  stationCream: "#f2e8d3",
  lampGold: "#e5bf70",
  memoryCoral: "#c96f61",
  shadowViolet: "#343247",
  dawnBlue: "#b8d8dd",
  dawnPink: "#e7b8af",
  textPrimary: "#f5f1e6",
  textMuted: "#a9bec7",
  focus: "#f6d67a",
  danger: "#bd6672",
  success: "#7fb6a7",
} as const satisfies Readonly<Record<string, VisualHexColor>>);

export const VISUAL_SPACE_TOKENS = Object.freeze({
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const);

export const VISUAL_RADIUS_TOKENS = Object.freeze({
  small: 6,
  medium: 12,
  large: 20,
  pill: 999,
} as const);

export const VISUAL_MOTION_TOKENS = Object.freeze({
  fastMs: 120,
  normalMs: 220,
  slowMs: 420,
  reducedMs: 1,
} as const);

function requireHexColor(value: string): VisualHexColor {
  if (!/^#[\da-f]{6}$/iu.test(value)) {
    throw new Error(`Invalid visual color token: ${value}`);
  }
  return value as VisualHexColor;
}

export function hexToPhaserColor(value: VisualHexColor): number {
  return Number.parseInt(requireHexColor(value).slice(1), 16);
}

export const PHASER_VISUAL_TOKENS = Object.freeze({
  colors: Object.freeze({
    nightInk: hexToPhaserColor(VISUAL_COLOR_TOKENS.nightInk),
    nightNavy: hexToPhaserColor(VISUAL_COLOR_TOKENS.nightNavy),
    panel: hexToPhaserColor(VISUAL_COLOR_TOKENS.panel),
    panelRaised: hexToPhaserColor(VISUAL_COLOR_TOKENS.panelRaised),
    rainBlue: hexToPhaserColor(VISUAL_COLOR_TOKENS.rainBlue),
    rainMist: hexToPhaserColor(VISUAL_COLOR_TOKENS.rainMist),
    wetSlate: hexToPhaserColor(VISUAL_COLOR_TOKENS.wetSlate),
    stationCream: hexToPhaserColor(VISUAL_COLOR_TOKENS.stationCream),
    lampGold: hexToPhaserColor(VISUAL_COLOR_TOKENS.lampGold),
    memoryCoral: hexToPhaserColor(VISUAL_COLOR_TOKENS.memoryCoral),
    shadowViolet: hexToPhaserColor(VISUAL_COLOR_TOKENS.shadowViolet),
    dawnBlue: hexToPhaserColor(VISUAL_COLOR_TOKENS.dawnBlue),
    dawnPink: hexToPhaserColor(VISUAL_COLOR_TOKENS.dawnPink),
    textPrimary: hexToPhaserColor(VISUAL_COLOR_TOKENS.textPrimary),
    textMuted: hexToPhaserColor(VISUAL_COLOR_TOKENS.textMuted),
    focus: hexToPhaserColor(VISUAL_COLOR_TOKENS.focus),
    danger: hexToPhaserColor(VISUAL_COLOR_TOKENS.danger),
    success: hexToPhaserColor(VISUAL_COLOR_TOKENS.success),
  }),
  alpha: Object.freeze({
    disabled: 0.42,
    muted: 0.68,
    readableOverlay: 0.84,
    solid: 1,
  }),
  depth: Object.freeze({
    background: -100,
    scenery: -20,
    actors: 20,
    weather: 80,
    focus: 120,
  }),
} as const);

const COLOR_CSS_NAMES = {
  nightInk: "--rain-station-color-night-ink",
  nightNavy: "--rain-station-color-night-navy",
  panel: "--rain-station-color-panel",
  panelRaised: "--rain-station-color-panel-raised",
  rainBlue: "--rain-station-color-rain-blue",
  rainMist: "--rain-station-color-rain-mist",
  wetSlate: "--rain-station-color-wet-slate",
  stationCream: "--rain-station-color-station-cream",
  lampGold: "--rain-station-color-lamp-gold",
  memoryCoral: "--rain-station-color-memory-coral",
  shadowViolet: "--rain-station-color-shadow-violet",
  dawnBlue: "--rain-station-color-dawn-blue",
  dawnPink: "--rain-station-color-dawn-pink",
  textPrimary: "--rain-station-color-text-primary",
  textMuted: "--rain-station-color-text-muted",
  focus: "--rain-station-color-focus",
  danger: "--rain-station-color-danger",
  success: "--rain-station-color-success",
} as const satisfies Readonly<Record<keyof typeof VISUAL_COLOR_TOKENS, VisualCssVariable>>;

function toCssTokenName(name: string): string {
  return name.replace(/[A-Z]/gu, (character) => `-${character.toLowerCase()}`);
}

export function createVisualCssVariables(): Readonly<Record<VisualCssVariable, string>> {
  const declarations: Record<VisualCssVariable, string> = {};

  for (const [name, value] of Object.entries(VISUAL_COLOR_TOKENS)) {
    const tokenName = name as keyof typeof VISUAL_COLOR_TOKENS;
    declarations[COLOR_CSS_NAMES[tokenName]] = value;
  }
  for (const [name, value] of Object.entries(VISUAL_SPACE_TOKENS)) {
    declarations[`--rain-station-space-${toCssTokenName(name)}`] = `${value}px`;
  }
  for (const [name, value] of Object.entries(VISUAL_RADIUS_TOKENS)) {
    declarations[`--rain-station-radius-${toCssTokenName(name)}`] = `${value}px`;
  }
  for (const [name, value] of Object.entries(VISUAL_MOTION_TOKENS)) {
    declarations[`--rain-station-motion-${toCssTokenName(name)}`] = `${value}ms`;
  }

  return Object.freeze(declarations);
}

export const VISUAL_CSS_VARIABLES = createVisualCssVariables();

export function applyVisualCssVariables(
  target: Pick<CSSStyleDeclaration, "setProperty">,
  variables: Readonly<Record<VisualCssVariable, string>> = VISUAL_CSS_VARIABLES,
): void {
  for (const [name, value] of Object.entries(variables)) {
    target.setProperty(name, value);
  }
}

export function serializeVisualCssVariables(
  variables: Readonly<Record<VisualCssVariable, string>> = VISUAL_CSS_VARIABLES,
): string {
  return Object.entries(variables)
    .map(([name, value]) => `${name}: ${value};`)
    .join("\n");
}
