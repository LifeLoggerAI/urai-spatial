import { create } from "zustand";

export type SpatialAccountManifest = {
  userId: string | null;
  displayName: string;
  email: string | null;
  tier: "free" | "pro" | "admin";
  isLoaded: boolean;
};

export type SpatialAccountStore = SpatialAccountManifest & {
  hydrate: (manifest: Partial<SpatialAccountManifest>) => void;
  reset: () => void;
};

export function createDefaultSpatialAccountManifest(): SpatialAccountManifest {
  return {
    userId: null,
    displayName: "Guest",
    email: null,
    tier: "free",
    isLoaded: false,
  };
}

export const useSpatialAccountStore = create<SpatialAccountStore>((set) => ({
  ...createDefaultSpatialAccountManifest(),

  hydrate: (manifest) =>
    set((state) => ({
      ...state,
      ...manifest,
      isLoaded: true,
    })),

  reset: () =>
    set(() => ({
      ...createDefaultSpatialAccountManifest(),
    })),
}));
