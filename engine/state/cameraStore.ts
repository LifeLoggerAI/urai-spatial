'use client'

import { create } from 'zustand'

type CameraState = {
  isGliding: boolean
  actions: {
    setGliding: (isGliding: boolean) => void
  }
}

export const useCameraStore = create<CameraState>((set) => ({
  isGliding: false,
  actions: {
    setGliding: (isGliding) => set({ isGliding }),
  },
}))
