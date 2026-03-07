import { create } from "zustand"

type SpatialMode = "lifemap" | "memory"

type SpatialState = {
  spatialMode:SpatialMode
  selected:number|null
  position:[number,number,number]

  select:(id:number,pos:[number,number,number])=>void
}

export const useSpatial = create<SpatialState>((set)=>({

  spatialMode:"lifemap",
  selected:null,
  position:[0,0,0],

  select:(id,pos)=>set({
    spatialMode:"memory",
    selected:id,
    position:pos
  })

}))
