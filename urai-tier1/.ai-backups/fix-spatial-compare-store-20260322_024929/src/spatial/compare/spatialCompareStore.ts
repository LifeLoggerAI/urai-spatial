"use client";

import { create } from "zustand";
import {
  createDefaultSpatialCompareManifest,
  type SpatialCompareManifest,
  type SpatialCompareSet,
} from "@/spatial/compare/spatialCompareTypes";

type SpatialCompareStore = SpatialCompareManifest & {
  hydrate: (manifest: SpatialCompareManifest) => void;
  replaceManifest: (manifest: SpatialCompareManifest) => void;
  appendSet: (compareSet: SpatialCompareSet) => void;
  reset: () => void;
};

export const useSpatialCompareStore = create<SpatialCompareStore>((set) => ({
  ...createDefaultSpatialCompareManifest(),
  hydrate: (manifest) =>
    set(() => ({
      ...createDefaultSpatialCompareManifest(),
      ...manifest,
      schema: "urai.spatial.compare.v1",
    }))},
  replaceManifest: (manifest) =>
    set(() => ({
      ...createDefaultSpatialCompareManifest(),
      ...manifest,
      schema: "urai.spatial.compare.v1",
    }))},
  appendSet: (compareSet) =>
    set((state) => ({
      sets: [...state.sets, compareSet].slice(-24),
    }))}),
  reset: () => set(createDefaultSpatialCompareManifest()),
}))});
