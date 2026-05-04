export type RecordingMode = 'off' | 'passive' | 'active'

export type RuntimeFlags = {
  publicDemoMode: boolean
  recordingMode: RecordingMode
  showDemoExportControls: boolean
}

const DEFAULT_RUNTIME_FLAGS: RuntimeFlags = {
  publicDemoMode: true,
  recordingMode: 'off',
  showDemoExportControls: false,
}

/**
 * Static default flags for imports that do not need browser overrides.
 * Use getRuntimeFlags() inside client components when localStorage overrides should apply.
 */
export const runtimeFlags: RuntimeFlags = DEFAULT_RUNTIME_FLAGS

export const publicPhaseLabels = {
  HOME: 'Home / Life Orb',
  ASCENT: 'Opening Life Map',
  LIFEMAP: 'Life Map',
  FOCUS: 'Memory Focus',
  REPLAY: 'Memory Replay',
  RETURNING_HOME: 'Returning Home',
} as const

export type PublicPhase = keyof Omit<typeof publicPhaseLabels, 'RETURNING_HOME'>

export function getRuntimeFlags(): RuntimeFlags {
  if (typeof window === 'undefined') {
    return DEFAULT_RUNTIME_FLAGS
  }

  const publicDemoOverride = window.localStorage.getItem('spatial.publicDemoMode')
  const recordingModeOverride = window.localStorage.getItem('spatial.recordingMode')
  const showDemoExportControlsOverride = window.localStorage.getItem(
    'spatial.showDemoExportControls'
  )

  const publicDemoMode =
    publicDemoOverride === null
      ? DEFAULT_RUNTIME_FLAGS.publicDemoMode
      : publicDemoOverride === 'true'

  const recordingMode: RecordingMode =
    recordingModeOverride === 'passive' || recordingModeOverride === 'active'
      ? recordingModeOverride
      : DEFAULT_RUNTIME_FLAGS.recordingMode

  const showDemoExportControls =
    showDemoExportControlsOverride === null
      ? DEFAULT_RUNTIME_FLAGS.showDemoExportControls
      : showDemoExportControlsOverride === 'true'

  return {
    publicDemoMode,
    recordingMode,
    showDemoExportControls,
  }
}

export function getPublicPhaseLabel(
  phase: PublicPhase,
  isUnwindToHome = false
): string {
  if (isUnwindToHome) return publicPhaseLabels.RETURNING_HOME
  return publicPhaseLabels[phase]
}