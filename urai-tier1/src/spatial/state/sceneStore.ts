import { create } from "zustand";
import { SPATIAL_STARS, type SpatialStar } from "../data/stars";

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
  modeEnteredAt: number;
  stars: SpatialStar[];
  selectedStar: SpatialStar | null;
  replayEnteredAt: number | null;

  ascend: () => void;
  finishAscend: () => void;

  selectStar: (star: SpatialStar | null) => void;
  clearFocus: () => void;

  enterReplay: () => void;
  exitReplay: () => void;
  finishPullback: () => void;

  descend: () => void;
  finishDescend: () => void;

  resetHome: () => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  modeEnteredAt: Date.now(),
  stars: SPATIAL_STARS,
  selectedStar: null,
  replayEnteredAt: null,

  ascend: () => {
    const { mode } = get();
    if (mode !== "home") return;
    set({
      mode: "ascend",
      modeEnteredAt: Date.now(),
      selectedStar: null,
      replayEnteredAt: null,
    });
  },

  finishAscend: () => {
    const { mode } = get();
    if (mode !== "ascend") return;
    set({
      mode: "lifemap",
      modeEnteredAt: Date.now(),
    });
  },

  selectStar: (star) => {
    const { mode } = get();
    if (mode !== "lifemap" && mode !== "focus") return;
    set({
      selectedStar: star,
      mode: star ? "focus" : "lifemap",
      modeEnteredAt: Date.now(),
      replayEnteredAt: null,
    });
  },

  clearFocus: () => {
    const { mode } = get();
    if (mode !== "focus") return;
    set({
      selectedStar: null,
      mode: "lifemap",
      modeEnteredAt: Date.now(),
      replayEnteredAt: null,
    });
  },

  enterReplay: () => {
    const { mode, selectedStar } = get();
    set({
      mode: "replay",
      modeEnteredAt: Date.now(),
      replayEnteredAt: Date.now(),
    });
  },

  exitReplay: () => {
    const { mode } = get();
    if (mode !== "replay") return;
    set({
      mode: "pullback",
      modeEnteredAt: Date.now(),
      replayEnteredAt: null,
    });
  },

  finishPullback: () => {
    const { mode } = get();
    if (mode !== "pullback") return;
    set({
      mode: "lifemap",
      modeEnteredAt: Date.now(),
      selectedStar: null,
    });
  },

  descend: () => {
    const { mode } = get();
    if (mode !== "lifemap") return;
    set({
      mode: "descend_home",
      modeEnteredAt: Date.now(),
      selectedStar: null,
      replayEnteredAt: null,
    });
  },

  finishDescend: () => {
    const { mode } = get();
    if (mode !== "descend_home") return;
    set({
      mode: "home",
      modeEnteredAt: Date.now(),
      selectedStar: null,
      replayEnteredAt: null,
    });
  },

  resetHome: () => {
    set({
      mode: "home",
      modeEnteredAt: Date.now(),
      selectedStar: null,
      replayEnteredAt: null,
    });
  },
}));
