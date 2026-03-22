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
    set(() => ({
      ...settings,
    })),
  replaceSettings: (settings) =>
    set((state) => ({
      ...state,
      ...settings,
    })),
  setMotionEnabled: (motionEnabled) =>
    set((state) => ({
      ...state,
      motionEnabled,
    })),
  setBloomEnabled: (bloomEnabled) =>
    set((state) => ({
      ...state,
      bloomEnabled,
    })),
  setDofEnabled: (dofEnabled) =>
    set((state) => ({
      ...state,
      dofEnabled,
    })),
  setAudioReactiveEnabled: (audioReactiveEnabled) =>
    set((state) => ({
      ...state,
      audioReactiveEnabled,
    })),
  setQualityPreset: (qualityPreset) =>
    set((state) => ({
      ...state,
      qualityPreset,
    })),
  setReducedMotion: (value) =>
    set((state) => ({
      ...state,
      reducedMotion: value,
    })),
  setShowImportExport: (value) =>
    set((state) => ({
      ...state,
      showImportExport: value,
    })),
  setTelemetryEnabled: (value) =>
    set((state) => ({
      ...state,
      telemetryEnabled: value,
    })),
  setShowTelemetryPanel: (value) =>
    set((state) => ({
      ...state,
      showTelemetryPanel: value,
    })),
  setPersistSnapshots: (value) =>
    set((state) => ({
      ...state,
      persistSnapshots: value,
    })),
  reset: () =>
    set(() => ({
      ...createDefaultSpatialSettings(),
    })),
}));
