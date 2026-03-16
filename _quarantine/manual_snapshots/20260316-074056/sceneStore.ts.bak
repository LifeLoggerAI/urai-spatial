import { create } from "zustand";

export type SceneMode = "home" | "lifemap" | "focus";

export type SelectedStar = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
} | null;

type SceneState = {
  mode: SceneMode;
  selectedStar: SelectedStar;
  setMode: (mode: SceneMode) => void;
  setSelectedStar: (star: SelectedStar) => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: "home",
  selectedStar: null,
  setMode: (mode) => set({ mode }),
  setSelectedStar: (star) => set({ selectedStar: star }),
}));
