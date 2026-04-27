export type NarrativePhase =
  | 'HOME'
  | 'ASCENT'
  | 'LIFEMAP'
  | 'FOCUS'
  | 'REPLAY'

export type SymbolicClass =
  | 'origin'
  | 'guide'
  | 'threshold'
  | 'memory'
  | 'echo'
  | 'outlier'
  | 'constellation'
  | 'unknown'

export type NarratorTone =
  | 'quiet'
  | 'clear'
  | 'reverent'
  | 'uncanny'
  | 'intimate'
  | 'distant'

export type EmotionalValence =
  | 'negative'
  | 'mixed'
  | 'neutral'
  | 'positive'
  | 'transcendent'

export interface NarrativeDescriptor {
  title: string
  subtitle?: string
  symbolicClass: SymbolicClass
  narratorTone: NarratorTone
  emotionalValence: EmotionalValence
  memoryWeight: number
  visibilityWeight: number
  promptSeed?: string
}

export function getPhaseNarrativeTone(phase: NarrativePhase): NarratorTone {
  switch (phase) {
    case 'HOME':
      return 'quiet'
    case 'ASCENT':
      return 'reverent'
    case 'LIFEMAP':
      return 'distant'
    case 'FOCUS':
      return 'intimate'
    case 'REPLAY':
      return 'clear'
    default:
      return 'quiet'
  }
}

export function getPhasePromptSeed(phase: NarrativePhase): string {
  switch (phase) {
    case 'HOME':
      return 'grounded origin, anticipation, stillness'
    case 'ASCENT':
      return 'threshold crossing, lift, release, expansion'
    case 'LIFEMAP':
      return 'scale, distance, constellation, latent meaning'
    case 'FOCUS':
      return 'clarity, selection, intimacy, significance'
    case 'REPLAY':
      return 'memory, immersion, weight, felt return'
    default:
      return 'presence'
  }
}

export function getSignificanceNarratorTone(significance?: string): NarratorTone {
  switch (significance) {
    case 'dominant':
      return 'clear'
    case 'secondary':
      return 'reverent'
    case 'outlier':
      return 'uncanny'
    case 'peripheral':
      return 'distant'
    default:
      return 'quiet'
  }
}

export function getDefaultSymbolicClass(significance?: string): SymbolicClass {
  switch (significance) {
    case 'dominant':
      return 'origin'
    case 'secondary':
      return 'guide'
    case 'outlier':
      return 'outlier'
    case 'peripheral':
      return 'echo'
    default:
      return 'unknown'
  }
}

export function getDefaultMemoryWeight(significance?: string): number {
  switch (significance) {
    case 'dominant':
      return 1.0
    case 'secondary':
      return 0.72
    case 'outlier':
      return 0.88
    case 'peripheral':
      return 0.42
    default:
      return 0.5
  }
}

export function getDefaultVisibilityWeight(significance?: string): number {
  switch (significance) {
    case 'dominant':
      return 1.0
    case 'secondary':
      return 0.76
    case 'outlier':
      return 0.84
    case 'peripheral':
      return 0.48
    default:
      return 0.5
  }
}

export function resolveNarrativeDescriptor(input: {
  name?: string
  title?: string
  subtitle?: string
  significanceTier?: string
  symbolicClass?: SymbolicClass
  narratorTone?: NarratorTone
  emotionalValence?: EmotionalValence
  memoryWeight?: number
  visibilityWeight?: number
  promptSeed?: string
}): NarrativeDescriptor {
  const significance = input.significanceTier

  return {
    title: input.title ?? input.name ?? 'Unnamed Star',
    subtitle: input.subtitle,
    symbolicClass: input.symbolicClass ?? getDefaultSymbolicClass(significance),
    narratorTone: input.narratorTone ?? getSignificanceNarratorTone(significance),
    emotionalValence: input.emotionalValence ?? 'neutral',
    memoryWeight: input.memoryWeight ?? getDefaultMemoryWeight(significance),
    visibilityWeight: input.visibilityWeight ?? getDefaultVisibilityWeight(significance),
    promptSeed: input.promptSeed,
  }
}
