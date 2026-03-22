import { create } from "zustand";

export type SpatialCuratedDeck = {
  id: string;
  title: string;
  description?: string;
  starIds: string[];
};

export type SpatialCuratedDeckVaultManifest = {
  decks: SpatialCuratedDeck[];
  activeDeckId: string | null;
  isLoaded: boolean;
};

export type SpatialCuratedDeckVaultStore = SpatialCuratedDeckVaultManifest & {
  hydrate: (manifest?: Partial<SpatialCuratedDeckVaultManifest>) => void;
  reset: () => void;
  setDecks: (decks: SpatialCuratedDeck[]) => void;
  setActiveDeckId: (id: string | null) => void;
};

export function createDefaultSpatialCuratedDeckVaultManifest(): SpatialCuratedDeckVaultManifest {
  return {
    decks: [],
    activeDeckId: null,
    isLoaded: false,
  };
}

export const useSpatialCuratedDeckVaultStore = create<SpatialCuratedDeckVaultStore>((set) => ({
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
    }),

  setDecks: (decks) =>
    set({
      decks,
    }),

  setActiveDeckId: (id) =>
    set({
      activeDeckId: id,
    }),
}));
