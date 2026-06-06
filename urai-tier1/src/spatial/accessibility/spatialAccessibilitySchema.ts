export type SpatialAccessibilityMode = {
  reducedMotion: boolean
  highContrast: boolean
  captionsEnabled: boolean
  keyboardNavigation: boolean
  textOnlyFallback: boolean
  hapticsEnabled: boolean
  soundEnabled: boolean
}

export const DEFAULT_SPATIAL_ACCESSIBILITY_MODE: SpatialAccessibilityMode = {
  reducedMotion: false,
  highContrast: false,
  captionsEnabled: true,
  keyboardNavigation: true,
  textOnlyFallback: false,
  hapticsEnabled: true,
  soundEnabled: true,
}

export function accessibilityRenderHints(mode: SpatialAccessibilityMode) {
  return {
    disableCameraShake: mode.reducedMotion,
    disableAutoplayReplay: mode.reducedMotion,
    showCaptions: mode.captionsEnabled,
    showKeyboardHints: mode.keyboardNavigation,
    preferTextPanels: mode.textOnlyFallback,
    allowHaptics: mode.hapticsEnabled && !mode.reducedMotion,
    allowSound: mode.soundEnabled,
  }
}
