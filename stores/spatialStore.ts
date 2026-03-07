import { create } from "zustand"

type SpatialMode = "lifemap" | "memory"

type SpatialState = {
  spatialMode: SpatialMode
  selected: number | null
  position: [number,number,number]
  arrived: boolean

  select:(id:number,pos:[number,number,number])=>void
  setArrived:(v:boolean)=>void
}

export const useSpatial = create<SpatialState>((set)=>({

  spatialMode:"lifemap",
  selected:null,
  position:[0,0,0],
  arrived:false,

  select:(id,pos)=>set({
    spatialMode:"memory",
    selected:id,
    position:pos,
    arrived:false
  }),

  setArrived:(v)=>set({ arrived:v })

}))
