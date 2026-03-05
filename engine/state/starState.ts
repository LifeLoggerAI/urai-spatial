import { create } from "zustand"
import * as THREE from "three"

type StarState = {
  selectedStar: number | null
  starPositions: THREE.Vector3[]
  setSelectedStar: (id:number)=>void
  setStarPositions: (p:THREE.Vector3[])=>void
}

export const useStarState = create<StarState>((set)=>({
  selectedStar:null,
  starPositions:[],
  setSelectedStar:(id)=>set({selectedStar:id}),
  setStarPositions:(p)=>set({starPositions:p})
}))
