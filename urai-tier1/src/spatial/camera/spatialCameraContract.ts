export const URAI_CAMERA_CONTRACT_VERSION = 'urai-spatial-camera-v1' as const

export const spatialCameraContract = {
  role: 'Awareness and attention guidance.',
  states: {
    arrival: 'orient-without-overwhelm',
    exploration: 'slow-discovery',
    memoryApproach: 'ease-toward-selected-star',
    focus: 'narrow-attention-with-context',
    replay: 'pass-through-memory-space',
    returnHome: 'restore-life-scale-perspective',
  },
  motion: {
    acceleration: 'smooth',
    deceleration: 'smooth',
    idle: 'breathing',
    transition: 'gentle-dolly-or-trackable-passage',
  },
  accessibility: {
    reducedMotion: 'skip-or-simplify-camera-travel',
    avoid: ['snap', 'shock-zoom', 'rapid-spin', 'forced-long-motion'],
  },
} as const
