
import { create } from 'zustand'

type SpatialState = {
  spatialMode: 'lifemap' | 'replay'
  selectedStarId: string | null
  actions: {
    selectStar: (id: string) => void
    exitReplay: () => void
  }
}

export const useSpatialStore = create<SpatialState>((set) => ({
  spatialMode: 'lifemap',
  selectedStarId: null,
  actions: {
    selectStar: (id) => set({ spatialMode: 'replay', selectedStarId: id }),
    exitReplay: () => set({ spatialMode: 'lifemap', selectedStarId: null }),
  }
}))
