import { create } from "zustand"
import * as THREE from "three"

type SpatialMode = "lifemap" | "memory"

interface SpatialState {
  spatialMode: SpatialMode
  selectedStarId: number | null
  starPositions: THREE.Vector3[]

  setStarPositions: (p:THREE.Vector3[])=>void
  selectStar: (id:number)=>void
  clearSelection: ()=>void
}

export const useSpatialStore = create<SpatialState>((set)=>({

  spatialMode: "lifemap",
  selectedStarId: null,
  starPositions: [],

  setStarPositions:(p)=>set({starPositions:p}),

  selectStar:(id)=>set({
    selectedStarId:id,
    spatialMode:"memory"
  }),

  clearSelection:()=>set({
    selectedStarId:null,
    spatialMode:"lifemap"
  })

}))
