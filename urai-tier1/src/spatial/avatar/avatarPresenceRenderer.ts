import { avatarPresenceContract, URAI_AVATAR_CONTRACT_VERSION } from './avatarPresenceContract'

export type AvatarEmotion = 'neutral' | 'confidence' | 'stress' | 'reflection' | 'relief'

export type AvatarPresenceState = {
  emotion: AvatarEmotion
  breathing: number
  weightShift: number
  gazeFocus: 'environment' | 'memory' | 'orb'
}

export function createAvatarPresenceState(): AvatarPresenceState {
  return {
    emotion: 'neutral',
    breathing: 0.5,
    weightShift: 0,
    gazeFocus: 'environment',
  }
}

export function resolveAvatarMotion(state: AvatarPresenceState) {
  return {
    contract: URAI_AVATAR_CONTRACT_VERSION,
    rules: avatarPresenceContract,
    breathingSpeed: 0.8 + state.breathing * 0.2,
    shoulderOpen: state.emotion === 'confidence' ? 0.12 : 0,
    tension: state.emotion === 'stress' ? 0.08 : 0,
    reflectionSlowdown: state.emotion === 'reflection' ? 0.25 : 0,
    relaxedReturn: state.emotion === 'relief' ? 0.18 : 0,
  }
}
