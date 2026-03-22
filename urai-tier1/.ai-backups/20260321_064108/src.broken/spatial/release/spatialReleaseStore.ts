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
    set({
      ...createDefaultSpatialReleaseManifest(),
      ...manifest,
      schema: "urai.spatial.release.v1",
    }),
  setActiveChannel: (channel) =>
    set({
      activeChannel: channel,
      lastPromotedAt: new Date().toISOString(),
    }),
  appendRollbackPoint: (point) =>
    set((state) => ({
      rollbackPoints: [...state.rollbackPoints, point].slice(-12),
    })),
  replaceManifest: (manifest) =>
    set({
      ...createDefaultSpatialReleaseManifest(),
      ...manifest,
      schema: "urai.spatial.release.v1",
    }),
  reset: () => set(createDefaultSpatialReleaseManifest()),
}));
