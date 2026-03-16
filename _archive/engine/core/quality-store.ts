'use client'

import { create } from 'zustand'

export type RenderQuality = 'low' | 'medium' | 'high'

interface QualityState {
  quality: RenderQuality
  emotionalEnvironment: boolean

  setQuality: (quality: RenderQuality) => void
  setEmotionalEnvironment: (enabled: boolean) => void
}

export const useQualityStore = create<QualityState>((set) => ({

  quality: 'high',
  emotionalEnvironment: true,

  setQuality: (quality) =>
    set((state) =>
      state.quality === quality ? state : { quality }
    ),

  setEmotionalEnvironment: (enabled) =>
    set((state) =>
      state.emotionalEnvironment === enabled
        ? state
        : { emotionalEnvironment: enabled }
    )

}))