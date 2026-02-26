
import { create } from 'zustand'

export type SceneType = 'home' | 'lifemap' | 'replay'
export type CameraMode = 'idle' | 'explore' | 'focus' | 'transition'
export type EmotionalTone = 'calm' | 'heavy' | 'elevated'

interface EmotionalBiome {
  tone: EmotionalTone
  intensity: number // 0 → 1
}

interface IdentityState {
  currentScene: SceneType
  activeNodeId: string | null
  transitionState: 'idle' | 'transitioning'
  transitionProgress: number
  cameraMode: CameraMode
  emotionalBiome: EmotionalBiome

  setScene: (scene: SceneType) => void
  setActiveNode: (id: string | null) => void
  setTransitionState: (state: 'idle' | 'transitioning') => void
  setTransitionProgress: (v: number) => void
  setCameraMode: (mode: CameraMode) => void
  setEmotionalBiome: (biome: EmotionalBiome) => void
  beginTransition: () => void
  endTransition: () => void
}

export const useIdentityStore = create<IdentityState>((set) => ({
  currentScene: 'home',
  activeNodeId: null,
  transitionState: 'idle',
  transitionProgress: 0,
  cameraMode: 'idle',
  emotionalBiome: {
    tone: 'calm',
    intensity: 0.5,
  },

  setScene: (scene) => set({ currentScene: scene }),
  setActiveNode: (id) => set({ activeNodeId: id }),
  setTransitionState: (state) => set({ transitionState: state }),
  setTransitionProgress: (v) => set({ transitionProgress: v }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setEmotionalBiome: (biome) => set({ emotionalBiome: biome }),
  beginTransition: () =>
    set((s) =>
      s.transitionState === 'idle'
        ? { transitionState: 'transitioning' }
        : {}
    ),
  endTransition: () => set({ transitionState: 'idle' }),
}))
