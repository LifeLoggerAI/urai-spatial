'use client'

import { create } from 'zustand'

export type SceneMode = 'home' | 'lifemap' | 'memory' | 'replay'

type SceneState = {
  mode: SceneMode
  selectedStarId: string | null
  setMode: (mode: SceneMode) => void
  selectStar: (id: string, nextMode?: SceneMode) => void
  clearSelection: (nextMode?: SceneMode) => void
  resetScene: () => void
}

export const useSceneStore = create<SceneState>((set) => ({
  mode: 'home',
  selectedStarId: null,

  setMode: (mode) =>
    set({
      mode,
    }),

  selectStar: (id, nextMode = 'memory') =>
    set({
      selectedStarId: id,
      mode: nextMode,
    }),

  clearSelection: (nextMode = 'lifemap') =>
    set({
      selectedStarId: null,
      mode: nextMode,
    }),

  resetScene: () =>
    set({
      mode: 'home',
      selectedStarId: null,
    }),
}))