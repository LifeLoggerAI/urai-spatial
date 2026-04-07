"use client";

import { create } from "zustand";

export type SceneMode = "home" | "lifemap" | "focus" | "replay";

export type FocusStar = {
  id: string;
  position: [number, number, number];
};

type SceneState = {
  sceneMode: SceneMode;
  focusedStar: FocusStar | null;
  focusProgress: number;
  arrivalReady: boolean;
  enteredMemory: boolean;
  replayOpen: boolean;
  selectedStarId: string | null;

  setSceneMode: (mode: SceneMode) => void;
  setFocusedStar: (star: FocusStar | null) => void;
  clearFocusedStar: () => void;
  setFocusProgress: (value: number) => void;
  setArrivalReady: (value: boolean) => void;

  openFocus: (id: string) => void;
  openReplay: (id: string) => void;
  closeReplay: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  sceneMode: "home",
  focusedStar: null,
  focusProgress: 0,
  arrivalReady: false,
  enteredMemory: false,
  replayOpen: false,
  selectedStarId: null,

  setSceneMode: (mode) => set({ sceneMode: mode }),

  setFocusedStar: (star) =>
    set({
      focusedStar: star,
      focusProgress: 0,
      arrivalReady: false,
      enteredMemory: false,
      replayOpen: false,
      selectedStarId: star ? star.id : null,
      sceneMode: star ? "focus" : "home",
    }),

  clearFocusedStar: () =>
    set({
      focusedStar: null,
      focusProgress: 0,
      arrivalReady: false,
      enteredMemory: false,
      replayOpen: false,
      selectedStarId: null,
      sceneMode: "home",
    }),

  setFocusProgress: (value) =>
    set({
      focusProgress: Math.max(0, Math.min(1, value)),
    }),

  setArrivalReady: (value) => set({ arrivalReady: value }),

  openFocus: (id) =>
    set({
      selectedStarId: id,
      focusedStar: { id, position: [0, 0, 0] },
      focusProgress: 0,
      arrivalReady: false,
      enteredMemory: false,
      replayOpen: false,
      sceneMode: "focus",
    }),

  openReplay: (id) =>
    set({
      replayOpen: true,
      selectedStarId: id,
      sceneMode: "replay",
    }),

  closeReplay: () =>
    set({
      replayOpen: false,
      sceneMode: "focus",
    }),
}));
