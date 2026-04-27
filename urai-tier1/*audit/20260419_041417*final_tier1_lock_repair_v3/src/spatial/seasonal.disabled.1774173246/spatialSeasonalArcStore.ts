"use client";

import { create } from "zustand";
import {
  createDefaultSpatialSeasonalArcManifest,
  type SpatialSeasonalArc,
  type SpatialSeasonalArcManifest,
} from "@/spatial/seasonal/spatialSeasonalArcTypes";

type SpatialSeasonalArcStore = SpatialSeasonalArcManifest & {
  hydrate: (manifest: SpatialSeasonalArcManifest) => void;
  replaceManifest: (manifest: SpatialSeasonalArcManifest) => void;
  setActiveSeasonalArcId: (id: string | null) => void;
  setSeasonalArcs: (seasonalArcs: SpatialSeasonalArc[]) => void;
  reset: () => void;
};

export const useSpatialSeasonalArcStore = create<SpatialSeasonalArcStore>((set) => ({
  ...createDefaultSpatialSeasonalArcManifest(),
  hydrate: (manifest) =>
    set(() => ({
      ...manifest,
    })),
  replaceManifest: (manifest) =>
    set(() => ({
      ...manifest,
    })),
  setActiveSeasonalArcId: (id) =>
    set((state) => ({
      ...state,
      activeSeasonalArcId: id,
    })),
  setSeasonalArcs: (seasonalArcs) =>
    set((state) => ({
      ...state,
      seasonalArcs,
    })),
  reset: () =>
    set(() => ({
      ...createDefaultSpatialSeasonalArcManifest(),
    })),
}));
