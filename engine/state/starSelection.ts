import { create } from "zustand"

type StarSelectionState = {
  selected: number | null
  setSelected: (id:number|null)=>void
}

export const useStarSelection = create<StarSelectionState>((set)=>({
  selected:null,
  setSelected:(id)=>set({selected:id})
}))