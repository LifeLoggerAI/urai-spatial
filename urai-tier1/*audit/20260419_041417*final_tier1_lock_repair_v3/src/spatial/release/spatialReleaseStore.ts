"use client";

import { create } from "zustand";
import {
  createDefaultSpatialReleaseManifest,
  type SpatialReleaseChannel,
  type SpatialReleaseManifest,
  type SpatialRollbackPoint,
} from "@/spatial/release/spatialReleaseTypes";

type SpatialReleaseStore = SpatialReleaseManifest & {
  hydrate: (manifest: SpatialReleaseManifest) => void;
  setActiveChannel: (channel: SpatialReleaseChannel) => void;
  appendRollbackPoint: (point: SpatialRollbackPoint) => void;
  replaceManifest: (manifest: SpatialReleaseManifest) => void;
  reset: () => void;
};

export const useSpatialReleaseStore = create<SpatialReleaseStore>((set) => ({
  ...createDefaultSpatialReleaseManifest(),
  hydrate: (manifest) =>
    set(() => ({
      ...manifest,
    })),
  replaceManifest: (manifest) =>
    set(() => ({
      ...manifest,
    })),
  setActiveChannel: (channel) =>
    set((state) => ({
      ...state,
      activeChannel: channel,
    })),
  appendRollbackPoint: (point) =>
    set((state) => ({
      ...state,
      rollbackPoints: [...state.rollbackPoints, point],
    })),
  setRollbackPoints: (rollbackPoints) =>
    set((state) => ({
      ...state,
      rollbackPoints,
    })),
  reset: () =>
    set(() => ({
      ...createDefaultSpatialReleaseManifest(),
    })),
}));
