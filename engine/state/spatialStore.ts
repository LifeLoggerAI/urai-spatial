"use client"

import { create } from "zustand"

export type Star = {
  id: number
  position: [number, number, number]
}

type SpatialState = {
  mode: "explore" | "replay"

  selectedStar: Star | null
  cameraTarget: [number, number, number] | null

  setStar: (star: Star) => void
  exitReplay: () => void
}

export const useSpatialStore = create<SpatialState>((set) => ({
  mode: "explore",

  selectedStar: null,
  cameraTarget: null,

  setStar: (star) =>
    set({
      selectedStar: star,
      cameraTarget: star.position,
      mode: "replay",
    }),

  exitReplay: () =>
    set({
      selectedStar: null,
      cameraTarget: null,
      mode: "explore",
    }),
}))