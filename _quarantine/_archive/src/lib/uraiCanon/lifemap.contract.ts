export type StarTier = 'background' | 'memory' | 'anchor'

export const URAI_HOME_GROUND_CONTRACT = {
  bottomCoverageMin: 0.20,
  bottomCoverageMax: 0.35,
  shadowContrastMax: 0.18,
  hardEdgeAllowed: false,
  interactive: false,
} as const

export const URAI_LIFEMAP_CONTRACT = {
  allowHomeResidue: false,
  allowGround: false,
  allowOrb: false,
  allowHorizon: false,
  allowBodySilhouette: false,
  hoverScale: 1.08,
  hoverBrightness: 1.18,
  hoverHaloOpacity: 0.22,
  tierBrightness: {
    background: 0.22,
    memory: 0.62,
    anchor: 1.00,
  },
  tierScale: {
    background: 0.50,
    memory: 1.00,
    anchor: 1.65,
  },
  tierPulse: {
    background: 0.00,
    memory: 0.02,
    anchor: 0.05,
  },
} as const

export const URAI_TRANSITION_SPINE = {
  homeToLifemap: {
    acknowledgeMs: 180,
    liftStartMs: 220,
    starsRevealStartMs: 900,
    starsDominantMs: 1550,
    fullSettleMs: 2200,
  },
  lifemapToHome: {
    recedeStartMs: 0,
    atmosphereReturnMs: 900,
    groundReturnMs: 1450,
    interactionUnlockMs: 2200,
  },
  lifemapToFocus: {
    acknowledgeMs: 120,
    isolationMs: 500,
    approachMs: 1400,
    lockMs: 1700,
  },
} as const
