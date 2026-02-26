
import { create } from "zustand"

type InteractionState = {
  hoveredId: string | null
  activeId: string | null
  setHovered: (id: string | null) => void
  setActive: (id: string | null) => void
  isTransitioning: boolean
  setTransitioning: (v: boolean) => void
}

export const useInteractionStore = create<InteractionState>((set) => ({
  hoveredId: null,
  activeId: null,
  setHovered: (id) => set({ hoveredId: id }),
  setActive: (id) => set({ activeId: id }),
  isTransitioning: false,
  setTransitioning: (isTransitioning) => set({ isTransitioning }),
}))
