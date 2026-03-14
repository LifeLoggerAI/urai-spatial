import { create } from "zustand"
import * as THREE from "three"

type StarState = {

  selectedStar: number | null
  starPositions: THREE.Vector3[]

  setSelectedStar: (id: number | null) => void
  setStarPositions: (positions: THREE.Vector3[]) => void
  clearSelection: () => void
}

export const useStarState = create<StarState>((set)=>({

  selectedStar: null,

  starPositions: [],

  setSelectedStar: (id:number | null) =>
    set({ selectedStar:id }),

  setStarPositions: (positions:THREE.Vector3[]) =>
    set({ starPositions:positions }),

  clearSelection: () =>
    set({ selectedStar:null })

}))