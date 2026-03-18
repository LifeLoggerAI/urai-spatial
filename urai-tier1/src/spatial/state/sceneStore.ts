import { create } from "zustand";
import { SPATIAL_STARS, type SpatialStar } from "../data/stars";
import type { SelectedStar } from "@/spatial/state/selectedStarContract";

export type SceneMode =
  | "home"
  | "ascend"
  | "lifemap"
  | "focus"
  | "replay"
  | "pullback"
  | "descend_home";

export type SceneState = {
  mode: SceneMode;
  stars: SpatialStar[];
  selectedStarId: string | null;
  modeEnteredAt: number;
  selectedStar: SelectedStar | null;
  replayEnteredAt: number | null;
  setMode: (mode: SceneMode) => void;
  ascend: () => void;
  descend: () => void;
  selectStar: (star: SelectedStar | null) => void;
  clearFocus: () => void;
  enterReplay: () => void;
  exitReplay: () => void;
  finishPullback: () => void;
  finishAscend: () => void;
  finishDescend: () => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  stars: SPATIAL_STARS,
  selectedStarId: null,
  modeEnteredAt: Date.now(),
  selectedStar: null,
  replayEnteredAt: null,

  setMode: (mode: SceneMode) => set({ mode, modeEnteredAt: Date.now() }),

  ascend: () =>
    set({
      selectedStarId: null,
      selectedStar: null,
      replayEnteredAt: null,
      mode: "ascend",
      modeEnteredAt: Date.now(),
    }),

  descend: () =>
    set({
      mode: "descend_home",
      modeEnteredAt: Date.now(),
    }),

  selectStar: (star: SelectedStar | null) =>
    set({
      selectedStarId: star?.id ?? null,
      selectedStar: star,
      replayEnteredAt: null,
      mode: star ? "focus" : "lifemap",
      modeEnteredAt: Date.now(),
    }),

  clearFocus: () =>
    set({
      selectedStarId: null,
      selectedStar: null,
      replayEnteredAt: null,
      mode: "lifemap",
      modeEnteredAt: Date.now(),
    }),

  enterReplay: () => {
    const { selectedStar } = get();
    if (!selectedStar) return;
    set({
      mode: "replay",
      modeEnteredAt: Date.now(),
      replayEnteredAt: Date.now(),
    });
  },

  exitReplay: () => {
    set({
      mode: "pullback",
      modeEnteredAt: Date.now(),
      replayEnteredAt: null,
    });
  },

  finishPullback: () => {
    set({
      mode: "lifemap",
      modeEnteredAt: Date.now(),
    });
  },

  finishAscend: () => {
    set({
      mode: "lifemap",
      modeEnteredAt: Date.now(),
    });
  },

  finishDescend: () => {
    set({
      mode: "home",
      modeEnteredAt: Date.now(),
    });
  },
}));
