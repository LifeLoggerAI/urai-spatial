import { create } from "zustand";

type XrSessionState = {
  presenting: boolean;
  hasHeadsetPose: boolean;
  setPresenting: (value: boolean) => void;
  setHasHeadsetPose: (value: boolean) => void;
  reset: () => void;
};

export const useXrSessionStore = create<XrSessionState>((set) => ({
  presenting: false,
  hasHeadsetPose: false,
  setPresenting: (value) => set(() => ({ presenting: value })),
  setHasHeadsetPose: (value) => set(() => ({ hasHeadsetPose: value })),
  reset: () =>
    set(() => ({
      presenting: false,
      hasHeadsetPose: false,
    })),
}));
