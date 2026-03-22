"use client";

import { create } from "zustand";

export type XrControllerSnapshot = {
  connected: boolean;
  profile: string | null;
  selecting: boolean;
  squeezing: boolean;
  hasGamepad: boolean;
};

export type XrHandSnapshot = {
  connected: boolean;
  tracking: boolean;
  pinching: boolean;
  jointsTracked: number;
  trackingState: "idle" | "tracked";
};

export type XrInputSnapshot = {
  controllers: {
    left: XrControllerSnapshot;
    right: XrControllerSnapshot;
  };
  hands: {
    left: XrHandSnapshot;
    right: XrHandSnapshot;
  };
  handedness: string | null;
  trackingState: "idle" | "tracking" | "lost";
  pointerActive: boolean;
  squeezeActive: boolean;
  selectActive: boolean;
};

export type XrHeadsetSnapshot = {
  connected: boolean;
  name: string | null;
  sessionMode: string;
  refreshRate: number | null;
};

export type XrArPlacementSnapshot = {
  enabled: boolean;
  placed: boolean;
  planeTracked: boolean;
  anchors: number;
};

export type XrLocomotionSnapshot = {
  mode: string;
  speed: number;
  turnStyle: string;
};

export type XrMetricsSnapshot = {
  fps: number | null;
  frameTimeMs: number | null;
};

export type XrState = {
  presenting: boolean;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
  headset: XrHeadsetSnapshot;
  arPlacement: XrArPlacementSnapshot;
  locomotion: XrLocomotionSnapshot;
  metrics: XrMetricsSnapshot;
  setPartial: (patch: Partial<XrState>) => void;
  reset: () => void;
};

export const defaultXrState: Omit<XrState, "setPartial" | "reset"> = {
  presenting: false,
  hasHeadsetPose: false,
  xrInput: {
    controllers: {
      left: {
        connected: false,
        profile: null,
        selecting: false,
        squeezing: false,
        hasGamepad: false,
      },
      right: {
        connected: false,
        profile: null,
        selecting: false,
        squeezing: false,
        hasGamepad: false,
      },
    },
    hands: {
      left: {
        connected: false,
        tracking: false,
        pinching: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
      right: {
        connected: false,
        tracking: false,
        pinching: false,
        jointsTracked: 0,
        trackingState: "idle",
      },
    },
    handedness: null,
    trackingState: "idle",
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
  headset: {
    connected: false,
    name: null,
    sessionMode: "inline",
    refreshRate: null,
  },
  arPlacement: {
    enabled: false,
    placed: false,
    planeTracked: false,
    anchors: 0,
  },
  locomotion: {
    mode: "none",
    speed: 0,
    turnStyle: "snap",
  },
  metrics: {
    fps: null,
    frameTimeMs: null,
  },
};

export const useXrStore = create<XrState>((set) => ({
  ...defaultXrState,
  setPartial: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () => set({ ...defaultXrState }),
}));

export default useXrStore;
