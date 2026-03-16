import { create } from "zustand"

type StarSelectionState = {
  selected: number | null
  setSelected: (id: number | null) => void
  clearSelected: () => void
}

export const useStarSelection = create<StarSelectionState>((set) => ({
  selected: null,

  setSelected: (id) =>
    set((state) =>
      state.selected === id ? state : { selected: id }
    ),

  clearSelected: () =>
    set((state) =>
      state.selected === null ? state : { selected: null }
    ),
}))