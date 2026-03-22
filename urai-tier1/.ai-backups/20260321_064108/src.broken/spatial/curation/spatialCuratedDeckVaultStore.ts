"use client";

import { create } from "zustand";
import {
  createDefaultSpatialCuratedDeckVaultManifest,
  type SpatialCuratedDeckVaultEntry,
  type SpatialCuratedDeckVaultManifest,
} from "@/spatial/curation/spatialCuratedDeckVaultTypes";

type SpatialCuratedDeckVaultStore = SpatialCuratedDeckVaultManifest & {
  hydrate: (manifest: SpatialCuratedDeckVaultManifest) => void;
  replaceManifest: (manifest: SpatialCuratedDeckVaultManifest) => void;
  setActiveEntryId: (id: string | null) => void;
  appendEntry: (entry: SpatialCuratedDeckVaultEntry) => void;
  reset: () => void;
};

export const useSpatialCuratedDeckVaultStore =
  create<SpatialCuratedDeckVaultStore>((set) => ({
    ...createDefaultSpatialCuratedDeckVaultManifest(),
    hydrate: (manifest) =>
      set({
        ...createDefaultSpatialCuratedDeckVaultManifest(),
        ...manifest,
        schema: "urai.spatial.curated-deck-vault.v1",
      }),
    replaceManifest: (manifest) =>
      set({
        ...createDefaultSpatialCuratedDeckVaultManifest(),
        ...manifest,
        schema: "urai.spatial.curated-deck-vault.v1",
      }),
    setActiveEntryId: (id) => set({ activeEntryId: id }),
    appendEntry: (entry) =>
      set((state) => ({
        activeEntryId: entry.id,
        entries: [...state.entries, entry].slice(-20),
      })),
    reset: () => set(createDefaultSpatialCuratedDeckVaultManifest()),
  }));
