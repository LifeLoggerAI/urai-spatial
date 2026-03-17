"use client";

import { create } from "zustand";

type XrSessionStore = {
  isPresenting: boolean;
  hasHeadsetPose: boolean;
  setPresenting: (value: boolean) => void;
  setHasHeadsetPose: (value: boolean) => void;
  reset: () => void;
};

export const useXrSessionStore = create<XrSessionStore>((set) => ({
  isPresenting: false,
  hasHeadsetPose: false,
  setPresenting: (value) => set({ isPresenting: value }),
  setHasHeadsetPose: (value) => set({ hasHeadsetPose: value }),
  reset: () => set({ isPresenting: false, hasHeadsetPose: false }),
}));
