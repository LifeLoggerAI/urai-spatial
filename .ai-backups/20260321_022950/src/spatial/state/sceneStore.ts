import { create } from "zustand";
import { SceneMode, SelectedStar } from "../types";

type SceneState = {
  mode: SceneMode;
  selectedStar: SelectedStar;
  hoverStarId: string | null;

  setMode: (m: SceneMode) => void;
  setSelectedStar: (s: SelectedStar) => void;
  setHoverStar: (id: string | null) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: "home",
  selectedStar: null,
  hoverStarId: null,

  setMode: (mode) => set({ mode }),
  setSelectedStar: (selectedStar) => set({ selectedStar }),
  setHoverStar: (hoverStarId) => set({ hoverStarId }),
}));
