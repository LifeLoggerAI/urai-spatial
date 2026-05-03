import { create } from "zustand";

export type ScenePhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type SceneMode = Lowercase<ScenePhase>;

const PHASE_TO_MODE: Record<ScenePhase, SceneMode> = {
  HOME: "home",
  ASCENT: "ascent",
  LIFEMAP: "lifemap",
  FOCUS: "focus",
  REPLAY: "replay",
};

const MODE_TO_PHASE: Record<SceneMode, ScenePhase> = {
  home: "HOME",
  ascent: "ASCENT",
  lifemap: "LIFEMAP",
  focus: "FOCUS",
  replay: "REPLAY",
};

const LEGAL_FORWARD: Record<ScenePhase, ScenePhase | null> = {
  HOME: "ASCENT",
  ASCENT: "LIFEMAP",
  LIFEMAP: "FOCUS",
  FOCUS: "REPLAY",
  REPLAY: null,
};

const LEGAL_ESC: Record<ScenePhase, ScenePhase | null> = {
  REPLAY: "FOCUS",
  FOCUS: "LIFEMAP",
  LIFEMAP: "HOME",
  ASCENT: "HOME",
  HOME: null,
};

export type SceneState = {
  phase: ScenePhase;
  mode: SceneMode;
  selectedStarId: string | null;
  selectedStar: string | null;
  hoveredStarId: string | null;
  hoveredStar: string | null;
  isTransitioning: boolean;
  inputLocked: boolean;
  hoverStar: (id: string | null) => void;
  selectStar: (id: string | null) => void;
  setMode: (mode: SceneMode) => void;
  setPhase: (phase: ScenePhase) => void;
  goHome: () => void;
  returnHome: () => void;
  enterSky: () => void;
  enterLifeMap: () => void;
  enterLifemap: () => void;
  focusStar: (id: string | null) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  esc: () => void;
  advance: () => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;
};

const HOME_STATE = {
  phase: "HOME" as ScenePhase,
  mode: "home" as SceneMode,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
  inputLocked: false,
};

const setPhaseState = (phase: ScenePhase) => ({ phase, mode: PHASE_TO_MODE[phase] });

/**
 * Single source of truth for spatial scene state.
 * - `phase` is canonical and must follow legal transitions: HOME -> ASCENT -> LIFEMAP -> FOCUS -> REPLAY.
 * - `mode` is a normalized lowercase projection for legacy consumers and persistence payloads.
 * - Escape unwind is strictly REPLAY -> FOCUS -> LIFEMAP -> HOME.
 */
export const useSceneStore = create<SceneState>((set, get) => ({
  ...HOME_STATE,

  setMode: (mode) => set(setPhaseState(MODE_TO_PHASE[mode])),
  setPhase: (phase) => set(setPhaseState(phase)),

  goHome: () => set({ ...HOME_STATE }),
  returnHome: () => set({ ...HOME_STATE }),

  enterSky: () => set({ ...setPhaseState("HOME") }),

  enterLifeMap: () =>
    set((state) => {
      if (state.phase === "HOME") return { ...setPhaseState("ASCENT"), inputLocked: true };
      if (state.phase === "ASCENT") return { ...setPhaseState("LIFEMAP"), inputLocked: false };
      return state;
    }),

  focusStar: (id) =>
    set((state) => {
      if (!id) return { ...setPhaseState("LIFEMAP"), selectedStarId: null };
      if (state.phase !== "LIFEMAP") return state;
      return { ...setPhaseState("FOCUS"), selectedStarId: id };
    }),

  enterReplay: () => {
    const { selectedStarId, phase } = get();
    if (phase !== "FOCUS") return;
    set({ ...setPhaseState(selectedStarId ? "REPLAY" : "LIFEMAP"), inputLocked: !!selectedStarId });
  },

  exitReplay: () => {
    const { selectedStarId } = get();
    set({ ...setPhaseState(selectedStarId ? "FOCUS" : "LIFEMAP"), inputLocked: false });
  },

  esc: () =>
    set((state) => {
      const next = LEGAL_ESC[state.phase];
      if (!next) return state;
      return {
        ...setPhaseState(next),
        inputLocked: false,
        selectedStarId: next === "HOME" ? null : state.selectedStarId,
      };
    }),

  advance: () =>
    set((state) => {
      const next = LEGAL_FORWARD[state.phase];
      if (!next) return state;
      return { ...setPhaseState(next), inputLocked: next === "ASCENT" };
    }),

  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
  get selectedStar() {
    return get().selectedStarId;
  },
  get hoveredStar() {
    return get().hoveredStarId;
  },
  hoverStar: (id: string | null) => set({ hoveredStarId: id }),
  selectStar: (id: string | null) => set({ selectedStarId: id }),
  enterLifemap: () => get().enterLifeMap(),
  setTransitioning: (value) => set({ isTransitioning: value }),
}));
