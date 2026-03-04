'use client'

import { create } from 'zustand'

export type SceneMode =
  | 'HOME'
  | 'LIFEMAP'
  | 'REPLAY'

interface SceneModeState {
  mode: SceneMode
  setMode: (mode: SceneMode) => void
}

export const useSceneModeStore = create<SceneModeState>((set) => ({
  mode: 'HOME',
  setMode: (mode) => set({ mode })
}))