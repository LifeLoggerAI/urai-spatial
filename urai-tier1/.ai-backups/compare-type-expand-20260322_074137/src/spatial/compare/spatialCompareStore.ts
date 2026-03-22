import { create } from "zustand";
import {
  SpatialCompareManifest,
  SpatialCompareSet,
  createDefaultSpatialCompareManifest,
} from "./spatialCompareTypes";

type State = {
  manifest: SpatialCompareManifest;
  sets: SpatialCompareSet[];
  hydrate: (m: SpatialCompareManifest) => void;
  addSet: (set: SpatialCompareSet) => void;
};

export const useSpatialCompareStore = create<State>((set) => ({
  manifest: createDefaultSpatialCompareManifest(),
  sets: [],
  hydrate: (m) => set({ manifest: m, sets: m.sets }),
  addSet: (s) =>
    set((state) => ({
      sets: [...state.sets, s],
      manifest: { ...state.manifest, sets: [...state.sets, s] },
    })),
}));
