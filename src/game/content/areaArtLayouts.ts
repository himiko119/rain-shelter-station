import type { AreaId, Facing, Point } from "../core/types";

export interface Bounds {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface PolygonDefinition {
  readonly id: string;
  readonly points: readonly Point[];
}

export interface EllipseRegionDefinition {
  readonly center: Point;
  readonly radiusX: number;
  readonly radiusY: number;
}

export interface ArtExitDefinition {
  readonly id: string;
  readonly zone: readonly Point[];
  readonly approachPoint: Point;
  readonly targetAreaId: AreaId;
  readonly targetSafeSpawn: Point & { readonly facing: Facing };
}

export interface ArtHotspotDefinition {
  readonly id: string;
  readonly artAnchor: Point;
  readonly approachPoint: Point;
  readonly interactionRadius: number;
  readonly revealRadius: number;
}

export interface DepthProfile {
  readonly farY: number;
  readonly nearY: number;
  /** Final scale for the authored 96 x 112 character cells, not a multiplier. */
  readonly farScale: number;
  readonly nearScale: number;
}

export interface LightZoneDefinition {
  readonly id: string;
  readonly source: Point;
  readonly influence: EllipseRegionDefinition;
  readonly floorReflection: EllipseRegionDefinition;
  readonly color: `#${string}`;
  readonly reflectionColor: `#${string}`;
  readonly intensity: number;
  readonly shadowOpacityMultiplier: number;
  readonly rimLight: number;
  readonly availableFromStage?: number;
  readonly availableUntilStage?: number;
}

export interface RainRegionDefinition extends PolygonDefinition {
  readonly intensity: number;
  readonly availableFromStage?: number;
  readonly availableUntilStage?: number;
}

export interface RippleRegionDefinition extends EllipseRegionDefinition {
  readonly id: string;
  readonly intensity: number;
  readonly availableFromStage?: number;
  readonly availableUntilStage?: number;
}

export interface OccluderDefinition extends PolygonDefinition {
  readonly sourceBounds: Bounds;
  readonly baselineY: number;
  readonly alwaysForeground?: boolean;
}

export interface AreaArtLayout {
  readonly areaId: AreaId;
  readonly worldSize: {
    readonly width: 1120;
    readonly height: 630;
  };
  readonly safeSpawn: Point & { readonly facing: Facing };
  readonly walkablePolygon: readonly Point[];
  readonly obstaclePolygons: readonly PolygonDefinition[];
  readonly exits: readonly ArtExitDefinition[];
  readonly hotspots: readonly ArtHotspotDefinition[];
  readonly depthProfile: DepthProfile;
  readonly lightZones: readonly LightZoneDefinition[];
  readonly rainRegions: readonly RainRegionDefinition[];
  readonly rippleRegions: readonly RippleRegionDefinition[];
  readonly foregroundOccluders: readonly OccluderDefinition[];
  readonly cameraSafeBounds: Bounds;
}

export interface LightContribution {
  readonly zoneId: string;
  readonly weight: number;
}

export interface LightInfluence {
  readonly intensity: number;
  readonly brightness: number;
  readonly color: `#${string}`;
  readonly reflectionColor: `#${string}`;
  readonly shadowOpacityMultiplier: number;
  readonly rimLight: number;
  readonly contributions: readonly LightContribution[];
}

export interface ReachabilityOptions {
  readonly cellSize?: number;
  readonly clearance?: number;
  readonly allowDiagonal?: boolean;
}

const WORLD_SIZE = { width: 1120, height: 630 } as const;
const CAMERA_SAFE_BOUNDS = { x: 0, y: 0, width: 1120, height: 630 } as const;
const EPSILON = 1e-7;

const p = (x: number, y: number): Point => ({ x, y });

const rectanglePolygon = (
  x: number,
  y: number,
  width: number,
  height: number,
): readonly Point[] => [
  p(x, y),
  p(x + width, y),
  p(x + width, y + height),
  p(x, y + height),
];

const ellipse = (
  x: number,
  y: number,
  radiusX: number,
  radiusY: number,
): EllipseRegionDefinition => ({ center: p(x, y), radiusX, radiusY });

const hotspot = (
  id: string,
  artX: number,
  artY: number,
  approachX: number,
  approachY: number,
  interactionRadius = 52,
  revealRadius = 120,
): ArtHotspotDefinition => ({
  id,
  artAnchor: p(artX, artY),
  approachPoint: p(approachX, approachY),
  interactionRadius,
  revealRadius,
});

const occluder = (
  id: string,
  sourceBounds: Bounds,
  points: readonly Point[],
  baselineY: number,
  alwaysForeground = false,
): OccluderDefinition => ({
  id,
  sourceBounds,
  points,
  baselineY,
  ...(alwaysForeground ? { alwaysForeground: true } : {}),
});

const waitingRoomLayout: AreaArtLayout = {
  areaId: "area_waiting_room",
  worldSize: WORLD_SIZE,
  safeSpawn: { x: 350, y: 390, facing: "down" },
  walkablePolygon: [
    p(32, 334), p(1032, 334), p(1032, 310), p(1120, 310),
    p(1120, 610), p(32, 610),
  ],
  obstaclePolygons: [
    { id: "waiting_center_bench", points: [p(458, 315), p(755, 315), p(766, 356), p(449, 356)] },
    { id: "waiting_photo_booth", points: [p(838, 315), p(998, 315), p(1000, 368), p(834, 368)] },
    { id: "waiting_umbrella_rack", points: [p(143, 420), p(296, 418), p(309, 499), p(132, 511)] },
    { id: "waiting_window_bench", points: [p(799, 403), p(1074, 405), p(1072, 487), p(811, 493)] },
  ],
  exits: [
    {
      id: "exit_waiting_to_concourse",
      zone: rectanglePolygon(1068, 320, 52, 70),
      approachPoint: p(1048, 370),
      targetAreaId: "area_concourse",
      targetSafeSpawn: { x: 82, y: 386, facing: "right" },
    },
  ],
  hotspots: [
    hotspot("waiting_umbrella_stand", 220, 400, 330, 445),
    hotspot("waiting_umbrella_footprints", 430, 464, 440, 490),
    hotspot("waiting_red_boots_child", 760, 455, 700, 455, 64),
    hotspot("waiting_old_listener", 612, 392, 612, 452, 64),
    hotspot("waiting_photo_booth_dormant", 914, 245, 810, 374),
    hotspot("waiting_photo_booth_output", 914, 245, 810, 374),
    hotspot("waiting_clock", 558, 75, 558, 388),
    hotspot("waiting_rain_window", 300, 150, 350, 378),
  ],
  depthProfile: { farY: 334, nearY: 610, farScale: 0.42, nearScale: 0.68 },
  lightZones: [
    {
      id: "waiting_pendant",
      source: p(690, 73),
      influence: ellipse(635, 450, 260, 220),
      floorReflection: ellipse(635, 520, 225, 55),
      color: "#f4c875",
      reflectionColor: "#dcae61",
      intensity: 0.24,
      shadowOpacityMultiplier: 0.76,
      rimLight: 0.12,
    },
    {
      id: "waiting_window_blue",
      source: p(350, 180),
      influence: ellipse(380, 390, 330, 210),
      floorReflection: ellipse(390, 500, 300, 70),
      color: "#6ba8c4",
      reflectionColor: "#75a9be",
      intensity: 0.14,
      shadowOpacityMultiplier: 0.88,
      rimLight: 0.14,
    },
    {
      id: "waiting_booth_light",
      source: p(914, 83),
      influence: ellipse(912, 350, 110, 95),
      floorReflection: ellipse(912, 382, 95, 28),
      color: "#e7dcc0",
      reflectionColor: "#d6c9aa",
      intensity: 0.12,
      shadowOpacityMultiplier: 0.84,
      rimLight: 0.08,
    },
    {
      id: "waiting_exit_blue",
      source: p(1080, 280),
      influence: ellipse(1060, 380, 140, 130),
      floorReflection: ellipse(1055, 430, 120, 38),
      color: "#6da4be",
      reflectionColor: "#73a7b8",
      intensity: 0.1,
      shadowOpacityMultiplier: 0.9,
      rimLight: 0.11,
    },
  ],
  rainRegions: [
    { id: "waiting_window_rain", points: rectanglePolygon(82, 52, 758, 178), intensity: 0.12 },
    { id: "waiting_exit_rain", points: rectanglePolygon(1048, 85, 72, 260), intensity: 0.14 },
  ],
  rippleRegions: [
    { id: "waiting_footprint_ripples", ...ellipse(430, 464, 150, 55), intensity: 0.06 },
    { id: "waiting_lamp_ripples", ...ellipse(650, 493, 180, 62), intensity: 0.05 },
  ],
  foregroundOccluders: [
    occluder("waiting_center_bench", { x: 455, y: 235, width: 305, height: 122 }, rectanglePolygon(455, 235, 305, 122), 352),
    occluder("waiting_photo_booth", { x: 835, y: 68, width: 165, height: 302 }, rectanglePolygon(835, 68, 165, 302), 368),
    occluder("waiting_umbrella_rack", { x: 130, y: 350, width: 180, height: 165 }, rectanglePolygon(130, 350, 180, 165), 498),
    occluder("waiting_window_bench", { x: 796, y: 390, width: 279, height: 105 }, rectanglePolygon(796, 390, 279, 105), 488),
  ],
  cameraSafeBounds: CAMERA_SAFE_BOUNDS,
};

const concourseLayout: AreaArtLayout = {
  areaId: "area_concourse",
  worldSize: WORLD_SIZE,
  safeSpawn: { x: 82, y: 386, facing: "right" },
  walkablePolygon: [
    p(0, 336), p(280, 336), p(370, 316), p(520, 298), p(700, 298),
    p(840, 326), p(940, 348), p(1120, 348), p(1120, 610), p(0, 610),
  ],
  obstaclePolygons: [
    { id: "concourse_counter", points: [p(86, 292), p(292, 292), p(294, 354), p(82, 354)] },
    { id: "concourse_ticket_machine", points: [p(282, 315), p(381, 315), p(391, 411), p(274, 411)] },
    { id: "concourse_gate_left", points: [p(376, 320), p(431, 320), p(448, 413), p(380, 419)] },
    { id: "concourse_gate_inner_left", points: [p(467, 322), p(525, 320), p(538, 414), p(474, 418)] },
    { id: "concourse_gate_inner_right", points: [p(608, 319), p(660, 318), p(663, 411), p(606, 413)] },
    { id: "concourse_gate_right", points: [p(697, 318), p(760, 318), p(777, 414), p(700, 414)] },
    { id: "concourse_phone", points: [p(806, 330), p(887, 330), p(895, 406), p(800, 409)] },
    { id: "concourse_left_bench", points: [p(0, 415), p(111, 414), p(117, 492), p(0, 500)] },
    { id: "concourse_bench", points: [p(850, 412), p(1030, 412), p(1038, 500), p(843, 496)] },
  ],
  exits: [
    {
      id: "exit_concourse_to_waiting",
      zone: rectanglePolygon(0, 342, 54, 68),
      approachPoint: p(72, 386),
      targetAreaId: "area_waiting_room",
      targetSafeSpawn: { x: 1015, y: 382, facing: "left" },
    },
    {
      id: "exit_concourse_to_office",
      zone: rectanglePolygon(544, 299, 62, 41),
      approachPoint: p(575, 350),
      targetAreaId: "area_station_office",
      targetSafeSpawn: { x: 630, y: 530, facing: "down" },
    },
    {
      id: "exit_concourse_to_footbridge",
      zone: rectanglePolygon(1068, 350, 52, 52),
      approachPoint: p(1035, 380),
      targetAreaId: "area_footbridge",
      targetSafeSpawn: { x: 560, y: 310, facing: "down" },
    },
  ],
  hotspots: [
    hotspot("concourse_station_attendant", 195, 319, 205, 375, 64),
    hotspot("concourse_navy_bag_commuter", 795, 455, 735, 455, 64),
    hotspot("concourse_commuter_bag", 818, 463, 770, 480),
    hotspot("concourse_ticket_machine_dormant", 335, 275, 335, 440),
    hotspot("concourse_ticket_machine", 335, 275, 335, 440),
    hotspot("concourse_gate", 575, 350, 570, 440),
    hotspot("concourse_timetable", 433, 145, 250, 380),
    hotspot("concourse_phone_hotspot", 848, 270, 790, 430),
  ],
  depthProfile: { farY: 298, nearY: 610, farScale: 0.38, nearScale: 0.68 },
  lightZones: [
    {
      id: "concourse_ticket_window",
      source: p(211, 180),
      influence: ellipse(225, 375, 180, 145),
      floorReflection: ellipse(245, 430, 155, 45),
      color: "#efc677", reflectionColor: "#d8ae67", intensity: 0.18,
      shadowOpacityMultiplier: 0.8, rimLight: 0.09,
    },
    {
      id: "concourse_pendant",
      source: p(594, 157),
      influence: ellipse(594, 410, 225, 190),
      floorReflection: ellipse(594, 495, 190, 56),
      color: "#f1cd82", reflectionColor: "#d7b872", intensity: 0.2,
      shadowOpacityMultiplier: 0.78, rimLight: 0.11,
    },
    {
      id: "concourse_ticket_machine_light",
      source: p(335, 263),
      influence: ellipse(350, 400, 115, 105),
      floorReflection: ellipse(355, 425, 100, 30),
      color: "#a8e5ea", reflectionColor: "#93cfd5", intensity: 0.14,
      shadowOpacityMultiplier: 0.85, rimLight: 0.16,
    },
    {
      id: "concourse_phone_light",
      source: p(846, 237),
      influence: ellipse(840, 400, 105, 100),
      floorReflection: ellipse(838, 430, 90, 28),
      color: "#9edfe8", reflectionColor: "#88cbd4", intensity: 0.12,
      shadowOpacityMultiplier: 0.87, rimLight: 0.15,
    },
    {
      id: "concourse_right_window",
      source: p(985, 250),
      influence: ellipse(940, 410, 230, 185),
      floorReflection: ellipse(940, 505, 210, 58),
      color: "#6ba8c4", reflectionColor: "#78aabd", intensity: 0.1,
      shadowOpacityMultiplier: 0.9, rimLight: 0.12,
    },
  ],
  rainRegions: [
    { id: "concourse_glass_left", points: rectanglePolygon(390, 143, 86, 146), intensity: 0.08 },
    { id: "concourse_glass_center", points: rectanglePolygon(538, 142, 193, 150), intensity: 0.08 },
    { id: "concourse_glass_right", points: rectanglePolygon(758, 143, 50, 148), intensity: 0.08 },
    { id: "concourse_window_rain", points: [p(902, 70), p(1108, 53), p(1108, 330), p(901, 329)], intensity: 0.12 },
  ],
  rippleRegions: [
    { id: "concourse_left_reflection", ...ellipse(335, 470, 160, 60), intensity: 0.05 },
    { id: "concourse_center_reflection", ...ellipse(590, 480, 190, 68), intensity: 0.05 },
    { id: "concourse_right_reflection", ...ellipse(925, 510, 130, 62), intensity: 0.04 },
  ],
  foregroundOccluders: [
    occluder("concourse_counter", { x: 82, y: 174, width: 212, height: 181 }, rectanglePolygon(82, 174, 212, 181), 354),
    occluder("concourse_ticket_machine", { x: 274, y: 190, width: 117, height: 222 }, rectanglePolygon(274, 190, 117, 222), 411),
    occluder("concourse_gate_bank", { x: 376, y: 260, width: 401, height: 160 }, rectanglePolygon(376, 260, 401, 160), 416),
    occluder("concourse_phone", { x: 800, y: 190, width: 95, height: 218 }, rectanglePolygon(800, 190, 95, 218), 407),
    occluder("concourse_left_bench", { x: 0, y: 390, width: 118, height: 112 }, rectanglePolygon(0, 390, 118, 112), 496),
    occluder("concourse_bench", { x: 843, y: 385, width: 260, height: 115 }, rectanglePolygon(843, 385, 260, 115), 496),
  ],
  cameraSafeBounds: CAMERA_SAFE_BOUNDS,
};

const stationOfficeLayout: AreaArtLayout = {
  areaId: "area_station_office",
  worldSize: WORLD_SIZE,
  safeSpawn: { x: 630, y: 530, facing: "down" },
  walkablePolygon: [
    p(535, 438), p(725, 438), p(790, 474), p(835, 525),
    p(880, 610), p(455, 610), p(470, 530), p(490, 476),
  ],
  obstaclePolygons: [
    { id: "office_desk", points: [p(0, 345), p(514, 345), p(526, 455), p(481, 610), p(0, 610)] },
    { id: "office_chair", points: [p(0, 411), p(235, 411), p(305, 488), p(312, 630), p(0, 630)] },
    { id: "office_shelf", points: [p(742, 80), p(871, 80), p(869, 487), p(800, 501), p(742, 456)] },
    { id: "office_refrigerator_body", points: [p(820, 286), p(960, 290), p(970, 559), p(870, 573), p(819, 535)] },
    { id: "office_foreground_shelf", points: [p(907, 342), p(1120, 342), p(1120, 630), p(882, 630), p(885, 530)] },
  ],
  exits: [
    {
      id: "exit_office_to_concourse",
      zone: rectanglePolygon(580, 438, 120, 40),
      approachPoint: p(640, 490),
      targetAreaId: "area_concourse",
      targetSafeSpawn: { x: 570, y: 440, facing: "down" },
    },
  ],
  hotspots: [
    hotspot("office_refrigerator", 893, 397, 800, 530),
    hotspot("office_moon_youth", 742, 558, 682, 558, 64),
    hotspot("office_mirror_early", 199, 179, 545, 470),
    hotspot("office_mirror", 199, 179, 545, 470),
    hotspot("office_ledger", 288, 400, 530, 515),
    hotspot("office_key_board", 87, 147, 550, 495),
  ],
  depthProfile: { farY: 438, nearY: 610, farScale: 0.48, nearScale: 0.68 },
  lightZones: [
    {
      id: "office_desk_lamp", source: p(278, 268),
      influence: ellipse(490, 485, 180, 150), floorReflection: ellipse(485, 535, 150, 45),
      color: "#f2c879", reflectionColor: "#d9ad64", intensity: 0.25,
      shadowOpacityMultiplier: 0.74, rimLight: 0.1,
    },
    {
      id: "office_window_blue", source: p(430, 250),
      influence: ellipse(555, 475, 190, 140), floorReflection: ellipse(555, 525, 165, 42),
      color: "#77a9bd", reflectionColor: "#82aebb", intensity: 0.11,
      shadowOpacityMultiplier: 0.9, rimLight: 0.13,
    },
    {
      id: "office_door_pane", source: p(642, 260),
      influence: ellipse(640, 470, 130, 115), floorReflection: ellipse(640, 500, 105, 30),
      color: "#83b2c1", reflectionColor: "#89b3bd", intensity: 0.1,
      shadowOpacityMultiplier: 0.9, rimLight: 0.11,
    },
    {
      id: "office_lantern", source: p(902, 253),
      influence: ellipse(825, 515, 105, 90), floorReflection: ellipse(830, 540, 80, 24),
      color: "#e4b86f", reflectionColor: "#c99d58", intensity: 0.09,
      shadowOpacityMultiplier: 0.88, rimLight: 0.06,
    },
  ],
  rainRegions: [
    { id: "office_window_rain", points: rectanglePolygon(343, 35, 190, 270), intensity: 0.1 },
    { id: "office_door_rain", points: rectanglePolygon(594, 128, 112, 158), intensity: 0.07 },
  ],
  rippleRegions: [],
  foregroundOccluders: [
    occluder("office_desk", { x: 0, y: 340, width: 526, height: 270 }, rectanglePolygon(0, 340, 526, 270), 485),
    occluder("office_chair", { x: 0, y: 410, width: 312, height: 220 }, rectanglePolygon(0, 410, 312, 220), 610),
    occluder("office_shelf", { x: 740, y: 72, width: 135, height: 430 }, rectanglePolygon(740, 72, 135, 430), 500),
    occluder("office_refrigerator_body", { x: 820, y: 285, width: 155, height: 290 }, rectanglePolygon(820, 285, 155, 290), 570),
    occluder("office_foreground_shelf", { x: 900, y: 340, width: 220, height: 290 }, rectanglePolygon(900, 340, 220, 290), 610),
  ],
  cameraSafeBounds: CAMERA_SAFE_BOUNDS,
};

const footbridgeLayout: AreaArtLayout = {
  areaId: "area_footbridge",
  worldSize: WORLD_SIZE,
  safeSpawn: { x: 560, y: 310, facing: "down" },
  walkablePolygon: [
    p(486, 238), p(628, 238), p(1030, 330), p(1020, 610), p(330, 610), p(345, 336),
  ],
  obstaclePolygons: [
    { id: "footbridge_railing_left", points: [p(70, 334), p(350, 334), p(356, 535), p(70, 535)] },
    { id: "footbridge_stair_opening", points: [p(590, 330), p(1005, 330), p(1005, 522), p(930, 522), p(850, 548), p(650, 523)] },
    { id: "footbridge_cassette_bench_body", points: [p(330, 322), p(454, 322), p(463, 356), p(323, 356)] },
  ],
  exits: [
    {
      id: "exit_footbridge_to_concourse",
      zone: rectanglePolygon(508, 238, 104, 40),
      approachPoint: p(560, 290),
      targetAreaId: "area_concourse",
      targetSafeSpawn: { x: 1035, y: 380, facing: "left" },
    },
    {
      id: "exit_footbridge_to_platform",
      zone: [p(840, 548), p(1005, 548), p(1005, 610), p(825, 610)],
      approachPoint: p(820, 570),
      targetAreaId: "area_rain_platform",
      targetSafeSpawn: { x: 100, y: 560, facing: "right" },
    },
  ],
  hotspots: [
    hotspot("footbridge_cassette_bench", 386, 346, 478, 360),
    hotspot("footbridge_ginkgo_student", 700, 315, 640, 300, 64),
    hotspot("footbridge_high_window", 205, 160, 485, 310),
    hotspot("footbridge_notice", 560, 210, 560, 290),
    hotspot("footbridge_railing", 310, 390, 405, 430),
  ],
  depthProfile: { farY: 245, nearY: 610, farScale: 0.34, nearScale: 0.7 },
  lightZones: [
    {
      id: "footbridge_fluorescent_far", source: p(552, 110),
      influence: ellipse(552, 270, 100, 80), floorReflection: ellipse(552, 290, 80, 20),
      color: "#dbe7df", reflectionColor: "#b9d0cb", intensity: 0.09,
      shadowOpacityMultiplier: 0.9, rimLight: 0.1,
    },
    {
      id: "footbridge_fluorescent_mid", source: p(552, 160),
      influence: ellipse(552, 365, 160, 120), floorReflection: ellipse(552, 405, 130, 32),
      color: "#dbe7df", reflectionColor: "#b9d0cb", intensity: 0.12,
      shadowOpacityMultiplier: 0.86, rimLight: 0.12,
    },
    {
      id: "footbridge_fluorescent_near", source: p(552, 190),
      influence: ellipse(552, 525, 250, 180), floorReflection: ellipse(552, 565, 205, 48),
      color: "#dbe7df", reflectionColor: "#b9d0cb", intensity: 0.13,
      shadowOpacityMultiplier: 0.84, rimLight: 0.13,
    },
    {
      id: "footbridge_left_window", source: p(280, 200),
      influence: ellipse(280, 320, 220, 180), floorReflection: ellipse(390, 430, 160, 42),
      color: "#6b9fba", reflectionColor: "#75a4b5", intensity: 0.08,
      shadowOpacityMultiplier: 0.93, rimLight: 0.11,
    },
    {
      id: "footbridge_right_window", source: p(820, 200),
      influence: ellipse(820, 320, 230, 180), floorReflection: ellipse(690, 430, 160, 42),
      color: "#6b9fba", reflectionColor: "#75a4b5", intensity: 0.08,
      shadowOpacityMultiplier: 0.93, rimLight: 0.11,
    },
  ],
  rainRegions: [
    { id: "footbridge_left_window_rain", points: [p(0, 36), p(482, 163), p(482, 301), p(0, 330)], intensity: 0.12 },
    { id: "footbridge_right_window_rain", points: [p(636, 156), p(1120, 31), p(1120, 334), p(642, 301)], intensity: 0.12 },
  ],
  rippleRegions: [
    { id: "footbridge_mid_reflection", ...ellipse(550, 375, 130, 75), intensity: 0.05 },
    { id: "footbridge_near_reflection", ...ellipse(525, 530, 180, 75), intensity: 0.06 },
  ],
  foregroundOccluders: [
    occluder("footbridge_railing_left", { x: 70, y: 332, width: 286, height: 205 }, rectanglePolygon(70, 332, 286, 205), 535),
    occluder("footbridge_stair_railing_back", { x: 586, y: 328, width: 416, height: 110 }, [p(586, 328), p(1002, 328), p(1002, 438), p(620, 438)], 438),
    occluder("footbridge_stair_railing_left", { x: 586, y: 328, width: 90, height: 225 }, [p(586, 328), p(620, 328), p(676, 530), p(640, 553)], 548),
    occluder("footbridge_stair_railing_right", { x: 760, y: 338, width: 242, height: 215 }, [p(960, 338), p(1002, 338), p(850, 553), p(810, 530)], 548),
    occluder("footbridge_cassette_bench_body", { x: 315, y: 282, width: 150, height: 74 }, rectanglePolygon(315, 282, 150, 74), 356),
  ],
  cameraSafeBounds: CAMERA_SAFE_BOUNDS,
};

const platformLayout: AreaArtLayout = {
  areaId: "area_rain_platform",
  worldSize: WORLD_SIZE,
  safeSpawn: { x: 100, y: 560, facing: "right" },
  walkablePolygon: [
    p(517, 315), p(678, 315), p(492, 610), p(0, 610), p(0, 532),
    p(35, 500), p(330, 491), p(330, 443), p(517, 443),
  ],
  obstaclePolygons: [
    { id: "platform_left_canopy_post", points: [p(18, 315), p(55, 315), p(60, 525), p(17, 525)] },
    { id: "platform_bench", points: [p(49, 382), p(305, 370), p(316, 461), p(48, 477)] },
    { id: "platform_umbrella_rack", points: [p(318, 365), p(384, 362), p(390, 425), p(310, 429)] },
    { id: "platform_vending_body", points: [p(377, 350), p(461, 348), p(466, 415), p(373, 420)] },
    { id: "platform_center_canopy_post", points: [p(455, 310), p(489, 310), p(492, 431), p(451, 431)] },
    { id: "platform_sign_post", points: [p(267, 315), p(292, 315), p(294, 371), p(265, 371)] },
  ],
  exits: [
    {
      id: "exit_platform_to_footbridge",
      zone: rectanglePolygon(0, 535, 72, 95),
      approachPoint: p(82, 560),
      targetAreaId: "area_footbridge",
      targetSafeSpawn: { x: 800, y: 570, facing: "right" },
    },
  ],
  hotspots: [
    hotspot("platform_drain_hairclip", 484, 514, 450, 520),
    hotspot("platform_station_sign", 282, 183, 335, 450),
    hotspot("platform_vending_machine", 420, 300, 530, 400),
    hotspot("platform_puddle", 300, 530, 300, 530),
    hotspot("platform_last_train", 830, 325, 570, 430, 64),
    hotspot("platform_dawn_train", 820, 315, 570, 430, 64),
  ],
  depthProfile: { farY: 315, nearY: 610, farScale: 0.44, nearScale: 0.68 },
  lightZones: [
    {
      id: "platform_pendant", source: p(393, 107),
      influence: ellipse(390, 415, 250, 220), floorReflection: ellipse(390, 520, 210, 62),
      color: "#f2c977", reflectionColor: "#d8ac63", intensity: 0.23,
      shadowOpacityMultiplier: 0.76, rimLight: 0.11, availableUntilStage: 6,
    },
    {
      id: "platform_vending_light", source: p(420, 290),
      influence: ellipse(445, 400, 110, 100), floorReflection: ellipse(450, 430, 90, 28),
      color: "#ead99f", reflectionColor: "#d0bd84", intensity: 0.12,
      shadowOpacityMultiplier: 0.86, rimLight: 0.09,
    },
    {
      id: "platform_night_ambient", source: p(650, 220),
      influence: ellipse(650, 360, 300, 240), floorReflection: ellipse(575, 470, 220, 55),
      color: "#6f9eb7", reflectionColor: "#78a6b5", intensity: 0.1,
      shadowOpacityMultiplier: 0.9, rimLight: 0.13, availableUntilStage: 5,
    },
    {
      id: "platform_train_headlights", source: p(848, 314),
      influence: ellipse(610, 405, 190, 145), floorReflection: ellipse(595, 460, 160, 38),
      color: "#ffd58c", reflectionColor: "#dfb96f", intensity: 0.2,
      shadowOpacityMultiplier: 0.78, rimLight: 0.16,
      availableFromStage: 5, availableUntilStage: 5,
    },
    {
      id: "platform_dawn_ambient", source: p(760, 120),
      influence: ellipse(520, 440, 720, 420), floorReflection: ellipse(440, 500, 360, 90),
      color: "#f0c9a0", reflectionColor: "#ddb98f", intensity: 0.12,
      shadowOpacityMultiplier: 0.86, rimLight: 0.1, availableFromStage: 6,
    },
  ],
  rainRegions: [
    {
      id: "platform_open_rain",
      points: [p(490, 0), p(1120, 0), p(1120, 630), p(492, 630), p(678, 315), p(490, 315)],
      intensity: 0.28,
      availableUntilStage: 5,
    },
    {
      id: "platform_blown_in_rain",
      points: [p(440, 170), p(620, 170), p(560, 520), p(430, 520)],
      intensity: 0.06,
      availableUntilStage: 5,
    },
  ],
  rippleRegions: [
    { id: "platform_near_ripples", ...ellipse(295, 520, 210, 82), intensity: 0.08, availableUntilStage: 5 },
    { id: "platform_mid_ripples", ...ellipse(420, 425, 145, 68), intensity: 0.06, availableUntilStage: 5 },
  ],
  foregroundOccluders: [
    occluder("platform_canopy_front", { x: 0, y: 0, width: 620, height: 160 }, [p(0, 0), p(620, 0), p(580, 145), p(0, 145)], 631, true),
    occluder("platform_left_canopy_post", { x: 18, y: 0, width: 45, height: 530 }, rectanglePolygon(18, 0, 45, 530), 525),
    occluder("platform_bench", { x: 43, y: 335, width: 275, height: 145 }, rectanglePolygon(43, 335, 275, 145), 470),
    occluder("platform_umbrella_rack", { x: 310, y: 330, width: 85, height: 100 }, rectanglePolygon(310, 330, 85, 100), 425),
    occluder("platform_vending_body", { x: 375, y: 233, width: 93, height: 190 }, rectanglePolygon(375, 233, 93, 190), 418),
    occluder("platform_center_canopy_post", { x: 452, y: 110, width: 42, height: 325 }, rectanglePolygon(452, 110, 42, 325), 432),
    occluder("platform_sign_post", { x: 230, y: 120, width: 110, height: 255 }, rectanglePolygon(230, 120, 110, 255), 372),
  ],
  cameraSafeBounds: CAMERA_SAFE_BOUNDS,
};

export const AREA_ART_LAYOUTS: readonly AreaArtLayout[] = Object.freeze([
  waitingRoomLayout,
  concourseLayout,
  stationOfficeLayout,
  footbridgeLayout,
  platformLayout,
]);

const AREA_ART_LAYOUT_BY_ID = new Map(
  AREA_ART_LAYOUTS.map((layout) => [layout.areaId, layout] as const),
);

export function getAreaArtLayout(areaId: AreaId): AreaArtLayout {
  const layout = AREA_ART_LAYOUT_BY_ID.get(areaId);
  if (!layout) throw new Error(`Unknown area art layout: ${areaId}`);
  return layout;
}

function squaredDistance(left: Point, right: Point): number {
  const dx = left.x - right.x;
  const dy = left.y - right.y;
  return dx * dx + dy * dy;
}

function squaredDistanceToSegment(point: Point, start: Point, end: Point): number {
  const segmentX = end.x - start.x;
  const segmentY = end.y - start.y;
  const lengthSquared = segmentX * segmentX + segmentY * segmentY;
  if (lengthSquared <= EPSILON) return squaredDistance(point, start);
  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * segmentX + (point.y - start.y) * segmentY) / lengthSquared,
  ));
  return squaredDistance(point, {
    x: start.x + segmentX * projection,
    y: start.y + segmentY * projection,
  });
}

export function distanceToPolygon(point: Point, polygon: readonly Point[]): number {
  if (polygon.length < 2) return Number.POSITIVE_INFINITY;
  let nearestSquared = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    const start = polygon[index];
    const end = polygon[(index + 1) % polygon.length];
    if (!start || !end) continue;
    nearestSquared = Math.min(nearestSquared, squaredDistanceToSegment(point, start, end));
  }
  return Math.sqrt(nearestSquared);
}

export function pointInPolygon(point: Point, polygon: readonly Point[]): boolean {
  if (polygon.length < 3 || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  if (distanceToPolygon(point, polygon) <= EPSILON) return true;

  let inside = false;
  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    if (!current || !previous) continue;
    const crosses = (current.y > point.y) !== (previous.y > point.y)
      && point.x < ((previous.x - current.x) * (point.y - current.y))
        / (previous.y - current.y) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

export function pointInInflatedPolygon(
  point: Point,
  polygon: readonly Point[],
  inflation: number,
): boolean {
  if (pointInPolygon(point, polygon)) return true;
  return inflation > 0 && distanceToPolygon(point, polygon) <= inflation;
}

export function isSafePoint(
  layout: AreaArtLayout,
  point: Point,
  obstacleClearance = 0,
): boolean {
  if (
    !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
    || point.x < 0
    || point.x > layout.worldSize.width
    || point.y < 0
    || point.y > layout.worldSize.height
    || !pointInPolygon(point, layout.walkablePolygon)
  ) return false;
  return !layout.obstaclePolygons.some((obstacle) =>
    pointInInflatedPolygon(point, obstacle.points, Math.max(0, obstacleClearance))
  );
}

export function projectToSafePoint(
  layout: AreaArtLayout,
  point: Point,
  options: { readonly clearance?: number; readonly gridStep?: number } = {},
): Point {
  const clearance = Math.max(0, options.clearance ?? 14);
  const gridStep = Math.max(2, Math.round(options.gridStep ?? 8));
  if (isSafePoint(layout, point, clearance)) return { x: point.x, y: point.y };

  const origin = Number.isFinite(point.x) && Number.isFinite(point.y)
    ? point
    : layout.safeSpawn;
  let best: Point | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  const consider = (candidate: Point): void => {
    if (!isSafePoint(layout, candidate, clearance)) return;
    const distance = squaredDistance(origin, candidate);
    if (
      distance < bestDistance - EPSILON
      || (Math.abs(distance - bestDistance) <= EPSILON
        && (best === null || candidate.y < best.y || (candidate.y === best.y && candidate.x < best.x)))
    ) {
      best = { x: candidate.x, y: candidate.y };
      bestDistance = distance;
    }
  };

  consider(layout.safeSpawn);
  for (const exit of layout.exits) consider(exit.approachPoint);
  for (const hotspotDefinition of layout.hotspots) consider(hotspotDefinition.approachPoint);
  for (let y = 0; y <= layout.worldSize.height; y += gridStep) {
    for (let x = 0; x <= layout.worldSize.width; x += gridStep) consider({ x, y });
  }

  if (best) return best;
  if (clearance > 0) return projectToSafePoint(layout, point, { clearance: 0, gridStep });
  throw new Error(`Area ${layout.areaId} has no safe point`);
}

export function depthScaleAt(layout: AreaArtLayout, footY: number): number {
  const { farY, nearY, farScale, nearScale } = layout.depthProfile;
  const denominator = nearY - farY;
  const ratio = denominator === 0
    ? 0
    : Math.max(0, Math.min(1, (footY - farY) / denominator));
  return farScale + (nearScale - farScale) * ratio;
}

function stageMatches(
  definition: { readonly availableFromStage?: number; readonly availableUntilStage?: number },
  stage: number,
): boolean {
  return (definition.availableFromStage === undefined || stage >= definition.availableFromStage)
    && (definition.availableUntilStage === undefined || stage <= definition.availableUntilStage);
}

function ellipseWeight(point: Point, region: EllipseRegionDefinition): number {
  if (region.radiusX <= 0 || region.radiusY <= 0) return 0;
  const normalizedX = (point.x - region.center.x) / region.radiusX;
  const normalizedY = (point.y - region.center.y) / region.radiusY;
  return Math.max(0, 1 - Math.sqrt(normalizedX * normalizedX + normalizedY * normalizedY));
}

function parseColor(color: `#${string}`): readonly [number, number, number] {
  const value = color.slice(1);
  if (!/^[0-9a-f]{6}$/iu.test(value)) return [255, 255, 255];
  return [
    Number.parseInt(value.slice(0, 2), 16),
    Number.parseInt(value.slice(2, 4), 16),
    Number.parseInt(value.slice(4, 6), 16),
  ];
}

function blendedColor(
  weightedColors: readonly { readonly color: `#${string}`; readonly weight: number }[],
): `#${string}` {
  const total = weightedColors.reduce((sum, entry) => sum + entry.weight, 0);
  if (total <= EPSILON) return "#ffffff";
  const channels = weightedColors.reduce<[number, number, number]>((sum, entry) => {
    const [red, green, blue] = parseColor(entry.color);
    sum[0] += red * entry.weight;
    sum[1] += green * entry.weight;
    sum[2] += blue * entry.weight;
    return sum;
  }, [0, 0, 0]);
  return `#${channels.map((channel) =>
    Math.round(channel / total).toString(16).padStart(2, "0")
  ).join("")}`;
}

export function lightInfluenceAt(
  layout: AreaArtLayout,
  point: Point,
  stage = 0,
): LightInfluence {
  const active = layout.lightZones
    .filter((zone) => stageMatches(zone, stage))
    .map((zone) => ({ zone, weight: ellipseWeight(point, zone.influence) * zone.intensity }))
    .filter((entry) => entry.weight > EPSILON);
  const rawIntensity = active.reduce((sum, entry) => sum + entry.weight, 0);
  const intensity = Math.min(1, rawIntensity);
  return {
    intensity,
    brightness: 1 + intensity,
    color: blendedColor(active.map(({ zone, weight }) => ({ color: zone.color, weight }))),
    reflectionColor: blendedColor(active.map(({ zone, weight }) => ({ color: zone.reflectionColor, weight }))),
    shadowOpacityMultiplier: Math.max(0.4, Math.min(1,
      1 - active.reduce((sum, { zone, weight }) =>
        sum + weight * (1 - zone.shadowOpacityMultiplier), 0),
    )),
    rimLight: Math.min(1, active.reduce((sum, { zone, weight }) => sum + weight * zone.rimLight, 0)),
    contributions: active.map(({ zone, weight }) => ({ zoneId: zone.id, weight })),
  };
}

function segmentIsSafe(
  layout: AreaArtLayout,
  start: Point,
  end: Point,
  clearance: number,
  sampleStep: number,
): boolean {
  const distance = Math.sqrt(squaredDistance(start, end));
  const samples = Math.max(1, Math.ceil(distance / sampleStep));
  for (let index = 0; index <= samples; index += 1) {
    const ratio = index / samples;
    if (!isSafePoint(layout, {
      x: start.x + (end.x - start.x) * ratio,
      y: start.y + (end.y - start.y) * ratio,
    }, clearance)) return false;
  }
  return true;
}

/**
 * Resolves a single logical-foot movement step without crossing room edges or
 * inflated furniture. Diagonal input may slide along one safe axis.
 */
export function resolveSafeStep(
  layout: AreaArtLayout,
  start: Point,
  desired: Point,
  clearance = 14,
): Point {
  const safeClearance = Math.max(0, clearance);
  const safeStart = isSafePoint(layout, start, safeClearance)
    ? { x: start.x, y: start.y }
    : projectToSafePoint(layout, start, { clearance: safeClearance });
  const sampleStep = 4;
  const canMoveTo = (candidate: Point): boolean =>
    isSafePoint(layout, candidate, safeClearance)
    && segmentIsSafe(layout, safeStart, candidate, safeClearance, sampleStep);

  if (canMoveTo(desired)) return { x: desired.x, y: desired.y };

  const deltaX = desired.x - safeStart.x;
  const deltaY = desired.y - safeStart.y;
  const horizontal = { x: desired.x, y: safeStart.y };
  const vertical = { x: safeStart.x, y: desired.y };
  const candidates = Math.abs(deltaX) >= Math.abs(deltaY)
    ? [horizontal, vertical]
    : [vertical, horizontal];
  const slide = candidates.find(canMoveTo);
  return slide ? { x: slide.x, y: slide.y } : safeStart;
}

function simplifySafePath(
  layout: AreaArtLayout,
  points: readonly Point[],
  clearance: number,
  sampleStep: number,
): readonly Point[] {
  const first = points[0];
  if (!first || points.length < 2) return points;
  const simplified: Point[] = [{ x: first.x, y: first.y }];
  let anchorIndex = 0;
  while (anchorIndex < points.length - 1) {
    let nextIndex = points.length - 1;
    const anchor = points[anchorIndex];
    if (!anchor) break;
    while (nextIndex > anchorIndex + 1) {
      const candidate = points[nextIndex];
      if (candidate && segmentIsSafe(layout, anchor, candidate, clearance, sampleStep)) break;
      nextIndex -= 1;
    }
    const next = points[nextIndex];
    if (!next) break;
    simplified.push({ x: next.x, y: next.y });
    anchorIndex = nextIndex;
  }
  return simplified;
}

/** Returns a deterministic, line-of-sight simplified grid path. */
export function findPathOnGrid(
  layout: AreaArtLayout,
  start: Point,
  target: Point,
  options: ReachabilityOptions = {},
): readonly Point[] | null {
  const cellSize = Math.max(6, Math.round(options.cellSize ?? 16));
  const clearance = Math.max(0, options.clearance ?? 4);
  const allowDiagonal = options.allowDiagonal ?? true;
  if (!isSafePoint(layout, start, clearance) || !isSafePoint(layout, target, clearance)) return null;
  if (segmentIsSafe(layout, start, target, clearance, cellSize / 4)) {
    return [{ x: start.x, y: start.y }, { x: target.x, y: target.y }];
  }

  const columns = Math.floor(layout.worldSize.width / cellSize) + 1;
  const rows = Math.floor(layout.worldSize.height / cellSize) + 1;
  const pointAt = (column: number, row: number): Point => ({
    x: column * cellSize,
    y: row * cellSize,
  });
  const closestNode = (point: Point): readonly [number, number] | null => {
    let closest: readonly [number, number] | null = null;
    let closestDistance = Number.POSITIVE_INFINITY;
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const candidate = pointAt(column, row);
        const distance = squaredDistance(point, candidate);
        if (distance > closestDistance + EPSILON || !isSafePoint(layout, candidate, clearance)) continue;
        if (!segmentIsSafe(layout, point, candidate, clearance, cellSize / 4)) continue;
        if (
          distance < closestDistance - EPSILON
          || closest === null
          || row < closest[1]
          || (row === closest[1] && column < closest[0])
        ) {
          closest = [column, row];
          closestDistance = distance;
        }
      }
    }
    return closest;
  };

  const startNode = closestNode(start);
  const targetNode = closestNode(target);
  if (!startNode || !targetNode) return null;
  const key = (column: number, row: number): string => `${column}:${row}`;
  const startKey = key(startNode[0], startNode[1]);
  const targetKey = key(targetNode[0], targetNode[1]);
  const queue: Array<readonly [number, number]> = [startNode];
  const visited = new Set<string>([startKey]);
  const parentByKey = new Map<string, string | null>([[startKey, null]]);
  const nodeByKey = new Map<string, readonly [number, number]>([[startKey, startNode]]);
  const cardinal = [[1, 0], [-1, 0], [0, 1], [0, -1]] as const;
  const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]] as const;
  const directions = allowDiagonal ? [...cardinal, ...diagonal] : cardinal;
  let queueIndex = 0;

  while (queueIndex < queue.length) {
    const current = queue[queueIndex];
    queueIndex += 1;
    if (!current) continue;
    const [column, row] = current;
    const currentKey = key(column, row);
    if (currentKey === targetKey) {
      const reversedGridPoints: Point[] = [];
      let pathKey: string | null = targetKey;
      while (pathKey !== null) {
        const node = nodeByKey.get(pathKey);
        if (!node) return null;
        reversedGridPoints.push(pointAt(node[0], node[1]));
        pathKey = parentByKey.get(pathKey) ?? null;
      }
      reversedGridPoints.reverse();
      const fullPath = [
        { x: start.x, y: start.y },
        ...reversedGridPoints,
        { x: target.x, y: target.y },
      ];
      return simplifySafePath(layout, fullPath, clearance, cellSize / 4);
    }

    const currentPoint = pointAt(column, row);
    for (const [columnOffset, rowOffset] of directions) {
      const nextColumn = column + columnOffset;
      const nextRow = row + rowOffset;
      if (nextColumn < 0 || nextColumn >= columns || nextRow < 0 || nextRow >= rows) continue;
      const nextKey = key(nextColumn, nextRow);
      if (visited.has(nextKey)) continue;
      const nextPoint = pointAt(nextColumn, nextRow);
      if (
        !isSafePoint(layout, nextPoint, clearance)
        || !segmentIsSafe(layout, currentPoint, nextPoint, clearance, cellSize / 4)
      ) continue;
      visited.add(nextKey);
      parentByKey.set(nextKey, currentKey);
      const nextNode = [nextColumn, nextRow] as const;
      nodeByKey.set(nextKey, nextNode);
      queue.push(nextNode);
    }
  }
  return null;
}

export function isReachableOnGrid(
  layout: AreaArtLayout,
  start: Point,
  target: Point,
  options: ReachabilityOptions = {},
): boolean {
  return findPathOnGrid(layout, start, target, options) !== null;
}

export function validateLayoutReachability(
  layout: AreaArtLayout,
  options: ReachabilityOptions = {},
): {
  readonly unreachableHotspotIds: readonly string[];
  readonly unreachableExitIds: readonly string[];
} {
  return {
    unreachableHotspotIds: layout.hotspots
      .filter((definition) => !isReachableOnGrid(layout, layout.safeSpawn, definition.approachPoint, options))
      .map((definition) => definition.id),
    unreachableExitIds: layout.exits
      .filter((definition) => !isReachableOnGrid(layout, layout.safeSpawn, definition.approachPoint, options))
      .map((definition) => definition.id),
  };
}
