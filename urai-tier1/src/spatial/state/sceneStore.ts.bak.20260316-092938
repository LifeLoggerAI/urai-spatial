import { create } from "zustand";
import { toCanonicalSelectedStar } from "./toCanonicalSelectedStar";

export type SceneMode = "home" | "lifemap" | "focus" | "replay";

export type SelectedStar = {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  title: string;
  label: string;

  summary?: string;
  detail?: string;
  transcript?: string;

  signature: string;
  chapter: string;
  timeband: string;

  dateLabel?: string;
  tags?: string[];
};

type SceneState = {
  mode: SceneMode;
  selectedStar: SelectedStar | null;
  detailOpen: boolean;
  replayEnteredAt: number | null;

  setMode: (mode: SceneMode) => void;
  setSelectedStar: (star: SelectedStar | null) => void;
  setDetailOpen: (open: boolean) => void;

  enterHome: () => void;
  enterLifeMap: () => void;
  enterFocus: (star?: SelectedStar | null) => void;
  enterReplay: () => void;

  exitReplayToFocus: () => void;
  exitFocusToLifeMap: () => void;
  clearFocus: () => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  selectedStar: null,
  detailOpen: false,
  replayEnteredAt: null,

  setMode: (mode) =>
    set((state) => {
      if (mode === "replay") {
        return {
          mode,
          detailOpen: true,
          replayEnteredAt: Date.now(),
        };
      }

      return {
        mode,
        detailOpen: mode === "focus" ? state.detailOpen : false,
        replayEnteredAt: null,
      };
    }),

  setSelectedStar: (selectedStar) =>
    set({
      selectedStar: toCanonicalSelectedStar(selectedStar),
    }),

  setDetailOpen: (detailOpen) => set({ detailOpen }),

  enterHome: () =>
    set({
      mode: "home",
      selectedStar: null,
      detailOpen: false,
      replayEnteredAt: null,
    }),

  enterLifeMap: () =>
    set((state) => ({
      mode: "lifemap",
      selectedStar:
        state.mode === "focus" || state.mode === "replay"
          ? state.selectedStar
          : null,
      detailOpen: false,
      replayEnteredAt: null,
    })),

  enterFocus: (star) =>
    set((state) => {
      const nextStarRaw = star === undefined ? state.selectedStar : star;
      const nextStar = toCanonicalSelectedStar(nextStarRaw);
      return {
        mode: "focus",
        selectedStar: nextStar,
        detailOpen: !!nextStar,
        replayEnteredAt: null,
      };
    }),

  enterReplay: () =>
    set((state) => {
      if (!state.selectedStar) return state;
      return {
        mode: "replay",
        detailOpen: true,
        replayEnteredAt: Date.now(),
      };
    }),

  exitReplayToFocus: () =>
    set((state) => ({
      mode: state.selectedStar ? "focus" : "lifemap",
      detailOpen: !!state.selectedStar,
      replayEnteredAt: null,
    })),

  exitFocusToLifeMap: () =>
    set({
      mode: "lifemap",
      selectedStar: null,
      detailOpen: false,
      replayEnteredAt: null,
    }),

  clearFocus: () => get().exitFocusToLifeMap(),
}));
