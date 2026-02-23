import { create } from 'zustand'

type SceneState = {
  current: string
  setScene: (scene: string) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  current: 'home',
  setScene: (scene) => set({ current: scene }),
}))
