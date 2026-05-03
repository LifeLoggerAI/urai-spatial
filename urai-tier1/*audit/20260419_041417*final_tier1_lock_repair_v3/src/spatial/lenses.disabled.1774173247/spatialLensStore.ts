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
    set(() => ({
      ...manifest,
    })),
  replaceManifest: (manifest) =>
    set(() => ({
      ...manifest,
    })),
  setActiveLensId: (id) =>
    set((state) => ({
      ...state,
      activeLensId: id,
    })),
  setLenses: (lenses) =>
    set((state) => ({
      ...state,
      lenses,
    })),
  reset: () =>
    set(() => ({
      ...createDefaultSpatialLensManifest(),
    })),
}));
