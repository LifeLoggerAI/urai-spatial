import { create } from "zustand";
import type { Mode } from "@/lib/uraiCanon/types";

type SceneState = {
  mode: Mode;
  sceneMode: Mode;
  selectedStarId: string | null;

  setMode: (m: Mode) => void;
  setSelectedStar: (id: string | null) => void;
  clearFocusedStar: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: "HOME",
  sceneMode: "HOME",
  selectedStarId: null,

  setMode: (m) => set({ mode: m, sceneMode: m }),
  setSelectedStar: (id) => set({ selectedStarId: id }),
  clearFocusedStar: () => set({ selectedStarId: null }),
}));
