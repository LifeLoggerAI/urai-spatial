
import { create } from "zustand";
import type { SceneMode } from "./sceneState";

type RhythmState = "stable" | "off" | "overstimulated";

interface SceneStore {
  mode: SceneMode;
  rhythmState: RhythmState;
  mentalLoad: number;

  setMode: (mode: SceneMode) => void;
  setRhythm: (r: RhythmState) => void;
  setMentalLoad: (v: number) => void;
}

export const useSceneStore = create<SceneStore>((set) => ({
  mode: "HOME",
  rhythmState: "stable",
  mentalLoad: 0.3,

  setMode: (mode) => set({ mode }),
  setRhythm: (rhythmState) => set({ rhythmState }),
  setMentalLoad: (mentalLoad) => set({ mentalLoad }),
}));
