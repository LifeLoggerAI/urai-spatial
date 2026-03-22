"use client";

import { create } from "zustand";
import {
  createDefaultSpatialAccountManifest,
  type SpatialAccountManifest,
  type SpatialAccountProfile,
} from "@/spatial/account/spatialAccountTypes";

type SpatialAccountStore = SpatialAccountManifest & {
  hydrate: (manifest: SpatialAccountManifest) => void;
  replaceManifest: (manifest: SpatialAccountManifest) => void;
  setActiveAccountId: (accountId: string) => void;
  addProfile: (profile: SpatialAccountProfile) => void;
  removeProfile: (accountId: string) => void;
  reset: () => void;
};

export const useSpatialAccountStore = create<SpatialAccountStore>((set) => ({
  ...createDefaultSpatialAccountManifest(),
  hydrate: (manifest) =>
    set({
      ...createDefaultSpatialAccountManifest(),
      ...manifest,
      schema: "urai.spatial.account.v1",
    }),
  replaceManifest: (manifest) =>
    set({
      ...createDefaultSpatialAccountManifest(),
      ...manifest,
      schema: "urai.spatial.account.v1",
    }),
  setActiveAccountId: (accountId) => set({ activeAccountId: accountId }),
  addProfile: (profile) =>
    set((state) => ({
      profiles: [...state.profiles, profile],
      activeAccountId: profile.id,
    })),
  removeProfile: (accountId) =>
    set((state) => {
      const profiles = state.profiles.filter((item) => item.id !== accountId);
      const safeProfiles =
        profiles.length > 0
          ? profiles
          : createDefaultSpatialAccountManifest().profiles;

      const activeAccountId = safeProfiles.some((item) => item.id === state.activeAccountId)
        ? state.activeAccountId
        : safeProfiles[0].id;

      return {
        profiles: safeProfiles,
        activeAccountId,
      };
    }),
  reset: () => set(createDefaultSpatialAccountManifest()),
}));
