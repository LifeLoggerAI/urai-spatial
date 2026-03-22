import { create } from "zustand";

export type SceneMode = "home" | "sky" | "lifemap" | "focus" | "replay";

type SceneState = {
  mode: SceneMode;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;
  setMode: (mode: SceneMode) => void;
  goHome: () => void;
  enterSky: () => void;
  enterLifeMap: () => void;
  focusStar: (id: string | null) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  setHoveredStarId: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;
  reset: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: "home",
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,

  setMode: (mode) => set({ mode }),
  goHome: () =>
    set({
      mode: "home",
      selectedStarId: null,
      hoveredStarId: null,
      isTransitioning: false,
    }),
  enterSky: () => set({ mode: "sky" }),
  enterLifeMap: () => set({ mode: "lifemap" }),
  focusStar: (id) =>
    set({
      mode: id ? "focus" : "lifemap",
      selectedStarId: id,
    }),
  enterReplay: () => set((state) => ({ mode: state.selectedStarId ? "replay" : "lifemap" })),
  exitReplay: () => set((state) => ({ mode: state.selectedStarId ? "focus" : "lifemap" })),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
  setTransitioning: (value) => set({ isTransitioning: value }),
  reset: () =>
    set({
      mode: "home",
      selectedStarId: null,
      hoveredStarId: null,
      isTransitioning: false,
    }),
}));
