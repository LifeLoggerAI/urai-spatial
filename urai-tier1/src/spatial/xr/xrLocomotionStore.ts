"use client";

import { create } from "zustand";
import {
  createEmptyXrLocomotionState,
  type XrLocomotionState,
} from "@/spatial/xr/xrLocomotionTypes";

type XrLocomotionStore = {
  pose: XrLocomotionState;
  setPose: (pose: XrLocomotionState) => void;
  reset: () => void;
};

export const useXrLocomotionStore = create<XrLocomotionStore>((set) => ({
  pose: createEmptyXrLocomotionState(),
  setPose: (pose) => set({ pose }),
  reset: () => set({ pose: createEmptyXrLocomotionState() }),
}));
