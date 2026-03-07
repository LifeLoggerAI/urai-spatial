import { create } from "zustand"

type SpatialState = {
  selected:number|null
  position:[number,number,number]
  select:(id:number,pos:[number,number,number])=>void
}

export const useSpatial = create<SpatialState>((set)=>({
  selected:null,
  position:[0,0,0],
  select:(id,pos)=>set({ selected:id, position:pos })
}))
