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

type TransitionAction =
  | "START_ASCENT"
  | "COMPLETE_ASCENT"
  | "OPEN_FOCUS"
  | "OPEN_REPLAY"
  | "ESC";

type TransitionContext = {
  inputLocked?: boolean;
  starId?: string | null;
};

export type HomeSubstate = "home_idle" | "home_orb_focus" | "home_confirm_enter";

export type SceneState = {
  phase: ScenePhase;
  mode: SceneMode;
  homeSubstate: HomeSubstate;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;
  inputLocked: boolean;

  canTransition: (action: TransitionAction, context?: TransitionContext) => boolean;
  applyTransition: (action: TransitionAction, context?: TransitionContext) => boolean;

  hoverStar: (id: string | null) => void;
  selectStar: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;

  setMode: (mode: SceneMode) => void;
  setPhase: (phase: ScenePhase) => void;
  goHome: () => void;
  returnHome: () => void;
  enterHome: () => void;
  enterLifemap: () => void;
  enterLifeMap: () => void;
  setHomeSubstate: (substate: HomeSubstate) => void;
  focusHomeOrb: () => void;
  confirmHomeEntry: () => void;
  focusStar: (id: string | null) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  esc: () => void;
  advance: () => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
};

const HOME_STATE = {
  phase: "HOME" as ScenePhase,
  mode: "home" as SceneMode,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
  inputLocked: false,
  homeSubstate: "home_idle" as HomeSubstate,
};

const setPhaseState = (phase: ScenePhase): Pick<SceneState, "phase" | "mode" | "homeSubstate"> => ({
  phase,
  mode: PHASE_TO_MODE[phase],
  homeSubstate: phase === "HOME" ? "home_idle" : "home_confirm_enter",
});

function canTransition(
  state: Pick<SceneState, "phase" | "mode" | "selectedStarId">,
  action: TransitionAction,
  context?: TransitionContext
): boolean {
  const locked = context?.inputLocked ?? false;

  switch (action) {
    case "START_ASCENT":
      return state.phase === "HOME" && !locked;

    case "COMPLETE_ASCENT":
      return state.phase === "ASCENT";

    case "OPEN_FOCUS":
      return state.phase === "LIFEMAP" && !!context?.starId && !locked;

    case "OPEN_REPLAY":
      return state.phase === "FOCUS" && !!state.selectedStarId && !locked;

    case "ESC":
      return state.phase === "REPLAY" || state.phase === "FOCUS" || state.phase === "LIFEMAP" || state.phase === "ASCENT";

    default:
      return false;
  }
}

export const useSceneStore = create<SceneState>((set, get) => ({
  ...HOME_STATE,

  canTransition: (action, context) => canTransition(get(), action, context),

  applyTransition: (action, context) => {
    const state = get();

    if (!canTransition(state, action, context)) return false;

    switch (action) {
      case "START_ASCENT":
        set({
          ...setPhaseState("ASCENT"),
          isTransitioning: true,
          inputLocked: true,
        });
        return true;

      case "COMPLETE_ASCENT":
        set({
          ...setPhaseState("LIFEMAP"),
          isTransitioning: false,
          inputLocked: false,
        });
        return true;

      case "OPEN_FOCUS":
        set({
          ...setPhaseState("FOCUS"),
          selectedStarId: context?.starId ?? null,
          isTransitioning: false,
          inputLocked: false,
        });
        return true;

      case "OPEN_REPLAY":
        set({
          ...setPhaseState("REPLAY"),
          isTransitioning: true,
          inputLocked: true,
        });
        return true;

      case "ESC": {
        const next = LEGAL_ESC[state.phase];

        if (!next) return false;

        set({
          ...setPhaseState(next),
          selectedStarId: next === "HOME" ? null : state.selectedStarId,
          isTransitioning: false,
          inputLocked: false,
        });

        return true;
      }

      default:
        return false;
    }
  },

  hoverStar: (id) => set({ hoveredStarId: id }),
  selectStar: (id) => set({ selectedStarId: id }),
  setTransitioning: (value) => set({ isTransitioning: value }),

  setMode: (mode) => set(setPhaseState(MODE_TO_PHASE[mode])),
  setPhase: (phase) => set(setPhaseState(phase)),

  goHome: () => set({ ...HOME_STATE }),
  returnHome: () => set({ ...HOME_STATE }),
  enterHome: () => set({ ...HOME_STATE }),

  enterLifemap: () =>
    set({
      ...setPhaseState("LIFEMAP"),
      isTransitioning: false,
      inputLocked: false,
      homeSubstate: "home_confirm_enter",
    }),

  enterLifeMap: () =>
    set({
      ...setPhaseState("LIFEMAP"),
      isTransitioning: false,
      inputLocked: false,
      homeSubstate: "home_confirm_enter",
    }),


  setHomeSubstate: (substate) =>
    set((state) => (state.phase === "HOME" ? { homeSubstate: substate } : state)),

  focusHomeOrb: () =>
    set((state) =>
      state.phase === "HOME"
        ? { homeSubstate: "home_orb_focus", isTransitioning: false, inputLocked: false }
        : state
    ),

  confirmHomeEntry: () =>
    set((state) =>
      state.phase === "HOME"
        ? { homeSubstate: "home_confirm_enter", isTransitioning: true, inputLocked: false }
        : state
    ),

  focusStar: (id) =>
    set({
      ...setPhaseState(id ? "FOCUS" : "LIFEMAP"),
      selectedStarId: id,
      isTransitioning: false,
      inputLocked: false,
    }),

  enterReplay: () => {
    const { selectedStarId, phase } = get();
    if (phase !== "FOCUS" || !selectedStarId) return;

    set({
      ...setPhaseState("REPLAY"),
      isTransitioning: true,
      inputLocked: true,
    });
  },

  exitReplay: () =>
    set({
      ...setPhaseState("FOCUS"),
      isTransitioning: false,
      inputLocked: false,
    }),

  esc: () =>
    set((state) => {
      const next = LEGAL_ESC[state.phase];
      if (!next) return state;

      return {
        ...setPhaseState(next),
        inputLocked: false,
        isTransitioning: false,
        selectedStarId: next === "HOME" ? null : state.selectedStarId,
      };
    }),

  advance: () =>
    set((state) => {
      const next = LEGAL_FORWARD[state.phase];
      if (!next) return state;

      return {
        ...setPhaseState(next),
        inputLocked: next === "ASCENT",
        isTransitioning: next === "ASCENT",
      };
    }),

  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
}));