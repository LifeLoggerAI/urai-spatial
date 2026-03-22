import { create } from "zustand";

export type SpatialArc = {
  id: string;
  fromStarId: string;
  toStarId: string;
  strength: number;
  label?: string;
};

export type SpatialArcManifest = {
  arcs: SpatialArc[];
  isLoaded: boolean;
};

export type SpatialArcStore = SpatialArcManifest & {
  hydrate: (manifest?: Partial<SpatialArcManifest>) => void;
  reset: () => void;
  setArcs: (arcs: SpatialArc[]) => void;
};

export function createDefaultSpatialArcManifest(): SpatialArcManifest {
  return {
    arcs: [],
    isLoaded: false,
  };
}

export const useSpatialArcStore = create<SpatialArcStore>((set) => ({
  ...createDefaultSpatialArcManifest(),

  hydrate: (manifest = {}) =>
    set((state) => ({
      ...state,
      ...manifest,
      isLoaded: true,
    })),

  reset: () =>
    set({
      ...createDefaultSpatialArcManifest(),
    }),

  setArcs: (arcs) =>
    set({
      arcs,
    }),
}));
