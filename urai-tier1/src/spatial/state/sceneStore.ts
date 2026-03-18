import { create } from "zustand";
import { SPATIAL_STARS, type SpatialStar } from "../data/stars";
import type { SelectedStar } from "@/spatial/state/selectedStarContract";

export type SceneMode = "home" | "sky" | "lifemap" | "focus" | "replay";

export type SceneState = {
  mode: SceneMode;
  stars: SpatialStar[];
  selectedStarId: string | null;
  modeEnteredAt: number;
  selectedStar: SelectedStar | null;
  replayEnteredAt: number | null;
  setMode: (mode: SceneMode) => void;
  enterSky: () => void;
  setSelectedStar: (star: SelectedStar | null) => void;
  selectStar: (star: SelectedStar | null) => void;
  clearFocus: () => void;
  exitFocusToLifeMap: () => void;
  enterReplay: () => void;
  exitReplay: () => void;
  exitReplayToFocus: () => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  stars: SPATIAL_STARS,
  selectedStarId: null,
  modeEnteredAt: Date.now(),
  selectedStar: null,
  replayEnteredAt: null,

  setMode: (mode: SceneMode) => set({ mode, modeEnteredAt: Date.now() }),

  enterSky: () =>
    set({
      selectedStarId: null,
      selectedStar: null,
      replayEnteredAt: null,
      mode: "sky",
      modeEnteredAt: Date.now(),
    }),

  setSelectedStar: (star: SelectedStar | null) =>
    set({
      selectedStarId: star?.id ?? null,
      selectedStar: star,
      replayEnteredAt: null,
      mode: star ? "focus" : "lifemap",
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

  exitFocusToLifeMap: () =>
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
    const { selectedStar } = get();
    set({
      mode: selectedStar ? "focus" : "lifemap",
      modeEnteredAt: Date.now(),
      replayEnteredAt: null,
    });
  },

  exitReplayToFocus: () => {
    const { selectedStar } = get();
    set({
      mode: selectedStar ? "focus" : "lifemap",
      modeEnteredAt: Date.now(),
      replayEnteredAt: null,
    });
  },
}));
