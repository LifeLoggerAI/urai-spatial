"use client";

import { create } from "zustand";
import {
  createDefaultSpatialArcManifest,
  type SpatialArcManifest,
  type SpatialNarrativeArc,
} from "@/spatial/arcs/spatialArcTypes";

type SpatialArcStore = SpatialArcManifest & {
  hydrate: (manifest: SpatialArcManifest) => void;
  replaceManifest: (manifest: SpatialArcManifest) => void;
  setActiveArcId: (id: string | null) => void;
  setArcs: (arcs: SpatialNarrativeArc[]) => void;
  reset: () => void;
};

export const useSpatialArcStore = create<SpatialArcStore>((set) => ({
  ...createDefaultSpatialArcManifest(),
  hydrate: (manifest) =>
    set(() => ({
      ...createDefaultSpatialArcManifest(),
      ...manifest,
      schema: "urai.spatial.arc.v1",
    }))},
  replaceManifest: (manifest) =>
    set(() => ({
      ...createDefaultSpatialArcManifest(),
      ...manifest,
      schema: "urai.spatial.arc.v1",
    }))},
  setActiveArcId: (id) => set(() => ({ activeArcId: id }))},
  setArcs: (arcs) =>
    set((state) => {
      const activeArcId = arcs.some((item) => item.id === state.activeArcId)
        ? state.activeArcId
        : arcs[0]?.id ?? null;

      return {
        arcs,
        activeArcId,
      };
    }))},
  reset: () => set(createDefaultSpatialArcManifest()),
}))});
