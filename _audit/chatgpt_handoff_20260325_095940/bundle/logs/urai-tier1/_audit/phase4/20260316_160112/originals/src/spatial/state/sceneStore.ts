import { create } from "zustand";
import { SPATIAL_STARS, SpatialStar } from "../../src/spatial/data/stars";

export type SceneMode = "home" | "lifemap" | "focus" | "replay";

export type SelectedStar = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  title: string;
  label: string;
  signature: string;
  chapter: string;
  timeband: string;
  description: string;
};

type SceneState = {
  mode: SceneMode;
  stars: SpatialStar[];
  selectedStarId: string | null;
  selectedStar: SelectedStar | null;
  setMode: (mode: SceneMode) => void;
  selectStar: (star: SelectedStar) => void;
  clearFocus: () => void;
  enterReplay: () => void;
  exitReplay: () => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  stars: SPATIAL_STARS,
  selectedStarId: null,
  selectedStar: null,

  setMode: (mode) => set({ mode }),

  selectStar: (star) =>
    set({
      selectedStarId: star.id,
      selectedStar: star,
      mode: "focus",
    }),

  clearFocus: () =>
    set({
      selectedStarId: null,
      selectedStar: null,
      mode: "lifemap",
    }),

  enterReplay: () => {
    const { selectedStar } = get();
    if (!selectedStar) return;
    set({ mode: "replay" });
  },

  exitReplay: () => {
    const { selectedStar } = get();
    set({ mode: selectedStar ? "focus" : "lifemap" });
  },
}));
