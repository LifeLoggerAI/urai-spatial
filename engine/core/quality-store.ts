'use client'

import { create } from 'zustand'

export type RenderQuality = 'low' | 'medium' | 'high'

interface QualityState {
  quality: RenderQuality
  setQuality: (q: RenderQuality) => void

  emotionalEnvironment: boolean
  setEmotionalEnvironment: (v: boolean) => void
}

export const useQualityStore = create<QualityState>((set) => ({
  quality: 'high',

  setQuality: (q) => set({ quality: q }),

  emotionalEnvironment: true,
  setEmotionalEnvironment: (v) => set({ emotionalEnvironment: v })
}))