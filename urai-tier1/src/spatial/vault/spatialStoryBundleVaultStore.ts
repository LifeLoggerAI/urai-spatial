"use client";

import { create } from "zustand";
import {
  createDefaultSpatialStoryBundleVaultManifest,
  type SpatialStoryBundleVaultEntry,
  type SpatialStoryBundleVaultManifest,
} from "@/spatial/vault/spatialStoryBundleVaultTypes";

type SpatialStoryBundleVaultStore = SpatialStoryBundleVaultManifest & {
  hydrate: (manifest: SpatialStoryBundleVaultManifest) => void;
  replaceManifest: (manifest: SpatialStoryBundleVaultManifest) => void;
  setActiveEntryId: (id: string | null) => void;
  appendEntry: (entry: SpatialStoryBundleVaultEntry) => void;
  reset: () => void;
};

export const useSpatialStoryBundleVaultStore =
  create<SpatialStoryBundleVaultStore>((set) => ({
    ...createDefaultSpatialStoryBundleVaultManifest(),
    hydrate: (manifest) =>
      set({
        ...createDefaultSpatialStoryBundleVaultManifest(),
        ...manifest,
        schema: "urai.spatial.story-bundle-vault.v1",
      }),
    replaceManifest: (manifest) =>
      set({
        ...createDefaultSpatialStoryBundleVaultManifest(),
        ...manifest,
        schema: "urai.spatial.story-bundle-vault.v1",
      }),
    setActiveEntryId: (id) => set({ activeEntryId: id }),
    appendEntry: (entry) =>
      set((state) => ({
        activeEntryId: entry.id,
        entries: [...state.entries, entry].slice(-20),
      })),
    reset: () => set(createDefaultSpatialStoryBundleVaultManifest()),
  }));
