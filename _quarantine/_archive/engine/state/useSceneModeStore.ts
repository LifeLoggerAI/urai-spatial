'use client'

import { create } from 'zustand'

export type SceneMode =
  | 'HOME'
  | 'LIFEMAP'
  | 'REPLAY'

interface SceneModeState {
  mode: SceneMode

  setMode: (mode: SceneMode) => void

  goHome: () => void
  goLifeMap: () => void
  goReplay: () => void

  reset: () => void
}

export const useSceneModeStore = create<SceneModeState>((set) => ({
  // initial scene
  mode: 'HOME',

  // generic setter
  setMode: (mode) => set({ mode }),

  // shortcuts for common transitions
  goHome: () => set({ mode: 'HOME' }),
  goLifeMap: () => set({ mode: 'LIFEMAP' }),
  goReplay: () => set({ mode: 'REPLAY' }),

  // reset to default
  reset: () => set({ mode: 'HOME' }),
}))