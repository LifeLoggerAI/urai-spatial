
import { create } from "zustand"
import * as THREE from "three"

type SpatialMode = "lifemap" | "memory"

type SpatialState = {
  spatialMode: SpatialMode
  selectedStarId: number | null
  homePosition: THREE.Vector3
  homeTarget: THREE.Vector3
  selectStar: (id: number) => void
  clearSelection: () => void
}

export const useSpatialStore = create<SpatialState>((set) => ({
  spatialMode: "lifemap",
  selectedStarId: null,
  homePosition: new THREE.Vector3(0, 0, 300),
  homeTarget: new THREE.Vector3(0, 0, 0),
  selectStar: (id) =>
    set((state) => {
      // Enforce selection invariant using functional set to prevent race conditions.
      // A selection is only possible from the 'lifemap' mode when no star is selected.
      if (state.spatialMode !== "lifemap" || state.selectedStarId !== null) {
        return {} // Return empty object to signify no state change
      }
      // Atomically commit the new state
      return {
        selectedStarId: id,
        spatialMode: "memory",
      }
    }),
  clearSelection: () =>
    set(() => ({
      selectedStarId: null,
      spatialMode: "lifemap",
    })),
}))
