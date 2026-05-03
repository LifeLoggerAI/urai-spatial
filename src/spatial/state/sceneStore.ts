import { create } from "zustand";

export type SceneMode = import("../types").SceneMode;

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
  mode: SceneMode;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;

  canTransition: (action: TransitionAction, context?: TransitionContext) => boolean;
  applyTransition: (action: TransitionAction, context?: TransitionContext) => boolean;

  hoverStar: (id: string | null) => void;
  selectStar: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;

  setMode: (mode: SceneMode) => void;
  goHome: () => void;
  returnHome: () => void;
  enterHome: () => void;
  enterLifemap: () => void;
  enterLifeMap: () => void;
  focusStar: (id: string | null) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
};

const HOME_STATE = {
  mode: "home" as SceneMode,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
};

function canTransition(
  state: Pick<SceneState, "mode" | "selectedStarId">,
  action: TransitionAction,
  context?: TransitionContext
): boolean {
  const locked = context?.inputLocked ?? false;

  switch (action) {
    case "START_ASCENT":
      return state.mode === "home" && !locked;

    case "COMPLETE_ASCENT":
      return state.mode === "ground";

    case "OPEN_FOCUS":
      return state.mode === "lifemap" && !!context?.starId && !locked;

    case "OPEN_REPLAY":
      return state.mode === "focus" && !!state.selectedStarId && !locked;

    case "ESC":
      return state.mode === "replay" || state.mode === "focus" || state.mode === "lifemap";

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
        set({ mode: "ground", isTransitioning: true });
        return true;

      case "COMPLETE_ASCENT":
        set({ mode: "lifemap", isTransitioning: false });
        return true;

      case "OPEN_FOCUS":
        set({
          mode: "focus",
          selectedStarId: context?.starId ?? null,
          isTransitioning: false,
        });
        return true;

      case "OPEN_REPLAY":
        set({ mode: "replay", isTransitioning: true });
        return true;

      case "ESC":
        if (state.mode === "replay") {
          set({ mode: "focus", isTransitioning: false });
        } else if (state.mode === "focus") {
          set({ mode: "lifemap", isTransitioning: false });
        } else {
          set({ ...HOME_STATE });
        }

        return true;

      default:
        return false;
    }
  },

  hoverStar: (id) => set({ hoveredStarId: id }),
  selectStar: (id) => set({ selectedStarId: id }),
  setTransitioning: (value) => set({ isTransitioning: value }),

  setMode: (mode) => set({ mode }),
  goHome: () => set({ ...HOME_STATE }),
  returnHome: () => set({ ...HOME_STATE }),
  enterHome: () => set({ mode: "home" }),

  enterLifemap: () => set({ mode: "lifemap", isTransitioning: false }),
  enterLifeMap: () => set({ mode: "lifemap", isTransitioning: false }),

  focusStar: (id) =>
    set({
      mode: id ? "focus" : "lifemap",
      selectedStarId: id,
      isTransitioning: false,
    }),

  enterReplay: () => set({ mode: "replay", isTransitioning: true }),
  exitReplay: () => set({ mode: "focus", isTransitioning: false }),

  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
}));