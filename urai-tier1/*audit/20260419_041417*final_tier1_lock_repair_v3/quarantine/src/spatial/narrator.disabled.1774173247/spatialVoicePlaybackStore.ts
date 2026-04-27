"use client";

import { create } from "zustand";
import {
  createDefaultSpatialVoicePlaybackState,
  type SpatialVoicePlaybackState,
  type SpatialVoicePlaybackStatus,
} from "@/spatial/narrator/spatialVoicePlaybackTypes";

type SpatialVoicePlaybackStore = SpatialVoicePlaybackState & {
  setStatus: (status: SpatialVoicePlaybackStatus) => void;
  setVoiceURI: (voiceURI: string | null) => void;
  setRate: (rate: number) => void;
  setPitch: (pitch: number) => void;
  setVolume: (volume: number) => void;
  setAvailableVoiceCount: (count: number) => void;
  setLastError: (message: string | null) => void;
  reset: () => void;
};

export const useSpatialVoicePlaybackStore = create<SpatialVoicePlaybackStore>((set) => ({
  ...createDefaultSpatialVoicePlaybackState(),
  setStatus: (status) =>
    set(() => ({
      status,
    })),
  setVoiceURI: (voiceURI) =>
    set(() => ({
      voiceURI,
    })),
  setRate: (rate) =>
    set(() => ({
      rate,
    })),
  setPitch: (pitch) =>
    set(() => ({
      pitch,
    })),
  setVolume: (volume) =>
    set(() => ({
      volume,
    })),
  setAvailableVoiceCount: (count) =>
    set(() => ({
      availableVoiceCount: count,
    })),
  setLastError: (message) =>
    set(() => ({
      lastError: message,
    })),
  reset: () =>
    set(() => ({
      ...createDefaultSpatialVoicePlaybackState(),
    })),
}));
