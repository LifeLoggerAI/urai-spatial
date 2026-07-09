export const URAI_AVATAR_CONTRACT_VERSION = 'urai-avatar-presence-v1' as const

export const avatarPresenceContract = {
  purpose: 'Embodied presence between memory sky and lived ground.',
  idle: {
    breathing: true,
    weightShift: 'subtle',
    gaze: 'gentle-environmental-awareness',
    posture: 'relaxed-default',
  },
  emotionalMotion: {
    confidence: 'slightly-open-shoulders',
    stress: 'subtle-tension',
    reflection: 'slower-motion',
    relief: 'relaxed-body-language',
  },
  forbidden: [
    'theatrical-overacting',
    'game-character-loop',
    'attention-seeking-animation',
  ],
} as const
