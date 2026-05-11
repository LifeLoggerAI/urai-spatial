export type UraiSpatialWorldMode = 'home' | 'ascent' | 'lifeMap' | 'focus' | 'replay' | 'mirror' | 'unwinding' | 'xr';

export type UraiSpatialFallbackMode = 'webgl' | 'canvas' | 'dom';

export type UraiSpatialXRSessionMode = 'none' | 'vr' | 'ar';

export type UraiSpatialXRInputMode = 'gaze' | 'controller' | 'hand';

export type UraiSpatialCameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
  zoom?: number;
};

export type UraiSpatialNavigationFrame = {
  mode: UraiSpatialWorldMode;
  camera: UraiSpatialCameraSnapshot;
  selectedStarId?: string;
  activeConstellationId?: string;
  activeReplayId?: string;
  activeMirrorContextId?: string;
};

export type UraiSpatialXRState = {
  enabled: boolean;
  available: boolean;
  sessionMode: UraiSpatialXRSessionMode;
  inputModes: UraiSpatialXRInputMode[];
  comfortMode: boolean;
  handTrackingAvailable: boolean;
  controllerAvailable: boolean;
  headsetSafeOverlay: boolean;
};

export type UraiSpatialWorldState = {
  mode: UraiSpatialWorldMode;
  camera: UraiSpatialCameraSnapshot;
  selectedStarId?: string;
  activeConstellationId?: string;
  activeReplayId?: string;
  activeMirrorContextId?: string;
  transitionPhase?: string;
  reducedMotion: boolean;
  webglAvailable: boolean;
  fallbackMode: UraiSpatialFallbackMode;
  navigationStack: UraiSpatialNavigationFrame[];
  xr: UraiSpatialXRState;
};

export type UraiSpatialStar3D = {
  id: string;
  title: string;
  kind: 'current' | 'memory' | 'recovery' | 'relationship' | 'ritual' | 'threshold' | 'council';
  position: {
    x: number;
    y: number;
    z: number;
  };
  relatedStarIds: string[];
  intensity: number;
  why: string;
};

export type UraiSpatialConstellationPath3D = {
  id: string;
  kind: 'chapter' | 'recovery' | 'relationship' | 'ritual' | 'threshold' | 'replay';
  starIds: string[];
  points: Array<{ x: number; y: number; z: number }>;
};

export const URAI_CAMERA_PRESETS = {
  home: {
    position: [0, 1.8, 9],
    target: [0, 1.4, 0],
    fov: 42,
  },
  ascent: {
    position: [0, 4.5, 12],
    target: [0, 8, -18],
    fov: 46,
  },
  lifeMap: {
    position: [0, 0, 900],
    target: [0, 0, 0],
    fov: 42,
  },
  focus: {
    position: [18, 10, 86],
    target: [10, 4, 0],
    fov: 36,
  },
  replay: {
    position: [24, 12, 120],
    target: [0, 0, -80],
    fov: 40,
  },
  mirror: {
    position: [0, 1.6, 8],
    target: [0, 1.4, 0],
    fov: 38,
  },
  unwinding: {
    position: [0, 2.2, 10],
    target: [0, 1.2, 0],
    fov: 44,
  },
  xr: {
    position: [0, 1.65, 3.2],
    target: [0, 1.45, -2.8],
    fov: 70,
  },
} as const satisfies Record<UraiSpatialWorldMode, UraiSpatialCameraSnapshot>;

export const URAI_XR_DEFAULT_STATE: UraiSpatialXRState = {
  enabled: false,
  available: false,
  sessionMode: 'none',
  inputModes: ['gaze'],
  comfortMode: true,
  handTrackingAvailable: false,
  controllerAvailable: false,
  headsetSafeOverlay: true,
};

export const URAI_SPATIAL_STARS_3D: UraiSpatialStar3D[] = [
  {
    id: 'you-are-here',
    title: 'You Are Here',
    kind: 'current',
    position: { x: 0, y: 0, z: 18 },
    relatedStarIds: ['the-quiet-return', 'a-small-clear-signal'],
    intensity: 1,
    why: 'Current-region glow anchors the Life Map around the present before older memory depth appears.',
  },
  {
    id: 'the-quiet-return',
    title: 'The Quiet Return',
    kind: 'memory',
    position: { x: -32, y: 14, z: -72 },
    relatedStarIds: ['repair-arc', 'you-are-here'],
    intensity: 0.78,
    why: 'A memory star connected to lower-pressure recovery and softened return.',
  },
  {
    id: 'repair-arc',
    title: 'Repair Arc',
    kind: 'recovery',
    position: { x: -72, y: -18, z: -144 },
    relatedStarIds: ['the-quiet-return', 'social-warmth-returning'],
    intensity: 0.7,
    why: 'Green-gold recovery path marks a safe repair sequence rather than a score.',
  },
  {
    id: 'social-warmth-returning',
    title: 'Social Warmth Returning',
    kind: 'relationship',
    position: { x: 58, y: -8, z: -188 },
    relatedStarIds: ['repair-arc', 'threshold-rebirth'],
    intensity: 0.64,
    why: 'Relationship gravity cluster suggests reconnection without exposing private conversation content.',
  },
  {
    id: 'threshold-rebirth',
    title: 'Threshold → Rebirth',
    kind: 'threshold',
    position: { x: 88, y: 38, z: -260 },
    relatedStarIds: ['social-warmth-returning', 'council-guide-north'],
    intensity: 0.82,
    why: 'Violet-gold threshold marker shows a transition point, not a diagnosis.',
  },
  {
    id: 'a-small-clear-signal',
    title: 'A Small Clear Signal',
    kind: 'ritual',
    position: { x: -12, y: 52, z: -112 },
    relatedStarIds: ['you-are-here', 'council-guide-north'],
    intensity: 0.58,
    why: 'Ritual ring preserves a gentle action signal with no raw private data.',
  },
  {
    id: 'council-guide-north',
    title: 'Council Guide Light',
    kind: 'council',
    position: { x: 22, y: 78, z: -220 },
    relatedStarIds: ['threshold-rebirth', 'a-small-clear-signal'],
    intensity: 0.52,
    why: 'Council light is a guide marker that orbits the selected life thread.',
  },
];

function starById(id: string) {
  const star = URAI_SPATIAL_STARS_3D.find((entry) => entry.id === id);
  if (!star) throw new Error(`Missing URAI Spatial 3D star: ${id}`);
  return star;
}

function pointsFor(starIds: string[]) {
  return starIds.map((id) => starById(id).position);
}

export const URAI_SPATIAL_CONSTELLATION_PATHS_3D: UraiSpatialConstellationPath3D[] = [
  {
    id: 'present-to-repair-thread',
    kind: 'recovery',
    starIds: ['you-are-here', 'the-quiet-return', 'repair-arc'],
    points: pointsFor(['you-are-here', 'the-quiet-return', 'repair-arc']),
  },
  {
    id: 'repair-to-social-thread',
    kind: 'relationship',
    starIds: ['repair-arc', 'social-warmth-returning', 'threshold-rebirth'],
    points: pointsFor(['repair-arc', 'social-warmth-returning', 'threshold-rebirth']),
  },
  {
    id: 'ritual-threshold-thread',
    kind: 'ritual',
    starIds: ['a-small-clear-signal', 'council-guide-north', 'threshold-rebirth'],
    points: pointsFor(['a-small-clear-signal', 'council-guide-north', 'threshold-rebirth']),
  },
  {
    id: 'locked-replay-thread',
    kind: 'replay',
    starIds: ['you-are-here', 'the-quiet-return', 'repair-arc', 'social-warmth-returning', 'threshold-rebirth'],
    points: pointsFor(['you-are-here', 'the-quiet-return', 'repair-arc', 'social-warmth-returning', 'threshold-rebirth']),
  },
];

export function modeFromRouteMode(routeMode: string): UraiSpatialWorldMode {
  if (routeMode === 'life-map' || routeMode === 'demo') return 'lifeMap';
  if (routeMode === 'unwind') return 'unwinding';
  if (routeMode === 'vr' || routeMode === 'ar' || routeMode === 'xr') return 'xr';
  if (routeMode === 'focus' || routeMode === 'replay' || routeMode === 'mirror' || routeMode === 'ascent' || routeMode === 'home') return routeMode;
  return 'home';
}

export function buildUraiSpatialWorldState(input: {
  mode: UraiSpatialWorldMode;
  reducedMotion?: boolean;
  webglAvailable?: boolean;
  selectedStarId?: string;
  activeConstellationId?: string;
  activeReplayId?: string;
  activeMirrorContextId?: string;
  transitionPhase?: string;
  fallbackMode?: UraiSpatialFallbackMode;
  navigationStack?: UraiSpatialNavigationFrame[];
  xr?: Partial<UraiSpatialXRState>;
}): UraiSpatialWorldState {
  const fallbackMode = input.fallbackMode ?? (input.webglAvailable === false ? 'dom' : 'webgl');
  const xr = {
    ...URAI_XR_DEFAULT_STATE,
    ...input.xr,
    enabled: input.mode === 'xr' || input.xr?.enabled === true,
    sessionMode: input.xr?.sessionMode ?? (input.mode === 'xr' ? 'vr' : 'none'),
  } satisfies UraiSpatialXRState;

  return {
    mode: input.mode,
    camera: URAI_CAMERA_PRESETS[input.mode],
    selectedStarId: input.selectedStarId,
    activeConstellationId: input.activeConstellationId,
    activeReplayId: input.activeReplayId,
    activeMirrorContextId: input.activeMirrorContextId,
    transitionPhase: input.transitionPhase,
    reducedMotion: input.reducedMotion ?? false,
    webglAvailable: input.webglAvailable ?? true,
    fallbackMode,
    navigationStack: input.navigationStack ?? [],
    xr,
  };
}

export function assertUraiSpatial3DWorldModel() {
  const starsHave3DPositions = URAI_SPATIAL_STARS_3D.every((star) =>
    Number.isFinite(star.position.x) && Number.isFinite(star.position.y) && Number.isFinite(star.position.z),
  );
  const pathsUse3DPositions = URAI_SPATIAL_CONSTELLATION_PATHS_3D.every((path) =>
    path.points.length >= 2 && path.points.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z)),
  );
  const replayPathExists = URAI_SPATIAL_CONSTELLATION_PATHS_3D.some((path) => path.kind === 'replay' && path.points.length >= 3);

  return {
    ok: true,
    service: 'urai-spatial',
    worldLayer: '3d',
    domRole: 'accessible-control-overlay',
    starsHave3DPositions,
    pathsUse3DPositions,
    replayPathExists,
    cameraPresets: Object.keys(URAI_CAMERA_PRESETS) as UraiSpatialWorldMode[],
    fallbackModes: ['webgl', 'canvas', 'dom'] as UraiSpatialFallbackMode[],
    xr: {
      supportedMode: 'xr' as UraiSpatialWorldMode,
      sessionModes: ['none', 'vr', 'ar'] as UraiSpatialXRSessionMode[],
      inputModes: ['gaze', 'controller', 'hand'] as UraiSpatialXRInputMode[],
      headsetSafeOverlay: URAI_XR_DEFAULT_STATE.headsetSafeOverlay,
      comfortMode: URAI_XR_DEFAULT_STATE.comfortMode,
    },
  };
}
