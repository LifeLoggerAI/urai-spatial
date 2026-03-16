import { create } from "zustand"

interface QualityState {
  emotionalEnvironment: boolean

  setEmotionalEnvironment: (value: boolean) => void
  toggleEmotionalEnvironment: () => void
}

export const useQualityStore = create<QualityState>((set) => ({
  // default enabled
  emotionalEnvironment: true,

  setEmotionalEnvironment: (value: boolean) =>
    set({ emotionalEnvironment: value }),

  toggleEmotionalEnvironment: () =>
    set((state) => ({
      emotionalEnvironment: !state.emotionalEnvironment,
    })),
}))