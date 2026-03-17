"use client";

import { create } from "zustand";
import {
  createDefaultSpatialSettings,
  type SpatialSettings,
} from "@/spatial/settings/spatialSettingsTypes";

type SpatialSettingsStore = SpatialSettings & {
  hydrate: (settings: SpatialSettings) => void;
  reset: () => void;
  setReducedMotion: (value: boolean) => void;
  setShowImportExport: (value: boolean) => void;
  setTelemetryEnabled: (value: boolean) => void;
  setShowTelemetryPanel: (value: boolean) => void;
  setPersistSnapshots: (value: boolean) => void;
};

export const useSpatialSettingsStore = create<SpatialSettingsStore>((set) => ({
  ...createDefaultSpatialSettings(),
  hydrate: (settings) =>
    set({
      ...createDefaultSpatialSettings(),
      ...settings,
      schema: "urai.spatial.settings.v1",
    }),
  reset: () => set(createDefaultSpatialSettings()),
  setReducedMotion: (value) => set({ reducedMotion: value }),
  setShowImportExport: (value) => set({ showImportExport: value }),
  setTelemetryEnabled: (value) => set({ telemetryEnabled: value }),
  setShowTelemetryPanel: (value) => set({ showTelemetryPanel: value }),
  setPersistSnapshots: (value) => set({ persistSnapshots: value }),
}));
