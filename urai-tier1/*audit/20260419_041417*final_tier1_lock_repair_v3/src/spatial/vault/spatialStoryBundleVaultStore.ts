import { create } from "zustand";
import {
  createDefaultSpatialStoryBundleVaultManifest,
  type SpatialStoryBundleVaultManifest,
  type SpatialStoryBundleVaultEntry,
} from "./spatialStoryBundleVaultTypes";

export type SpatialStoryBundleVaultStore = SpatialStoryBundleVaultManifest & {
  hydrate: (manifest: SpatialStoryBundleVaultManifest) => void;
  setActiveEntryId: (entryId: string | null) => void;
  addEntry: (entry: SpatialStoryBundleVaultEntry) => void;
  removeEntry: (entryId: string) => void;
  clear: () => void;
};

export const useSpatialStoryBundleVaultStore =
  create<SpatialStoryBundleVaultStore>((set) => ({
    ...createDefaultSpatialStoryBundleVaultManifest(),

    setActiveEntryId: (entryId) =>
      set(() => ({
        activeEntryId: entryId,
      })),

    hydrate: (manifest) =>
      set(() => ({
        ...createDefaultSpatialStoryBundleVaultManifest(),
        ...manifest,
      })),

    addEntry: (entry) =>
      set((state) => ({
        entries: [...state.entries.filter((item) => item.id !== entry.id), entry],
      })),

    removeEntry: (entryId) =>
      set((state) => ({
        entries: state.entries.filter((item) => item.id !== entryId),
      })),

    clear: () =>
      set(() => ({
        ...createDefaultSpatialStoryBundleVaultManifest(),
      })),
  }));
