
import create from "zustand";
import { SpatialState }d from "./types";
import { rootReducer } from "./reducers";

export const useSpatialStore = create<SpatialState & { dispatch: (action: any) => void }>((set) => ({
  system: {
    version: "v1.0.0-spatial",
    mode: "dev",
    deterministic: false,
  },
  identity: {
    userId: "",
    sessionId: "",
    identityHash: "",
  },
  scene: {
    active: "home",
    transitionLock: false,
  },
  camera: {
    presetId: "home-idle",
    locked: false,
  },
  emotion: {
    primary: "calm",
    intensity: 0,
  },
  replay: {
    progress: 0,
  },
  dispatch: (action) => set((state) => rootReducer(state, action)),
}));
