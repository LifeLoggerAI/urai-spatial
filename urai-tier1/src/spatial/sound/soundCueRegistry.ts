export type SpatialSoundCueId =
  | 'enter-place'
  | 'select-object'
  | 'start-replay'
  | 'complete-replay'
  | 'portal-open'
  | 'gate-shown'
  | 'return-home'
  | 'recovery-bloom'

export type SpatialSoundCue = {
  id: SpatialSoundCueId
  label: string
  fileHint: string
  volume: number
  loop: boolean
  privacySafe: boolean
}

export const SOUND_CUE_REGISTRY: Record<SpatialSoundCueId, SpatialSoundCue> = {
  'enter-place': { id: 'enter-place', label: 'Enter Place', fileHint: 'enter-place-soft', volume: 0.55, loop: false, privacySafe: true },
  'select-object': { id: 'select-object', label: 'Select Object', fileHint: 'object-select-glow', volume: 0.35, loop: false, privacySafe: true },
  'start-replay': { id: 'start-replay', label: 'Start Replay', fileHint: 'replay-start', volume: 0.5, loop: false, privacySafe: true },
  'complete-replay': { id: 'complete-replay', label: 'Complete Replay', fileHint: 'replay-complete', volume: 0.45, loop: false, privacySafe: true },
  'portal-open': { id: 'portal-open', label: 'Portal Open', fileHint: 'portal-open', volume: 0.5, loop: false, privacySafe: true },
  'gate-shown': { id: 'gate-shown', label: 'Gate Shown', fileHint: 'gate-soft', volume: 0.35, loop: false, privacySafe: true },
  'return-home': { id: 'return-home', label: 'Return Home', fileHint: 'return-home', volume: 0.42, loop: false, privacySafe: true },
  'recovery-bloom': { id: 'recovery-bloom', label: 'Recovery Bloom', fileHint: 'recovery-bloom', volume: 0.48, loop: false, privacySafe: true },
}

export function getSoundCue(id: SpatialSoundCueId) {
  return SOUND_CUE_REGISTRY[id]
}
