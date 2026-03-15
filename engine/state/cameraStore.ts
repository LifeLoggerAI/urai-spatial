'use client'

import { create } from 'zustand'

type CameraState = {
  isGliding: boolean
  setGliding: (value: boolean) => void
  resetCameraState: () => void
}

export const useCameraStore = create<CameraState>((set) => ({
  isGliding: false,

  setGliding: (value) =>
    set({ isGliding: value }),

  resetCameraState: () =>
    set({ isGliding: false }),
}))