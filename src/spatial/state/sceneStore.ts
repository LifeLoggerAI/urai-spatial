import { create } from "zustand";

export type ScenePhase = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY";
export type SceneMode = Lowercase<ScenePhase>;
export type AvatarState = "idle" | "lookAtOrb" | "transitioning";

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

export type SceneState = {
  phase: ScenePhase;
  mode: SceneMode;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;
  inputLocked: boolean;
  avatarState: AvatarState;

  canTransition: (action: TransitionAction, context?: TransitionContext) => boolean;
  applyTransition: (action: TransitionAction, context?: TransitionContext) => boolean;

  hoverStar: (id: string | null) => void;
  selectStar: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;
  setAvatarState: (value: AvatarState) => void;

  setMode: (mode: SceneMode) => void;
  setPhase: (phase: ScenePhase) => void;
  goHome: () => void;
  returnHome: () => void;
  enterHome: () => void;
  enterLifemap: () => void;
  enterLifeMap: () => void;
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
  avatarState: "idle" as AvatarState,
};

const setPhaseState = (phase: ScenePhase) => ({
  phase,
  mode: PHASE_TO_MODE[phase],
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
          avatarState: "transitioning",
        });
        return true;

      case "COMPLETE_ASCENT":
        set({
          ...setPhaseState("LIFEMAP"),
          isTransitioning: false,
          inputLocked: false,
          avatarState: "idle",
        });
        return true;

      case "OPEN_FOCUS":
        set({
          ...setPhaseState("FOCUS"),
          selectedStarId: context?.starId ?? null,
          isTransitioning: false,
          inputLocked: false,
          avatarState: "idle",
        });
        return true;

      case "OPEN_REPLAY":
        set({
          ...setPhaseState("REPLAY"),
          isTransitioning: true,
          inputLocked: true,
          avatarState: "transitioning",
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
          avatarState: next === "HOME" ? "idle" : state.avatarState,
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
  setAvatarState: (value) => set({ avatarState: value }),

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
      avatarState: "idle",
    }),

  enterLifeMap: () =>
    set({
      ...setPhaseState("LIFEMAP"),
      isTransitioning: false,
      inputLocked: false,
      avatarState: "idle",
    }),

  focusStar: (id) =>
    set({
      ...setPhaseState(id ? "FOCUS" : "LIFEMAP"),
      selectedStarId: id,
      isTransitioning: false,
      inputLocked: false,
      avatarState: "idle",
    }),

  enterReplay: () => {
    const { selectedStarId, phase } = get();
    if (phase !== "FOCUS" || !selectedStarId) return;

    set({
      ...setPhaseState("REPLAY"),
      isTransitioning: true,
      inputLocked: true,
      avatarState: "transitioning",
    });
  },

  exitReplay: () =>
    set({
      ...setPhaseState("FOCUS"),
      isTransitioning: false,
      inputLocked: false,
      avatarState: "idle",
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
        avatarState: next === "HOME" ? "idle" : state.avatarState,
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
        avatarState: next === "ASCENT" ? "transitioning" : "idle",
      };
    }),

  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
}));

export const selectAvatarState = (state: SceneState) => state.avatarState;
export const selectIsAvatarTransitioning = (state: SceneState) => state.avatarState === "transitioning";
