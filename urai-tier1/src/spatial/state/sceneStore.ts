import { create } from 'zustand'

export type SceneMode = 'home' | 'lifemap' | 'memory' | 'replay'

type SceneState = {
  mode: SceneMode
  selectedStarId: string | null
  setMode: (m: SceneMode) => void
  selectStar: (id: string) => void
  clearSelection: () => void
}

export const useSceneStore = create<SceneState>((set) => ({
  mode: 'home',
  selectedStarId: null,
  setMode: (m) => set({ mode: m }),
  selectStar: (id) => set({ selectedStarId: id, mode: 'memory' }),
  clearSelection: () => set({ selectedStarId: null, mode: 'lifemap' }),
}))
