import { create } from "zustand";
import type { RollbackPoint, SceneMode, XrStateSnapshot } from "../types";

type SceneState = {
  mode: SceneMode;
  selectedStar: string | null;
  selectedObject: string | null;
  hoveredStar: string | null;
  transitionPhase: "idle" | "entering" | "focused" | "replay";
  xrState: XrStateSnapshot;
  rollback: RollbackPoint[];
  goHome: () => void;
  goLifemap: () => void;
  goGround: () => void;
  enterReplay: (id: string) => void;
  exitReplay: () => void;
  selectStar: (id: string | null) => void;
  hoverStar: (id: string | null) => void;
  selectObject: (id: string | null) => void;
  returnHome: () => void;
  returnFromGround: () => void;
  returnFromLifemap: () => void;
  setPresenting: (presenting: boolean) => void;
  setXrInput: (patch: Partial<XrStateSnapshot["xrInput"]>) => void;
  appendRollbackPoint: (point: RollbackPoint) => void;
};

const defaultXr: XrStateSnapshot = {
  presenting: false,
  headsetPose: null,
  xrInput: {
    handedness: null,
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: "home",
  selectedStar: null,
  selectedObject: null,
  hoveredStar: null,
  transitionPhase: "idle",
  xrState: defaultXr,
  rollback: [],

  goHome: () =>
    set({
      mode: "home",
      selectedStar: null,
      selectedObject: null,
      hoveredStar: null,
      transitionPhase: "idle",
    }),

  goLifemap: () =>
    set((state) => ({
      mode: "lifemap",
      selectedObject: null,
      transitionPhase: state.selectedStar ? "focused" : "entering",
    })),

  goGround: () =>
    set({
      mode: "ground",
      selectedStar: null,
      selectedObject: null,
      hoveredStar: null,
      transitionPhase: "entering",
    }),

  enterReplay: (id) =>
    set({
      mode: "replay",
      selectedStar: id,
      transitionPhase: "replay",
    }),

  exitReplay: () =>
    set((state) => ({
      mode: "lifemap",
      selectedStar: state.selectedStar,
      transitionPhase: "focused",
    })),

  selectStar: (id) =>
    set((state) => ({
      selectedStar: id,
      mode: id ? "lifemap" : state.mode === "replay" ? "lifemap" : state.mode,
      transitionPhase: id ? "focused" : "idle",
    })),

  hoverStar: (id) => set({ hoveredStar: id }),

  selectObject: (id) =>
    set({
      selectedObject: id,
      mode: id ? "object" : "ground",
      transitionPhase: id ? "focused" : "idle",
    }),

  returnHome: () =>
    set({
      mode: "home",
      selectedStar: null,
      selectedObject: null,
      hoveredStar: null,
      transitionPhase: "idle",
    }),

  returnFromGround: () =>
    set({
      mode: "home",
      selectedObject: null,
      transitionPhase: "idle",
    }),

  returnFromLifemap: () =>
    set({
      mode: "home",
      selectedStar: null,
      hoveredStar: null,
      transitionPhase: "idle",
    }),

  setPresenting: (presenting) =>
    set((state) => ({
      xrState: {
        ...state.xrState,
        presenting,
      },
    })),

  setXrInput: (patch) =>
    set((state) => ({
      xrState: {
        ...state.xrState,
        xrInput: {
          ...state.xrState.xrInput,
          ...patch,
        },
      },
    })),

  appendRollbackPoint: (point) =>
    set((state) => ({
      rollback: [...state.rollback.slice(-23), point],
    })),
}));
