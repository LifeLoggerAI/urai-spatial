import { create } from "zustand";

import { type SpatialCompareSet, toSpatialCompareSetContract } from "./spatialCompareTypes";
export type SpatialCompareSet = {
  id: string;
  leftStarId: string | null;
  rightStarId: string | null;
  label?: string;
  createdAt: string;
  baseline: string | null;
  target: string | null;
  summary: string;
};

export type SpatialCompareManifest = {
  leftStarId: string | null;
  rightStarId: string | null;
  isLoaded: boolean;
  sets: SpatialCompareSet[];
  replaceManifest: (sets) => set({ sets: Array.isArray(sets) ? sets.map(toSpatialCompareSetContract) : [] }),
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
      sets: sets.map((item) => ({
        id: item.id,
        leftStarId: item.leftStarId ?? null,
        rightStarId: item.rightStarId ?? null,
        label: item.label,
        createdAt: item.createdAt ?? new Date(0).toISOString(),
        baseline: item.baseline ?? item.leftStarId ?? null,
        target: item.target ?? item.rightStarId ?? null,
        summary: item.summary ?? item.label ?? "",
      })),
    }),
}));
