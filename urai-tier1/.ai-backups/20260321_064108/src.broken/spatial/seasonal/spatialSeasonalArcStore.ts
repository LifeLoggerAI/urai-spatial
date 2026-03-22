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
    set({
      ...createDefaultSpatialSeasonalArcManifest(),
      ...manifest,
      schema: "urai.spatial.seasonal-arc.v1",
    }),
  replaceManifest: (manifest) =>
    set({
      ...createDefaultSpatialSeasonalArcManifest(),
      ...manifest,
      schema: "urai.spatial.seasonal-arc.v1",
    }),
  setActiveSeasonalArcId: (id) => set({ activeSeasonalArcId: id }),
  setSeasonalArcs: (seasonalArcs) =>
    set((state) => {
      const activeSeasonalArcId = seasonalArcs.some(
        (item) => item.id === state.activeSeasonalArcId,
      )
        ? state.activeSeasonalArcId
        : seasonalArcs[0]?.id ?? null;

      return {
        seasonalArcs,
        activeSeasonalArcId,
      };
    }),
  reset: () => set(createDefaultSpatialSeasonalArcManifest()),
}));
