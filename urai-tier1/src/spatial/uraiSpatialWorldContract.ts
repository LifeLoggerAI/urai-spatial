export const URAI_SPATIAL_WORLD_CONTRACT_VERSION = 'urai-spatial-world-contract-v1' as const

export const uraiSpatialPillars = {
  sky: {
    meaning: 'Memory and possibility',
    rule: 'Memories render as relational stars in atmospheric depth, not as dashboard cards.',
  },
  ground: {
    meaning: 'Reality and lived life',
    rule: 'Present life renders as reachable terrain, paths, objects, rooms, routines, and relationships.',
  },
  orb: {
    meaning: 'Conscious identity',
    rule: 'The Orb is an ambient awareness anchor that breathes through light and subtly affects nearby space.',
  },
  avatar: {
    meaning: 'Embodied presence',
    rule: 'The avatar communicates inhabitation through subtle posture, breathing, gaze, and weight shifts.',
  },
  camera: {
    meaning: 'Awareness',
    rule: 'The camera guides attention through calm, predictable, reduced-motion-safe spatial movement.',
  },
} as const

export const uraiSpatialRouteContract = {
  home: {
    routes: ['/', '/home'],
    spatialMeaning: 'Threshold between ground, sky, Orb, avatar, and route portals',
    requiredFeeling: 'I know where I am.',
    continuity: ['sky', 'ground', 'orb', 'avatar', 'camera'],
  },
  lifeMap: {
    routes: ['/life-map'],
    spatialMeaning: 'Looking upward into the living memory field',
    requiredFeeling: 'I want to see more.',
    continuity: ['sky', 'camera'],
  },
  ground: {
    routes: ['/ground'],
    spatialMeaning: 'Walking through present life made physical',
    requiredFeeling: 'Where am I today?',
    continuity: ['ground', 'avatar', 'camera'],
  },
  focus: {
    routes: ['/focus'],
    spatialMeaning: 'Complete attention inside one selected star',
    requiredFeeling: 'I understand this part of my life.',
    continuity: ['sky', 'camera'],
  },
  replay: {
    routes: ['/replay'],
    spatialMeaning: 'Entering a remembered moment through the selected star',
    requiredFeeling: 'I see how it connects.',
    continuity: ['sky', 'camera'],
  },
  mirror: {
    routes: ['/mirror'],
    spatialMeaning: 'Private pattern reflection',
    requiredFeeling: 'I can interpret without being scored.',
    continuity: ['orb', 'camera'],
  },
  passport: {
    routes: ['/passport'],
    spatialMeaning: 'Ownership, consent, and identity control',
    requiredFeeling: 'This is mine.',
    continuity: ['orb'],
  },
  status: {
    routes: ['/status'],
    spatialMeaning: 'System state as an operational world layer',
    requiredFeeling: 'The system is legible.',
    continuity: ['ground', 'orb'],
  },
} as const

export const uraiSpatialMotionContract = {
  idleBreath: 'almost-imperceptible',
  transitionStyle: 'gentle-dolly-or-trackable-passage',
  forbidden: ['snap-camera', 'shock-zoom', 'rapid-spin', 'action-game-bob', 'forced-long-motion'],
  reducedMotion: 'skip-or-simplify-camera-travel',
} as const

export const uraiSpatialMemorySelectionContract = [
  'selected-star-soft-brighten',
  'neighbor-stars-dim-with-context-preserved',
  'camera-eases-toward-star',
  'depth-increases',
  'background-stars-drift-outward',
  'audio-narrows-and-quiets',
  'focus-or-replay-opens-through-spatial-passage',
] as const

export const uraiSpatialNonNegotiables = [
  'no-dashboard-card-primary-world-model',
  'no-random-decorative-stars',
  'no-action-game-camera',
  'no-gamified-emotional-scoring',
  'no-isolated-route-pages',
  'no-asset-showcase-without-pillar-meaning',
] as const

export type UraiSpatialPillar = keyof typeof uraiSpatialPillars
export type UraiSpatialRouteKey = keyof typeof uraiSpatialRouteContract
