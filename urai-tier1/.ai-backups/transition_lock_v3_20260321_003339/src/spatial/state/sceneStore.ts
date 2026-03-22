import { create } from "zustand";
import type { SceneMode, TransitionPhase } from "../types";

type SceneState = {
  mode: SceneMode;
  phase: TransitionPhase;
  selectedStar: string | null;
  hoveredStar: string | null;
  selectedObject: string | null;
  homeToLifemap: () => void;
  focusStar: (id: string) => void;
  enterReplay: () => void;
  exitReplay: () => void;
  returnHome: () => void;
  enterGround: () => void;
  focusObject: (id: string) => void;
  returnFromObject: () => void;
  hoverStar: (id: string | null) => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  phase: "idle",
  selectedStar: null,
  hoveredStar: null,
  selectedObject: null,

  homeToLifemap: () => {
    set({ mode: "lifemap", phase: "to-lifemap", selectedObject: null, hoveredStar: null });
    window.setTimeout(() => {
      if (get().mode === "lifemap" && get().phase === "to-lifemap") set({ phase: "lifemap" });
    }, 1800);
  },

  focusStar: (id: string) => {
    set({ mode: "lifemap", selectedStar: id, phase: "star-focus", selectedObject: null });
  },

  enterReplay: () => {
    if (!get().selectedStar) return;
    set({ mode: "replay", phase: "to-replay" });
    window.setTimeout(() => {
      if (get().mode === "replay" && get().phase === "to-replay") set({ phase: "replay" });
    }, 900);
  },

  exitReplay: () => {
    set({ mode: "lifemap", phase: "from-replay" });
    window.setTimeout(() => {
      if (get().mode === "lifemap" && get().phase === "from-replay") set({ phase: "star-focus" });
    }, 900);
  },

  returnHome: () => {
    set({ phase: "to-home", mode: "lifemap" });
    window.setTimeout(() => {
      set({
        mode: "home",
        phase: "idle",
        selectedStar: null,
        hoveredStar: null,
        selectedObject: null,
      });
    }, 1400);
  },

  enterGround: () => {
    set({
      mode: "ground",
      phase: "to-ground",
      selectedStar: null,
      hoveredStar: null,
      selectedObject: null,
    });
    window.setTimeout(() => {
      if (get().mode === "ground" && get().phase === "to-ground") set({ phase: "ground" });
    }, 1200);
  },

  focusObject: (id: string) => set({ mode: "object", phase: "object-focus", selectedObject: id }),

  returnFromObject: () => set({ mode: "ground", phase: "ground", selectedObject: null }),

  hoverStar: (id: string | null) => set({ hoveredStar: id }),
}));
