import { create } from "zustand"

type SpatialMode = "lifemap" | "memory"

type SpatialState = {
  spatialMode: SpatialMode
  selectedStarId: number | null
  selectStar: (id: number) => void
  clearSelection: () => void
}

export const useSpatialStore = create<SpatialState>((set) => ({
  spatialMode: "lifemap",
  selectedStarId: null,
  selectStar: (id) =>
    set({
      selectedStarId: id,
      spatialMode: "memory",
    }),
  clearSelection: () =>
    set({
      selectedStarId: null,
      spatialMode: "lifemap",
    }),
}))
