import { create } from "zustand";
import {
  type SpatialCompareSet,
  toSpatialCompareSetContract,
  toSpatialCompareSetContractList,
} from "./spatialCompareTypes";

export type SpatialCompareStore = {
  sets: SpatialCompareSet[];
  selectedSetId: string | null;
  setSets: (sets: SpatialCompareSet[]) => void;
  replaceManifest: (sets: unknown) => void;
  addSet: (set: unknown) => void;
  removeSet: (id: string) => void;
  clearSets: () => void;
  setSelectedSetId: (id: string | null) => void;
};

export const useSpatialCompareStore = create<SpatialCompareStore>((set) => ({
  sets: [],
  selectedSetId: null,

  setSets: (sets) => set({ sets }),

  replaceManifest: (sets) =>
    set({
      sets: toSpatialCompareSetContractList(sets),
    }),

  addSet: (nextSet) =>
    set((state) => ({
      sets: [...state.sets, toSpatialCompareSetContract(nextSet)],
    })),

  removeSet: (id) =>
    set((state) => ({
      sets: state.sets.filter((entry) => entry.id !== id),
      selectedSetId: state.selectedSetId === id ? null : state.selectedSetId,
    })),

  clearSets: () =>
    set({
      sets: [],
      selectedSetId: null,
    }),

  setSelectedSetId: (id) => set({ selectedSetId: id }),
}));
