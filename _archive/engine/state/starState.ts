import { create } from "zustand"
import * as THREE from "three"

interface StarState {
  selectedStar: number | null
  starPositions: THREE.Vector3[]

  setSelectedStar: (id: number | null) => void
  setStarPositions: (positions: THREE.Vector3[]) => void
  clearSelection: () => void
}

export const useStarState = create<StarState>((set) => ({
  // currently selected star ID
  selectedStar: null,

  // array of star positions in 3D space
  starPositions: [],

  // set a star as selected
  setSelectedStar: (id: number | null) =>
    set({ selectedStar: id }),

  // set positions of all stars
  setStarPositions: (positions: THREE.Vector3[]) =>
    set({ starPositions: positions }),

  // clear selection
  clearSelection: () =>
    set({ selectedStar: null }),
}))