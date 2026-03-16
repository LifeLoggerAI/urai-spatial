import { create } from "zustand"

type HoverState = {
  hoveredId: number | null
  setHovered: (id: number | null) => void
  clearHover: () => void
}

export const useHoverStore = create<HoverState>((set) => ({
  hoveredId: null,

  setHovered: (id: number | null) => set({ hoveredId: id }),

  clearHover: () => set({ hoveredId: null }),
}))