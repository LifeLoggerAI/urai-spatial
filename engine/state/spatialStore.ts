import { create } from "zustand"

interface SpatialState {
  selectedStarId: number | null
  interactionLock: boolean
  inReplayMode: boolean

  setSelectedStarId: (id: number | null) => void
  setInteractionLock: (locked: boolean) => void
  setInReplayMode: (state: boolean) => void
  resetSelection: () => void
}

export const useSpatialStore = create<SpatialState>((set) => ({
  selectedStarId: null,
  interactionLock: false,
  inReplayMode: false,

  setSelectedStarId: (id) =>
    set(() => ({
      selectedStarId: id,
    })),

  setInteractionLock: (locked) =>
    set(() => ({
      interactionLock: locked,
    })),

  setInReplayMode: (state) =>
    set(() => ({
      inReplayMode: state,
    })),

  resetSelection: () =>
    set(() => ({
      selectedStarId: null,
      interactionLock: false,
      inReplayMode: false,
    })),
}))