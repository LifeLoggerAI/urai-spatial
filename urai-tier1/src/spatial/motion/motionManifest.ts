export type UraiMotionCueId =
  | 'sky_pressure_roll'
  | 'timeline_warp'
  | 'orb_refusal_dim'
  | 'orb_threshold_fracture'
  | 'body_thin_fade'
  | 'withdrawal_thin_pass'
  | 'silence_hold_frame'
  | 'app_boot_intro'
  | 'map_enter_zoom'
  | 'replay_enter_curtain'
  | 'ritual_seal_mark'
  | 'bloom_archive_fold'
  | 'trust_reveal_still'

export type UraiMotionAuthoringIntent = 'rive-stateful' | 'lottie-one-shot'
export type UraiMotionRuntimeAuthority = 'runtime-css' | 'runtime-camera' | 'runtime-glb'
export type UraiMotionAudioPolicy = 'inherit-transition' | 'silence' | 'none'
export type UraiMotionNarrationPolicy = 'motion-leads' | 'suppressed' | 'none'

export type UraiMotionCueDefinition = {
  readonly id: UraiMotionCueId
  readonly authoringIntent: UraiMotionAuthoringIntent
  readonly runtimeAuthority: UraiMotionRuntimeAuthority
  readonly durationMs: number
  readonly reducedMotionDurationMs: number
  readonly narrationLeadMs: number
  readonly audioPolicy: UraiMotionAudioPolicy
  readonly narrationPolicy: UraiMotionNarrationPolicy
  readonly loop: boolean
  readonly purpose: string
}

export const URAI_MOTION_CUE_EVENT = 'urai:motion-cue'
export const URAI_MOTION_NARRATION_READY_EVENT = 'urai:motion-narration-ready'
export const URAI_MOTION_COMPLETE_EVENT = 'urai:motion-complete'

export type UraiMotionCueEventDetail = {
  readonly cue: UraiMotionCueId
  readonly source?: string
}

export type UraiMotionLifecycleDetail = UraiMotionCueEventDetail & {
  readonly durationMs: number
}

export const URAI_MOTION_MANIFEST: Readonly<Record<UraiMotionCueId, UraiMotionCueDefinition>> = {
  sky_pressure_roll: {
    id: 'sky_pressure_roll', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-css',
    durationMs: 1600, reducedMotionDurationMs: 180, narrationLeadMs: 0,
    audioPolicy: 'none', narrationPolicy: 'none', loop: false,
    purpose: 'Roll a restrained pressure field through emotional weather without blocking input.',
  },
  timeline_warp: {
    id: 'timeline_warp', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-camera',
    durationMs: 1100, reducedMotionDurationMs: 260, narrationLeadMs: 420,
    audioPolicy: 'inherit-transition', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Preserve continuity while travelling across time or between persistent-world destinations.',
  },
  orb_refusal_dim: {
    id: 'orb_refusal_dim', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-glb',
    durationMs: 720, reducedMotionDurationMs: 120, narrationLeadMs: 0,
    audioPolicy: 'silence', narrationPolicy: 'suppressed', loop: false,
    purpose: 'Let the Orb deliberately withdraw without adding speech, sound, alarm, or punitive motion.',
  },
  orb_threshold_fracture: {
    id: 'orb_threshold_fracture', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-css',
    durationMs: 980, reducedMotionDurationMs: 160, narrationLeadMs: 620,
    audioPolicy: 'silence', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Mark a threshold with a bounded, non-flashing fracture field before any narration begins.',
  },
  body_thin_fade: {
    id: 'body_thin_fade', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-css',
    durationMs: 760, reducedMotionDurationMs: 120, narrationLeadMs: 0,
    audioPolicy: 'none', narrationPolicy: 'none', loop: false,
    purpose: 'Reduce embodied presence during a spatial handoff without implying disappearance or failure.',
  },
  withdrawal_thin_pass: {
    id: 'withdrawal_thin_pass', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-css',
    durationMs: 920, reducedMotionDurationMs: 140, narrationLeadMs: 0,
    audioPolicy: 'silence', narrationPolicy: 'suppressed', loop: false,
    purpose: 'Represent intentional withdrawal with restrained opacity and field compression.',
  },
  silence_hold_frame: {
    id: 'silence_hold_frame', authoringIntent: 'rive-stateful', runtimeAuthority: 'runtime-css',
    durationMs: 900, reducedMotionDurationMs: 160, narrationLeadMs: 0,
    audioPolicy: 'silence', narrationPolicy: 'suppressed', loop: false,
    purpose: 'Make silence a deliberate visual state; it never manufactures a sound cue.',
  },
  app_boot_intro: {
    id: 'app_boot_intro', authoringIntent: 'lottie-one-shot', runtimeAuthority: 'runtime-css',
    durationMs: 880, reducedMotionDurationMs: 120, narrationLeadMs: 520,
    audioPolicy: 'none', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Give Genesis a single non-blocking arrival beat before the Home world settles.',
  },
  map_enter_zoom: {
    id: 'map_enter_zoom', authoringIntent: 'lottie-one-shot', runtimeAuthority: 'runtime-camera',
    durationMs: 3400, reducedMotionDurationMs: 420, narrationLeadMs: 900,
    audioPolicy: 'inherit-transition', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Bind the existing physical Home sky ascent to the Life Map handoff.',
  },
  replay_enter_curtain: {
    id: 'replay_enter_curtain', authoringIntent: 'lottie-one-shot', runtimeAuthority: 'runtime-css',
    durationMs: 1900, reducedMotionDurationMs: 260, narrationLeadMs: 760,
    audioPolicy: 'inherit-transition', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Curtain the persistent-world depth tunnel into Replay while retaining continuity.',
  },
  ritual_seal_mark: {
    id: 'ritual_seal_mark', authoringIntent: 'lottie-one-shot', runtimeAuthority: 'runtime-css',
    durationMs: 640, reducedMotionDurationMs: 120, narrationLeadMs: 360,
    audioPolicy: 'none', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Punctuate ritual completion with one bounded seal mark.',
  },
  bloom_archive_fold: {
    id: 'bloom_archive_fold', authoringIntent: 'lottie-one-shot', runtimeAuthority: 'runtime-css',
    durationMs: 760, reducedMotionDurationMs: 140, narrationLeadMs: 420,
    audioPolicy: 'none', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Fold a completed Memory Bloom back into the life record without blocking navigation.',
  },
  trust_reveal_still: {
    id: 'trust_reveal_still', authoringIntent: 'lottie-one-shot', runtimeAuthority: 'runtime-css',
    durationMs: 680, reducedMotionDurationMs: 120, narrationLeadMs: 420,
    audioPolicy: 'silence', narrationPolicy: 'motion-leads', loop: false,
    purpose: 'Hold a trust reveal long enough to read it without dramatizing or overstating certainty.',
  },
}

export const URAI_FINAL_MOTION_CUE_IDS = Object.freeze(Object.keys(URAI_MOTION_MANIFEST) as UraiMotionCueId[])

export function motionDuration(cue: UraiMotionCueId, reducedMotion: boolean) {
  const definition = URAI_MOTION_MANIFEST[cue]
  return reducedMotion ? definition.reducedMotionDurationMs : definition.durationMs
}

export function requestUraiMotionCue(cue: UraiMotionCueId, source = 'system') {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<UraiMotionCueEventDetail>(URAI_MOTION_CUE_EVENT, {
    detail: { cue, source },
  }))
}

export function assertFinalMotionManifest() {
  if (URAI_FINAL_MOTION_CUE_IDS.length !== 13) throw new Error('Final URAI motion manifest must contain exactly 13 cues')
  for (const cue of URAI_FINAL_MOTION_CUE_IDS) {
    const definition = URAI_MOTION_MANIFEST[cue]
    if (definition.durationMs <= 0 || definition.reducedMotionDurationMs <= 0) {
      throw new Error(`Motion cue ${cue} is missing a valid duration`)
    }
    if (definition.reducedMotionDurationMs > definition.durationMs) {
      throw new Error(`Motion cue ${cue} reduced-motion duration exceeds its default duration`)
    }
  }
}

declare global {
  interface WindowEventMap {
    [URAI_MOTION_CUE_EVENT]: CustomEvent<UraiMotionCueEventDetail>
    [URAI_MOTION_NARRATION_READY_EVENT]: CustomEvent<UraiMotionLifecycleDetail>
    [URAI_MOTION_COMPLETE_EVENT]: CustomEvent<UraiMotionLifecycleDetail>
  }
}
