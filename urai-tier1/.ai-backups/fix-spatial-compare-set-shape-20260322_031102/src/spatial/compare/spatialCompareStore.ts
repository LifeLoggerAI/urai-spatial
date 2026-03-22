import { create } from "zustand";

export type SpatialCompareSet = {
  id: string;
  leftStarId: string | null;
  rightStarId: string | null;
  label?: string;
};

export type SpatialCompareManifest = {
  leftStarId: string | null;
  rightStarId: string | null;
  isLoaded: boolean;
  sets: SpatialCompareSet[];
};

export type SpatialCompareStore = SpatialCompareManifest & {
  hydrate: (manifest?: Partial<SpatialCompareManifest>) => void;
  reset: () => void;
  setLeftStarId: (id: string | null) => void;
  setRightStarId: (id: string | null) => void;
  setPair: (leftId: string | null, rightId: string | null) => void;
  setSets: (sets: SpatialCompareSet[]) => void;
};

export function createDefaultSpatialCompareManifest(): SpatialCompareManifest {
  return {
    leftStarId: null,
    rightStarId: null,
    isLoaded: false,
    sets: [],
  };
}

export const useSpatialCompareStore = create<SpatialCompareStore>((set) => ({
  ...createDefaultSpatialCompareManifest(),

  hydrate: (manifest = {}) =>
    set((state) => ({
      ...state,
      ...manifest,
      isLoaded: true,
    })),

  reset: () =>
    set({
      ...createDefaultSpatialCompareManifest(),
    }),

  setLeftStarId: (id) =>
    set({
      leftStarId: id,
    }),

  setRightStarId: (id) =>
    set({
      rightStarId: id,
    }),

  setPair: (leftId, rightId) =>
    set({
      leftStarId: leftId,
      rightStarId: rightId,
    }),

  setSets: (sets) =>
    set({
      sets,
    }),
}));
