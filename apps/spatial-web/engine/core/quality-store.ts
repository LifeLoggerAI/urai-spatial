'use client'

import { create } from 'zustand'

interface QualityState {
  quality: 'low' | 'medium' | 'high'
  setQuality: (q: 'low' | 'medium' | 'high') => void
}

export const useQualityStore = create<QualityState>((set) => ({
  quality: 'high',
  setQuality: (q) => set({ quality: q })
}))
