import { create } from "zustand";

export type SpatialCuratedDeckEntry = {
  id: string;
  title: string;
  description?: string;
  starIds: string[];
};

export type SpatialCuratedDeckVaultManifest = {
  entries: SpatialCuratedDeckEntry[];
  activeEntryId: string | null;
  isLoaded: boolean;
};

export type SpatialCuratedDeckVaultStore = SpatialCuratedDeckVaultManifest & {
  hydrate: (manifest?: Partial<SpatialCuratedDeckVaultManifest>) => void;
  reset: () => void;
  setEntries: (entries: SpatialCuratedDeckEntry[]) => void;
  setActiveEntryId: (id: string | null) => void;
};

export function createDefaultSpatialCuratedDeckVaultManifest(): SpatialCuratedDeckVaultManifest {
  return {
    entries: [],
    activeEntryId: null,
    isLoaded: false,
  };
}

export const useSpatialCuratedDeckVaultStore =
  create<SpatialCuratedDeckVaultStore>((set) => ({
    ...createDefaultSpatialCuratedDeckVaultManifest(),

    hydrate: (manifest = {}) =>
      set((state) => ({
        ...state,
        ...manifest,
        isLoaded: true,
      })),

    reset: () =>
      set({
        ...createDefaultSpatialCuratedDeckVaultManifest(),
      })

    setEntries: (entries) =>
      set({
        entries,
      })

    setActiveEntryId: (id) =>
      set({
        activeEntryId: id,
      })
  }));
