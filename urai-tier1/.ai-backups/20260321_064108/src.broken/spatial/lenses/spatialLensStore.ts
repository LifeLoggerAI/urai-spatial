"use client";

import { create } from "zustand";
import {
  createDefaultSpatialLensManifest,
  type SpatialLensManifest,
  type SpatialTimelineLens,
} from "@/spatial/lenses/spatialLensTypes";

type SpatialLensStore = SpatialLensManifest & {
  hydrate: (manifest: SpatialLensManifest) => void;
  replaceManifest: (manifest: SpatialLensManifest) => void;
  setActiveLensId: (id: string) => void;
  setLenses: (lenses: SpatialTimelineLens[]) => void;
  reset: () => void;
};

export const useSpatialLensStore = create<SpatialLensStore>((set) => ({
  ...createDefaultSpatialLensManifest(),
  hydrate: (manifest) =>
    set({
      ...createDefaultSpatialLensManifest(),
      ...manifest,
      schema: "urai.spatial.lens.v1",
    }),
  replaceManifest: (manifest) =>
    set({
      ...createDefaultSpatialLensManifest(),
      ...manifest,
      schema: "urai.spatial.lens.v1",
    }),
  setActiveLensId: (id) => set({ activeLensId: id }),
  setLenses: (lenses) =>
    set((state) => {
      const activeLensId = lenses.some((item) => item.id === state.activeLensId)
        ? state.activeLensId
        : lenses[0]?.id ?? null;

      return {
        lenses,
        activeLensId,
      };
    }),
  reset: () => set(createDefaultSpatialLensManifest()),
}));
