import { create } from 'zustand'
import type { SceneType } from './scene-types'

interface SceneState {
  current: SceneType
  setScene: (scene: SceneType) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  current: 'home',
  setScene: (scene) => set({ current: scene }),
}))
