import { create } from 'zustand'

export type Scene =
  | 'home'
  | 'lifemap'
  | 'star'

interface SceneState {
  scene: Scene

  selectedNodeId: string | null
  activeMemoryId: string | null

  isTransitioning: boolean

  setScene: (scene: Scene) => void
  setSelectedNode: (id: string | null) => void
  setActiveMemory: (id: string | null) => void
  setTransitioning: (value: boolean) => void
}

export const useSceneStore = create<SceneState>((set, get) => ({
  scene: 'home',

  selectedNodeId: null,
  activeMemoryId: null,

  isTransitioning: false,

  setScene: (scene) => {
    // prevent scene change during transition
    if (get().isTransitioning) return
    set({ scene })
  },

  setSelectedNode: (id) =>
    set({ selectedNodeId: id }),

  setActiveMemory: (id) =>
    set({ activeMemoryId: id }),

  setTransitioning: (value) =>
    set({ isTransitioning: value }),
}))
