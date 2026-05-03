export type RecordingMode = 'off' | 'passive' | 'active'

export type RuntimeFlags = {
  publicDemoMode: boolean
  recordingMode: RecordingMode
}

const DEFAULT_RUNTIME_FLAGS: RuntimeFlags = {
  publicDemoMode: true,
  recordingMode: 'off',
}

export function getRuntimeFlags(): RuntimeFlags {
  if (typeof window === 'undefined') {
    return DEFAULT_RUNTIME_FLAGS
  }

  const publicDemoOverride = window.localStorage.getItem('spatial.publicDemoMode')
  const recordingModeOverride = window.localStorage.getItem('spatial.recordingMode')

  const publicDemoMode =
    publicDemoOverride === null ? DEFAULT_RUNTIME_FLAGS.publicDemoMode : publicDemoOverride === 'true'

  const recordingMode: RecordingMode =
    recordingModeOverride === 'passive' || recordingModeOverride === 'active'
      ? recordingModeOverride
      : DEFAULT_RUNTIME_FLAGS.recordingMode

  return {
    publicDemoMode,
    recordingMode,
  }
}
