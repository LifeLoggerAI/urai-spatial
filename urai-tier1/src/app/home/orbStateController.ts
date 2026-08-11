export type OrbState =
  | 'dormant'
  | 'idle'
  | 'attention'
  | 'listening'
  | 'thinking'
  | 'speaking'
  | 'guiding'
  | 'reflecting'
  | 'calming'
  | 'privacy'
  | 'warning'
  | 'transition'

export type OrbSensoryOutput = {
  readonly animation: string
  readonly material: string
  readonly light: { readonly intensity: number; readonly temperature: 'cool' | 'neutral' | 'warm' | 'violet' }
  readonly particles: string
  readonly movement: string
  readonly audioCue: string | null
  readonly caption: string
  readonly haptic: string | null
  readonly announcement: string | null
  readonly affordance: 'none' | 'open' | 'listen' | 'continue' | 'review' | 'recover'
}

export const URAI_ORB_STATE_EVENT = 'urai:orb-state'

export type OrbStateEventDetail = {
  readonly state: OrbState
  readonly source: 'home' | 'companion' | 'conversation' | 'narrator' | 'recovery' | 'system'
}

const outputs: Record<OrbState, OrbSensoryOutput> = {
  dormant: { animation: 'orb-rest', material: 'silver-blue-dim', light: { intensity: .22, temperature: 'cool' }, particles: 'none', movement: 'settled', audioCue: null, caption: 'Orb resting', haptic: null, announcement: null, affordance: 'open' },
  idle: { animation: 'orb-breathe', material: 'silver-blue-glass', light: { intensity: .72, temperature: 'cool' }, particles: 'soft-drift', movement: 'slow-hover', audioCue: 'orb-idle-hum', caption: 'Orb ready', haptic: null, announcement: null, affordance: 'open' },
  attention: { animation: 'orb-attention', material: 'bright-rim', light: { intensity: 1.05, temperature: 'neutral' }, particles: 'inward-spark', movement: 'turn-to-user', audioCue: 'orb-attention-chime', caption: 'UrAi noticed something worth your attention', haptic: 'attention-soft', announcement: 'UrAi has something available to review.', affordance: 'review' },
  listening: { animation: 'orb-listening', material: 'open-rim', light: { intensity: 1.18, temperature: 'cool' }, particles: 'inward-pulse', movement: 'gentle-inward-pull', audioCue: 'orb-listening-open', caption: 'Listening', haptic: 'listening-open', announcement: 'UrAi is listening.', affordance: 'listen' },
  thinking: { animation: 'orb-thinking', material: 'inner-orbit', light: { intensity: .92, temperature: 'violet' }, particles: 'inner-orbit', movement: 'slow-orbit', audioCue: 'orb-thinking-shimmer', caption: 'Thinking', haptic: null, announcement: 'UrAi is thinking.', affordance: 'none' },
  speaking: { animation: 'orb-speaking', material: 'rhythmic-glow', light: { intensity: 1.12, temperature: 'neutral' }, particles: 'voice-wave', movement: 'subtle-wave', audioCue: 'orb-speaking-bed', caption: 'UrAi responding', haptic: 'speech-rhythm', announcement: 'UrAi is responding.', affordance: 'continue' },
  guiding: { animation: 'orb-guide', material: 'directional-rim', light: { intensity: 1.2, temperature: 'warm' }, particles: 'path-trail', movement: 'lead-and-wait', audioCue: 'orb-guide-tone', caption: 'Follow the Orb', haptic: 'guide-step', announcement: 'The Orb is guiding you through the world.', affordance: 'continue' },
  reflecting: { animation: 'orb-reflect', material: 'mirror-glass', light: { intensity: .86, temperature: 'violet' }, particles: 'glass-ripple', movement: 'still-reflection', audioCue: 'orb-glass-tone', caption: 'Reflecting', haptic: null, announcement: 'A reflection is ready.', affordance: 'review' },
  calming: { animation: 'orb-calm', material: 'blue-green-warmth', light: { intensity: .66, temperature: 'warm' }, particles: 'exhale-mist', movement: 'slow-exhale', audioCue: 'orb-exhale', caption: 'Calming', haptic: 'calm-breath', announcement: 'Calming mode is active.', affordance: 'continue' },
  privacy: { animation: 'orb-privacy', material: 'white-blue-lock', light: { intensity: .78, temperature: 'cool' }, particles: 'secure-ring', movement: 'steady', audioCue: 'orb-secure-chime', caption: 'Privacy control', haptic: 'privacy-confirm', announcement: 'Privacy controls are available.', affordance: 'review' },
  warning: { animation: 'orb-warning', material: 'muted-amber', light: { intensity: .82, temperature: 'warm' }, particles: 'bounded-pulse', movement: 'steady-alert', audioCue: 'orb-warning-soft', caption: 'UrAi needs your attention', haptic: 'warning-bounded', announcement: 'UrAi encountered a problem. Your private data remains protected.', affordance: 'recover' },
  transition: { animation: 'orb-transition', material: 'threshold-white-blue', light: { intensity: 1.32, temperature: 'neutral' }, particles: 'threshold-stream', movement: 'portal-lead', audioCue: 'orb-world-transition', caption: 'Moving through UrAi', haptic: 'world-transition', announcement: 'Moving to the next part of your world.', affordance: 'continue' },
}

export function resolveOrbSensoryOutput(state: OrbState, reducedMotion: boolean, muted: boolean): OrbSensoryOutput {
  const output = outputs[state]
  return {
    ...output,
    animation: reducedMotion ? 'orb-state-static' : output.animation,
    movement: reducedMotion ? 'settled' : output.movement,
    audioCue: muted ? null : output.audioCue,
  }
}

export function publishOrbState(state: OrbState, source: OrbStateEventDetail['source'] = 'system') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OrbStateEventDetail>(URAI_ORB_STATE_EVENT, { detail: { state, source } }))
}

export function assertOrbStateBindings() {
  for (const [state, output] of Object.entries(outputs)) {
    if (!output.animation || !output.material || !output.caption || !output.affordance) {
      throw new Error(`Orb state ${state} is missing a meaningful output binding`)
    }
  }
}

declare global {
  interface WindowEventMap {
    [URAI_ORB_STATE_EVENT]: CustomEvent<OrbStateEventDetail>
  }
}
