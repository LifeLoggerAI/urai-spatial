import { create } from "zustand"

type SpatialState = {
  selected: [number,number,number] | null
  select: (p:[number,number,number])=>void
}

export const useSpatialStore = create<SpatialState>((set)=>({
  selected:null,
  select:(p)=>set({selected:p})
}))
