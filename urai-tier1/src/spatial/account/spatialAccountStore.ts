import { create } from "zustand";

export type SpatialAccountProfile = {
  id: string;
  displayName: string;
  email: string | null;
  tier: "free" | "pro" | "admin";
};

export type SpatialAccountManifest = {
  userId: string | null;
  displayName: string;
  email: string | null;
  tier: "free" | "pro" | "admin";
  isLoaded: boolean;
  activeAccountId: string | null;
  profiles: SpatialAccountProfile[];
};

export type SpatialAccountStore = SpatialAccountManifest & {
  hydrate: (manifest?: Partial<SpatialAccountManifest>) => void;
  reset: () => void;
  setActiveAccountId: (id: string | null) => void;
  setProfiles: (profiles: SpatialAccountProfile[]) => void;
};

export function createDefaultSpatialAccountManifest(): SpatialAccountManifest {
  return {
    userId: null,
    displayName: "Guest",
    email: null,
    tier: "free",
    isLoaded: false,
    activeAccountId: null,
    profiles: [],
  };
}

export const useSpatialAccountStore = create<SpatialAccountStore>((set) => ({
  ...createDefaultSpatialAccountManifest(),

  hydrate: (manifest = {}) =>
    set((state) => ({
      ...state,
      ...manifest,
      isLoaded: true,
    })),

  reset: () =>
    set({
      ...createDefaultSpatialAccountManifest(),
    }),

  setActiveAccountId: (id) =>
    set({
      activeAccountId: id,
    }),

  setProfiles: (profiles) =>
    set({
      profiles,
    }),
}));
