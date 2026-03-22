import { create } from "zustand";
import type {
  RollbackPoint,
  SceneMode,
  SpatialPersistenceSnapshot,
  TransitionPhase,
  XrState,
} from "../types";
import { STARS } from "../data/stars";

type SceneState = {
  mode: SceneMode;
  phase: TransitionPhase;
  selectedStar: string | null;
  hoveredStar: string | null;
  selectedObject: string | null;
  xrState: XrState;
  rollback: RollbackPoint[];
  homeToLifemap: () => void;
  focusStar: (id: string) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  returnHome: () => void;
  enterGround: () => void;
  focusObject: (id: string) => void;
  selectObject: (id: string | null) => void;
  returnFromObject: () => void;
  hoverStar: (id: string | null) => void;
  clearStarFocus: () => void;
  setPresenting: (presenting: boolean) => void;
  appendRollbackPoint: (point: RollbackPoint) => void;
  currentSnapshot: () => SpatialPersistenceSnapshot;
};

const defaultXr: XrState = {
  presenting: false,
  xrInput: {
    handedness: null,
    pointerActive: false,
    squeezeActive: false,
    selectActive: false,
  },
};

let lifemapTimer: ReturnType<typeof setTimeout> | null = null;
let replayTimer: ReturnType<typeof setTimeout> | null = null;
let replayExitTimer: ReturnType<typeof setTimeout> | null = null;
let homeTimer: ReturnType<typeof setTimeout> | null = null;
let groundTimer: ReturnType<typeof setTimeout> | null = null;

function clearTimers() {
  if (lifemapTimer) clearTimeout(lifemapTimer);
  if (replayTimer) clearTimeout(replayTimer);
  if (replayExitTimer) clearTimeout(replayExitTimer);
  if (homeTimer) clearTimeout(homeTimer);
  if (groundTimer) clearTimeout(groundTimer);
  lifemapTimer = null;
  replayTimer = null;
  replayExitTimer = null;
  homeTimer = null;
  groundTimer = null;
}

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  phase: "idle",
  selectedStar: null,
  hoveredStar: null,
  selectedObject: null,
  xrState: defaultXr,
  rollback: [],

  homeToLifemap: () => {
    clearTimers();
    set({
      mode: "lifemap",
      phase: "to-lifemap",
      selectedStar: null,
      selectedObject: null,
      hoveredStar: null,
    });
    lifemapTimer = setTimeout(() => {
      const state = get();
      if (state.mode === "lifemap" && state.phase === "to-lifemap") {
        set({ phase: "lifemap" });
      }
      lifemapTimer = null;
    }, 950);
  },

  focusStar: (id: string) => {
    clearTimers();
    set({
      mode: "lifemap",
      phase: "star-focus",
      selectedStar: id,
      selectedObject: null,
    });
  },

  clearStarFocus: () => {
    clearTimers();
    set({
      mode: "lifemap",
      phase: "lifemap",
      selectedStar: null,
    });
  },

  enterReplay: () => {
    if (!get().selectedStar) return;
    clearTimers();
    set({
      mode: "replay",
      phase: "to-replay",
    });
    replayTimer = setTimeout(() => {
      const state = get();
      if (state.mode === "replay" && state.phase === "to-replay") {
        set({ phase: "replay" });
      }
      replayTimer = null;
    }, 550);
  },

  exitReplay: () => {
    clearTimers();
    set({
      mode: "lifemap",
      phase: "from-replay",
    });
    replayExitTimer = setTimeout(() => {
      const state = get();
      if (state.mode === "lifemap" && state.phase === "from-replay") {
        set({ phase: state.selectedStar ? "star-focus" : "lifemap" });
      }
      replayExitTimer = null;
    }, 450);
  },

  returnHome: () => {
    const state = get();
    if (state.mode === "home") return;
    clearTimers();
    set({
      mode: state.mode === "ground" || state.mode === "object" ? "ground" : "lifemap",
      phase: "to-home",
      selectedObject: null,
    });
    homeTimer = setTimeout(() => {
      set({
        mode: "home",
        phase: "idle",
        selectedStar: null,
        hoveredStar: null,
        selectedObject: null,
      });
      homeTimer = null;
    }, 800);
  },

  enterGround: () => {
    clearTimers();
    set({
      mode: "ground",
      phase: "to-ground",
      selectedStar: null,
      hoveredStar: null,
      selectedObject: null,
    });
    groundTimer = setTimeout(() => {
      const state = get();
      if (state.mode === "ground" && state.phase === "to-ground") {
        set({ phase: "ground" });
      }
      groundTimer = null;
    }, 700);
  },

  focusObject: (id: string) => {
    clearTimers();
    set({
      mode: "object",
      phase: "object-focus",
      selectedObject: id,
    });
  },

  selectObject: (id: string | null) => {
    clearTimers();
    set({
      mode: id ? "object" : "ground",
      phase: id ? "object-focus" : "ground",
      selectedObject: id,
    });
  },

  returnFromObject: () => {
    clearTimers();
    set({
      mode: "ground",
      phase: "ground",
      selectedObject: null,
    });
  },

  hoverStar: (id: string | null) => {
    set({ hoveredStar: id });
  },

  setPresenting: (presenting: boolean) => {
    set((state) => ({
      xrState: {
        ...state.xrState,
        presenting,
      },
    }));
  },

  appendRollbackPoint: (point: RollbackPoint) => {
    set((state) => ({
      rollback: state.rollback.concat(point).slice(-50),
    }));
  },

  currentSnapshot: () => ({
    schema: "urai.spatial.persistence.v1",
    sceneMode: get().mode,
    phase: get().phase,
    selectedStarId: get().selectedStar,
    selectedObjectId: get().selectedObject,
    presenting: get().xrState.presenting,
    starCount: STARS.length,
  }),
}));
