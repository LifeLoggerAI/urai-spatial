import { create } from "zustand";

type CanonMode = "HOME" | "ASCENT" | "LIFEMAP" | "FOCUS" | "REPLAY" | string;

type SceneState = {
  mode: CanonMode;
  sceneMode: CanonMode;
  phase: CanonMode;
  selectedStarId: string | null;
  isTransitioning: boolean;
  inputLocked: boolean;
  progress: number;

  setMode: (m: CanonMode) => void;
  setPhase: (p: CanonMode) => void;
  setSelectedStar: (id: string | null) => void;
  clearFocusedStar: () => void;
  enterLifeMap: () => void;
  setProgress: (p: number) => void;
  unlock: () => void;
};

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export const useSceneStore = create<SceneState>((set) => ({
  mode: "HOME",
  sceneMode: "HOME",
  phase: "HOME",
  selectedStarId: null,
  isTransitioning: false,
  inputLocked: false,
  progress: 0,

  setMode: (m) => set({ mode: m, sceneMode: m, phase: m }),
  setPhase: (p) => set({ mode: p, sceneMode: p, phase: p }),
  setSelectedStar: (id) => set({ selectedStarId: id }),
  clearFocusedStar: () => set({ selectedStarId: null }),

  enterLifeMap: () =>
    set({
      mode: "ASCENT",
      sceneMode: "ASCENT",
      phase: "ASCENT",
      isTransitioning: true,
      inputLocked: true,
      progress: 0,
    }),

  setProgress: (p) => set({ progress: clamp01(p) }),
  unlock: () => set({ isTransitioning: false, inputLocked: false }),
}));
