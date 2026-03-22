"use client";

import { create } from "zustand";
import {
  createEmptyArPlacementPose,
  type ArPlacementPose,
} from "@/spatial/xr/arPlacementTypes";

type ArPlacementStore = {
  pose: ArPlacementPose;
  setPose: (pose: ArPlacementPose) => void;
  reset: () => void;
};

export const useArPlacementStore = create<ArPlacementStore>((set) => ({
  pose: createEmptyArPlacementPose(),
  setPose: (pose) => set(() => ({ pose }))},
  reset: () => set(() => ({ pose: createEmptyArPlacementPose() }))},
}))});
