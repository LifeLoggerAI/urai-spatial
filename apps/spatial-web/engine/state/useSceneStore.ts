import { create } from 'zustand'
import { scenes, Scene } from './scenes'

export type ZoomLevel =
  | 'decade'
  | 'year'
  | 'month'
  | 'day'
  | 'moment'

interface SpatialState {
  scene: Scene
  targetScene: Scene | null

  zoomLevel: ZoomLevel
  cameraZ: number

  activeEra: string | null
  selectedMoment: string | null
  selectedMomentPosition: [number, number, number] | null

  setScene: (scene: Scene) => void
  setTargetScene: (scene: Scene | null) => void,
  setZoomLevel: (level: ZoomLevel) => void
  setCameraZ: (z: number) => void
  setActiveEra: (era: string | null) => void
  setSelectedMoment: (id: string | null) => void
  setSelectedMomentPosition: (pos: [number, number, number] | null) => void
}

export const useSceneStore = create<SpatialState>((set) => ({
  scene: 'home',
  targetScene: null,

  zoomLevel: 'decade',
  cameraZ: 60,

  activeEra: null,
  selectedMoment: null,
  selectedMomentPosition: null,

  setScene: (scene) => {
    if (!scenes.includes(scene)) {
      console.warn('Invalid scene requested:', scene)
      return
    }
    set({ scene })
  },
  setTargetScene: (targetScene) => set({ targetScene }),
  setZoomLevel: (zoomLevel) => set({ zoomLevel }),
  setCameraZ: (cameraZ) => set({ cameraZ }),
  setActiveEra: (activeEra) => set({ activeEra }),
  setSelectedMoment: (selectedMoment) => set({ selectedMoment }),
  setSelectedMomentPosition: (selectedMomentPosition) =>
    set({ selectedMomentPosition }),
}))