export type EmotionPhase =
  | 'HOME'
  | 'ASCENT'
  | 'LIFEMAP'
  | 'FOCUS'
  | 'REPLAY'

export function getEmotionFog(phase: EmotionPhase): number {
  switch (phase) {
    case 'HOME': return 0.12
    case 'ASCENT': return 0.18
    case 'LIFEMAP': return 0.08
    case 'FOCUS': return 0.05
    case 'REPLAY': return 0.22
    default: return 0.1
  }
}

export function getEmotionBrightness(phase: EmotionPhase): number {
  switch (phase) {
    case 'HOME': return 0.9
    case 'ASCENT': return 1.05
    case 'LIFEMAP': return 1.1
    case 'FOCUS': return 1.0
    case 'REPLAY': return 0.75
    default: return 1
  }
}

export function getStarPresenceWeight(
  significance?: string
): number {
  switch (significance) {
    case 'dominant': return 1.4
    case 'secondary': return 1.1
    case 'outlier': return 1.25
    case 'peripheral': return 0.7
    default: return 1
  }
}

export function getStarBreath(t: number, intensity = 1): number {
  return 1 + Math.sin(t * 0.8) * 0.02 * intensity
}

export function getStarShimmer(t: number, seed: number): number {
  return 1 + Math.sin(t * 1.7 + seed) * 0.015
}

export function getReplayWeight(): number {
  return 0.85
}

export function getReplayContrast(): number {
  return 1.2
}
