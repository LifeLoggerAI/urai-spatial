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
  intensity: number      // normalized 0 → 1
  thresholdActive: boolean

  setState: (state: EmotionalState, intensity?: number) => void
  setIntensity: (value: number) => void
  setThreshold: (active: boolean) => void
  resetEmotion: () => void
}

// Utility to clamp intensity between 0 and 1
function clamp(value: number) {
  return Math.max(0, Math.min(1, value))
}

export const useEmotionStore = create<EmotionStore>((set) => ({
  state: 'stability',
  intensity: 0.5,
  thresholdActive: false,

  setState: (state, intensity = 0.5) =>
    set({
      state,
      intensity: clamp(intensity),
    }),

  setIntensity: (value) =>
    set((store) => ({
      intensity: clamp(value),
    })),

  setThreshold: (active) =>
    set({
      thresholdActive: active,
    }),

  resetEmotion: () =>
    set({
      state: 'stability',
      intensity: 0.5,
      thresholdActive: false,
    }),
}))