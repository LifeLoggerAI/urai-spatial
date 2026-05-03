export const runtimeFlags = {
  publicDemoMode: true,
  recordingMode: false,
  showDemoExportControls: false,
} as const

export const publicPhaseLabels = {
  HOME: 'Home / Life Orb',
  ASCENT: 'Opening Life Map',
  LIFEMAP: 'Life Map',
  FOCUS: 'Memory Focus',
  REPLAY: 'Memory Replay',
  RETURNING_HOME: 'Returning Home',
} as const

export function getPublicPhaseLabel(phase: 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY', isUnwindToHome = false) {
  if (isUnwindToHome) return publicPhaseLabels.RETURNING_HOME
  return publicPhaseLabels[phase]
}
