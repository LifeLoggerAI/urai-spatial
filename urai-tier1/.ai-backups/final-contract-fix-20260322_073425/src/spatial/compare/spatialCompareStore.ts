import { create } from "zustand";
import {
  type SpatialCompareManifest,
  type SpatialCompareSet,
  createDefaultSpatialCompareManifest,
  toSpatialCompareSetContract,
  toSpatialCompareSetContractList,
} from "./spatialCompareTypes";

export type SpatialCompareStore = {
  sets: SpatialCompareSet[];
  selectedSetId: string | null;
  manifest: SpatialCompareManifest;
  setSets: (sets: SpatialCompareSet[]) => void;
  replaceManifest: (manifestOrSets: unknown) => void;
  addSet: (set: unknown) => void;
  removeSet: (id: string) => void;
  clearSets: () => void;
  setSelectedSetId: (id: string | null) => void;
};

export const useSpatialCompareStore = create<SpatialCompareStore>((set) => ({
  sets: [],
  selectedSetId: null,
  manifest: createDefaultSpatialCompareManifest(),

  setSets: (sets) =>
    set({
      sets,
      manifest: { sets },
    }),

  replaceManifest: (manifestOrSets) => {
    if (
      manifestOrSets &&
      typeof manifestOrSets === "object" &&
      Array.isArray((manifestOrSets as { sets?: unknown }).sets)
    ) {
      const sets = toSpatialCompareSetContractList(
        (manifestOrSets as { sets?: unknown }).sets,
      );
      set({
        sets,
        manifest: { sets },
      });
      return;
    }

    const sets = toSpatialCompareSetContractList(manifestOrSets);
    set({
      sets,
      manifest: { sets },
    });
  },

  addSet: (nextSet) =>
    set((state) => {
      const sets = [...state.sets, toSpatialCompareSetContract(nextSet)];
      return {
        sets,
        manifest: { sets },
      };
    }),

  removeSet: (id) =>
    set((state) => {
      const sets = state.sets.filter((entry) => entry.id !== id);
      return {
        sets,
        manifest: { sets },
        selectedSetId: state.selectedSetId === id ? null : state.selectedSetId,
      };
    }),

  clearSets: () =>
    set({
      sets: [],
      manifest: createDefaultSpatialCompareManifest(),
      selectedSetId: null,
    }),

  setSelectedSetId: (id) => set({ selectedSetId: id }),
}));
