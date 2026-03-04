"use client"

import create from "zustand"

type SpatialMode = "lifemap" | "memory"

interface SpatialState {
  spatialMode: SpatialMode
  selectedStarId: number | null
  animating: boolean
  setSelectedStar: (id: number | null) => void
  setSpatialMode: (mode: SpatialMode) => void
  setAnimating: (v: boolean) => void
}

export const useSpatialStore = create<SpatialState>((set) => ({
  spatialMode: "lifemap",
  selectedStarId: null,
  animating: false,
  setSelectedStar: (id) => set({ selectedStarId: id }),
  setSpatialMode: (mode) => set({ spatialMode: mode }),
  setAnimating: (v) => set({ animating: v }),
}))
