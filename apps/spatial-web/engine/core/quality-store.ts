import { create } from 'zustand'

type QualityLevel = 'high' | 'medium' | 'low'

interface QualityState {
  qualityLevel: QualityLevel
  setQuality: (level: QualityLevel) => void
  isSafeMode: boolean
  setSafeMode: (isSafe: boolean) => void
}

export const useQualityStore = create<QualityState>((set) => ({
  qualityLevel: 'high',
  setQuality: (level) => set({ qualityLevel: level }),
  isSafeMode: false,
  setSafeMode: (isSafe) => set({ isSafeMode: isSafe }),
}))
