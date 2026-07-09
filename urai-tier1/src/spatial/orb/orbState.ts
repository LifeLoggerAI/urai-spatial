export const URAI_ORB_CONTRACT_VERSION = 'urai-orb-awareness-v1' as const

export type OrbState = {
  brightness: number
  insightPulse: number
  consentVisible: boolean
  contextAvailable: boolean
}

export function createOrbState(): OrbState {
  return {
    brightness: 0.72,
    insightPulse: 0,
    consentVisible: true,
    contextAvailable: false,
  }
}

export function resolveOrbLighting(state: OrbState) {
  return {
    contract: URAI_ORB_CONTRACT_VERSION,
    glow: state.brightness + state.insightPulse * 0.15,
    respondsToInsight: state.insightPulse > 0,
    privacyFirst: state.consentVisible,
  }
}
