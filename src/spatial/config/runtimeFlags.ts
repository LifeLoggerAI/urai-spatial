export type RecordingMode = 'off' | 'passive' | 'active'

export type RuntimeFlags = {
  publicDemoMode: boolean
  recordingMode: RecordingMode
  showDemoExportControls: boolean
  enableHomeAvatar: boolean
  forceLowPolyAvatar: boolean
}

const DEFAULT_RUNTIME_FLAGS: RuntimeFlags = {
  publicDemoMode: true,
  recordingMode: 'off',
  showDemoExportControls: false,
  enableHomeAvatar: true,
  forceLowPolyAvatar: false,
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
  const enableHomeAvatarOverride = window.localStorage.getItem('spatial.enableHomeAvatar')
  const forceLowPolyAvatarOverride = window.localStorage.getItem('spatial.forceLowPolyAvatar')

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

  const enableHomeAvatar =
    enableHomeAvatarOverride === null
      ? DEFAULT_RUNTIME_FLAGS.enableHomeAvatar
      : enableHomeAvatarOverride === 'true'

  const forceLowPolyAvatar =
    forceLowPolyAvatarOverride === null
      ? DEFAULT_RUNTIME_FLAGS.forceLowPolyAvatar
      : forceLowPolyAvatarOverride === 'true'

  return {
    publicDemoMode,
    recordingMode,
    showDemoExportControls,
    enableHomeAvatar,
    forceLowPolyAvatar,
  }
}

export function getPublicPhaseLabel(
  phase: PublicPhase,
  isUnwindToHome = false
): string {
  if (isUnwindToHome) return publicPhaseLabels.RETURNING_HOME
  return publicPhaseLabels[phase]
}