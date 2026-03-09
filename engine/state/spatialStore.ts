import { create } from "zustand"

type SpatialMode = "lifemap" | "memory"

interface SpatialState {
  spatialMode: SpatialMode
  selectedStarId: number | null
  selectStar: (id:number)=>void
  reset: ()=>void
}

export const useSpatialStore = create<SpatialState>((set)=>({
  spatialMode: "lifemap",
  selectedStarId: null,

  selectStar:(id)=>set({
    spatialMode:"memory",
    selectedStarId:id
  }),

  reset:()=>set({
    spatialMode:"lifemap",
    selectedStarId:null
  })
}))
