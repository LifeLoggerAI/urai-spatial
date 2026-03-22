import { create } from "zustand";

export type SceneMode = "home" | "sky" | "lifemap" | "focus" | "replay";

export type SceneState = {
  mode: SceneMode;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;
  setMode: (mode: SceneMode) => void;
  goHome: () => void;
  returnHome: () => void;
  enterSky: () => void;
  enterLifeMap: () => void;
  focusStar: (id: string | null) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  setHoveredStarId: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;
  reset: () => void;
};

const homeState = {
  mode: "home" as SceneMode,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
};

export const useSceneStore = create<SceneState>((set, get) => ({
  ...homeState,

  setMode: (mode) => set({ mode }),

  goHome: () => set({ ...homeState }),
  returnHome: () => set({ ...homeState }),

  enterSky: () => set({ mode: "sky" }),

  enterLifeMap: () => set({ mode: "lifemap" }),

  focusStar: (id) =>
    set({
      mode: id ? "focus" : "lifemap",
      selectedStarId: id,
    }),

  enterReplay: () => {
    const state = get();
    set({ mode: state.selectedStarId ? "replay" : "lifemap" });
  },

  exitReplay: () => {
    const state = get();
    set({ mode: state.selectedStarId ? "focus" : "lifemap" });
  },

  setHoveredStarId: (id) => set({ hoveredStarId: id }),

  setTransitioning: (value) => set({ isTransitioning: value }),

  reset: () => set({ ...homeState }),
}));
