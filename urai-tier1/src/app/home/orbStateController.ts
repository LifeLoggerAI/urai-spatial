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

export const URAI_ORB_VISUAL_CANON = 'grounded-fractured-mineral-memory-reliquary-with-distributed-internal-light' as const

export type OrbStateEventDetail = {
  readonly state: OrbState
  readonly source: 'home' | 'companion' | 'conversation' | 'narrator' | 'recovery' | 'system'
}

/**
 * Sensory output tokens describe semantic state, not literal mesh construction.
 * Home Orb pixels are owned by the grounded biomorphic reliquary: opaque,
 * weathered mineral shell outside; distributed memory light inside. These
 * tokens intentionally avoid the retired glass/sphere/hover/portal vocabulary
 * so future consumers cannot mistake state metadata for old visual authority.
 */
const outputs: Record<OrbState, OrbSensoryOutput> = {
  dormant: { animation: 'orb-rest', material: 'mineral-shell-muted-memory-interior', light: { intensity: .22, temperature: 'warm' }, particles: 'localized-field-minimal', movement: 'grounded-settled', audioCue: null, caption: 'Orb resting', haptic: null, announcement: null, affordance: 'open' },
  idle: { animation: 'orb-breathe', material: 'mineral-shell-amber-teal-memory-interior', light: { intensity: .72, temperature: 'warm' }, particles: 'localized-field-soft-drift', movement: 'grounded-micro-drift', audioCue: 'orb-idle-hum', caption: 'Orb ready', haptic: null, announcement: null, affordance: 'open' },
  attention: { animation: 'orb-attention', material: 'mineral-shell-attention-memory-interior', light: { intensity: 1.05, temperature: 'warm' }, particles: 'localized-field-focus', movement: 'grounded-attention', audioCue: 'orb-attention-chime', caption: 'UrAi noticed something worth your attention', haptic: 'attention-soft', announcement: 'UrAi has something available to review.', affordance: 'review' },
  listening: { animation: 'orb-listening', material: 'mineral-shell-cool-teal-memory-interior', light: { intensity: 1.18, temperature: 'cool' }, particles: 'localized-field-listening', movement: 'internal-settle', audioCue: 'orb-listening-open', caption: 'Listening', haptic: 'listening-open', announcement: 'UrAi is listening.', affordance: 'listen' },
  thinking: { animation: 'orb-thinking', material: 'mineral-shell-violet-memory-interior', light: { intensity: .92, temperature: 'violet' }, particles: 'localized-field-thinking', movement: 'internal-circulation', audioCue: 'orb-thinking-shimmer', caption: 'Thinking', haptic: null, announcement: 'UrAi is thinking.', affordance: 'none' },
  speaking: { animation: 'orb-speaking', material: 'mineral-shell-warm-memory-interior', light: { intensity: 1.12, temperature: 'warm' }, particles: 'localized-field-speaking', movement: 'internal-rhythm', audioCue: 'orb-speaking-bed', caption: 'UrAi responding', haptic: 'speech-rhythm', announcement: 'UrAi is responding.', affordance: 'continue' },
  guiding: { animation: 'orb-guide', material: 'mineral-shell-ochre-sage-memory-interior', light: { intensity: 1.2, temperature: 'warm' }, particles: 'localized-field-guide', movement: 'grounded-guide', audioCue: 'orb-guide-tone', caption: 'Follow the Orb', haptic: 'guide-step', announcement: 'The Orb is guiding you through the world.', affordance: 'continue' },
  reflecting: { animation: 'orb-reflect', material: 'mineral-shell-lavender-slate-memory-interior', light: { intensity: .86, temperature: 'violet' }, particles: 'localized-field-reflection', movement: 'reflective-stillness', audioCue: 'orb-glass-tone', caption: 'Reflecting', haptic: null, announcement: 'A reflection is ready.', affordance: 'review' },
  calming: { animation: 'orb-calm', material: 'mineral-shell-sage-teal-memory-interior', light: { intensity: .66, temperature: 'warm' }, particles: 'localized-field-calm', movement: 'grounded-calm', audioCue: 'orb-exhale', caption: 'Calming', haptic: 'calm-breath', announcement: 'Calming mode is active.', affordance: 'continue' },
  privacy: { animation: 'orb-privacy', material: 'mineral-shell-controlled-blue-memory-interior', light: { intensity: .78, temperature: 'cool' }, particles: 'localized-field-secure', movement: 'grounded-steady', audioCue: 'orb-secure-chime', caption: 'Privacy control', haptic: 'privacy-confirm', announcement: 'Privacy controls are available.', affordance: 'review' },
  warning: { animation: 'orb-warning', material: 'mineral-shell-terracotta-amber-memory-interior', light: { intensity: .82, temperature: 'warm' }, particles: 'localized-field-bounded-warning', movement: 'grounded-bounded-alert', audioCue: 'orb-warning-soft', caption: 'UrAi needs your attention', haptic: 'warning-bounded', announcement: 'UrAi encountered a problem. Your private data remains protected.', affordance: 'recover' },
  transition: { animation: 'orb-transition', material: 'mineral-shell-violet-blue-memory-interior', light: { intensity: 1.32, temperature: 'violet' }, particles: 'localized-field-transition', movement: 'grounded-transition-hold', audioCue: 'orb-world-transition', caption: 'Moving through UrAi', haptic: 'world-transition', announcement: 'Moving to the next part of your world.', affordance: 'continue' },
}

const RETIRED_VISUAL_TOKENS = [
  'glass',
  'hover',
  'orbit',
  'secure-ring',
  'directional-rim',
  'portal-lead',
  'threshold-stream',
  'silver-blue',
] as const

export function resolveOrbSensoryOutput(state: OrbState, reducedMotion: boolean, muted: boolean): OrbSensoryOutput {
  const output = outputs[state]
  return {
    ...output,
    animation: reducedMotion ? 'orb-state-static' : output.animation,
    movement: reducedMotion ? 'grounded-settled' : output.movement,
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
    const visualSemantics = `${output.material} ${output.particles} ${output.movement}`
    const retiredToken = RETIRED_VISUAL_TOKENS.find((token) => visualSemantics.includes(token))
    if (retiredToken) {
      throw new Error(`Orb state ${state} resurrects retired visual token: ${retiredToken}`)
    }
  }
}

declare global {
  interface WindowEventMap {
    [URAI_ORB_STATE_EVENT]: CustomEvent<OrbStateEventDetail>
  }
}
