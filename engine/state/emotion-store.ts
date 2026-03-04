import { create } from 'zustand'

export type EmotionalState =
  | 'stability'
  | 'anxiety'
  | 'growth'
  | 'grief'
  | 'recovery'
  | 'breakthrough'
  | 'trauma'
  | 'clarity'

interface EmotionStore {
  state: EmotionalState
  intensity: number // 0.0 – 1.0
  thresholdActive: boolean

  setState: (state: EmotionalState, intensity?: number) => void
  setIntensity: (value: number) => void
  setThreshold: (active: boolean) => void
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  state: 'stability',
  intensity: 0.5,
  thresholdActive: false,

  setState: (state, intensity = 0.5) =>
    set(() => ({
      state,
      intensity: Math.max(0, Math.min(1, intensity)),
    })),

  setIntensity: (value) =>
    set(() => ({
      intensity: Math.max(0, Math.min(1, value)),
    })),

  setThreshold: (active) =>
    set(() => ({
      thresholdActive: active,
    })),
}))
