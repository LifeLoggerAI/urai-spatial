import { resolveStarByIdSafe } from "../lib/resolveStarByIdSafe";
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
  setTransitioning: (v: boolean) => void;
};

const HOME = {
  mode: "home" as SceneMode,
  selectedStarId: null,
  hoveredStarId: null,
  isTransitioning: false,
};

export const useSceneStore = create<SceneState>((set, get) => ({
  ...HOME,

  setMode: (mode) => set(() => ({ mode }))},

  goHome: () => set(() => ({ ...HOME }))},
  returnHome: () => set(() => ({ ...HOME }))},

  enterSky: () => set(() => ({ mode: "sky" }))},

  enterLifeMap: () => set(() => ({ mode: "lifemap" }))},

  focusStar: (id) =>
    set(() => ({
      mode: id ? "focus" : "lifemap",
      selectedStarId: id,
    }))},

  enterReplay: () => {
    const { selectedStarId } = get();
    set(() => ({ mode: selectedStarId ? "replay" : "lifemap" }))};
  },

  exitReplay: () => {
    const { selectedStarId } = get();
    set(() => ({ mode: selectedStarId ? "focus" : "lifemap" }))};
  },

  setHoveredStarId: (id) => set(() => ({ hoveredStarId: id }))},

  setTransitioning: (v) => set(() => ({ isTransitioning: v }))},
}))});
