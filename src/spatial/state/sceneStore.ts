import { create } from "zustand";

export type SceneMode = import("../types").SceneMode;

export type SceneState = {
  mode: SceneMode;
  selectedStarId: string | null;
  selectedStar: string | null;
  hoveredStarId: string | null;
  hoveredStar: string | null;
  hoverStar: (id: string | null) => void;
  selectStar: (id: string | null) => void;
  enterLifemap: () => void;
  isTransitioning: boolean;
  setMode: (mode: SceneMode) => void;
  goHome: () => void;
  returnHome: () => void;
  enterHome: () => void;
  enterLifeMap: () => void;
  focusStar: (id: string | null) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  setSelectedStarId: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;
};

const HOME_STATE = {
  mode: "home" as SceneMode,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
};

export const useSceneStore = create<SceneState>((set, get) => ({
  ...HOME_STATE,

  setMode: (mode) => set({ mode }),
  goHome: () => set({ ...HOME_STATE }),
  returnHome: () => set({ ...HOME_STATE }),

  enterHome: () => set({ mode: "home" }),
  enterLifeMap: () => set({ mode: "lifemap" }),

  focusStar: (id) =>
    set({
      mode: id ? "focus" : "lifemap",
      selectedStarId: id,
    }),

  enterReplay: () => {
    const { selectedStarId } = get();
    set({ mode: selectedStarId ? "replay" : "lifemap" });
  },

  exitReplay: () => {
    const { selectedStarId } = get();
    set({ mode: selectedStarId ? "focus" : "lifemap" });
  },

  setSelectedStarId: (id) => set({ selectedStarId: id }),
  setHoveredStarId: (id) => set({ hoveredStarId: id }),
  get selectedStar() { return get().selectedStarId; },
  get hoveredStar() { return get().hoveredStarId; },
  hoverStar: (id: string | null) => set({ hoveredStarId: id }),
  selectStar: (id: string | null) => set({ selectedStarId: id }),
  enterLifemap: () => get().enterLifeMap(),
  setTransitioning: (value) => set({ isTransitioning: value }),
}));
