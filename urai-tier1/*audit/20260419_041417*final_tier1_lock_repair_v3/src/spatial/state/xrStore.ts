import { create } from "zustand";

export type XrInputSnapshot = {
  handedness: "left" | "right" | "none" | null;
  squeezeActive: boolean;
  selectActive: boolean;
};

export type XrState = {
  supported: boolean;
  available: boolean;
  presenting: boolean;
  sessionMode: "inline" | "immersive-vr" | "immersive-ar" | null;
  referenceSpaceType:
    | "viewer"
    | "local"
    | "local-floor"
    | "bounded-floor"
    | "unbounded"
    | null;
  hasHeadsetPose: boolean;
  xrInput: XrInputSnapshot;
  setPartial: (patch: Partial<XrState>) => void;
  reset: () => void;
};

const defaultXrState = {
  supported: false,
  available: false,
  presenting: false,
  sessionMode: null,
  referenceSpaceType: null,
  hasHeadsetPose: false,
  xrInput: {
    handedness: null,
    squeezeActive: false,
    selectActive: false,
  },
} satisfies Omit<XrState, "setPartial" | "reset">;

export const useXrStore = create<XrState>((set) => ({
  ...defaultXrState,
  setPartial: (patch) => set((state) => ({ ...state, ...patch })),
  reset: () => set(() => ({ ...defaultXrState })),
}));

export default useXrStore;
