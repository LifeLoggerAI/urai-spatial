import { create } from "zustand";
import type { Mode } from "@/lib/uraiCanon/types";

export type SpatialCameraMode =
  | "HOME"
  | "GROUND"
  | "ASCENT"
  | "LIFEMAP"
  | "FOCUS"
  | "REPLAY"
  | "MIRROR"
  | "REWIND";

export type SpatialTransitionState =
  | "idle"
  | "home-to-sky"
  | "sky-to-lifemap"
  | "lifemap-to-focus"
  | "focus-to-lifemap"
  | "focus-to-replay"
  | "replay-to-focus"
  | "rewind-to-home";

type SceneState = {
  mode: Mode;
  sceneMode: Mode;
  selectedStarId: string | null;
  hoveredStarId: string | null;
  interactionLock: boolean;
  inReplayMode: boolean;
  cameraMode: SpatialCameraMode;
  phase: SpatialCameraMode;
  deterministicTransitionState: SpatialTransitionState;
  transitionToken: number;

  setMode: (m: Mode) => void;
  setSelectedStar: (id: string | null) => void;
  setHoveredStar: (id: string | null) => void;
  setInteractionLock: (locked: boolean) => void;
  beginTransition: (state: SpatialTransitionState, cameraMode: SpatialCameraMode) => void;
  completeTransition: (cameraMode: SpatialCameraMode) => void;
  enterReplayMode: (id?: string | null) => void;
  exitReplayMode: () => void;
  clearFocusedStar: () => void;
  resetScene: () => void;
};

export const useSceneStore = create<SceneState>((set) => ({
  mode: "HOME",
  sceneMode: "HOME",
  selectedStarId: null,
  hoveredStarId: null,
  interactionLock: false,
  inReplayMode: false,
  cameraMode: "HOME",
  phase: "HOME",
  deterministicTransitionState: "idle",
  transitionToken: 0,

  setMode: (m) =>
    set({
      mode: m,
      sceneMode: m,
      cameraMode: m as SpatialCameraMode,
      phase: m as SpatialCameraMode,
    }),
  setSelectedStar: (id) => set({ selectedStarId: id }),
  setHoveredStar: (id) => set({ hoveredStarId: id }),
  setInteractionLock: (locked) => set({ interactionLock: locked }),
  beginTransition: (state, cameraMode) =>
    set((current) => ({
      deterministicTransitionState: state,
      cameraMode,
      phase: cameraMode,
      interactionLock: true,
      transitionToken: current.transitionToken + 1,
    })),
  completeTransition: (cameraMode) =>
    set({
      deterministicTransitionState: "idle",
      cameraMode,
      phase: cameraMode,
      interactionLock: false,
    }),
  enterReplayMode: (id) =>
    set({
      selectedStarId: id ?? null,
      inReplayMode: true,
      mode: "REPLAY",
      sceneMode: "REPLAY",
      cameraMode: "REPLAY",
      phase: "REPLAY",
      deterministicTransitionState: "focus-to-replay",
      interactionLock: false,
    }),
  exitReplayMode: () =>
    set({
      inReplayMode: false,
      mode: "FOCUS",
      sceneMode: "FOCUS",
      cameraMode: "FOCUS",
      phase: "FOCUS",
      deterministicTransitionState: "replay-to-focus",
      interactionLock: false,
    }),
  clearFocusedStar: () =>
    set({
      selectedStarId: null,
      hoveredStarId: null,
      inReplayMode: false,
      mode: "LIFEMAP",
      sceneMode: "LIFEMAP",
      cameraMode: "LIFEMAP",
      phase: "LIFEMAP",
      deterministicTransitionState: "focus-to-lifemap",
      interactionLock: false,
    }),
  resetScene: () =>
    set({
      mode: "HOME",
      sceneMode: "HOME",
      selectedStarId: null,
      hoveredStarId: null,
      interactionLock: false,
      inReplayMode: false,
      cameraMode: "HOME",
      phase: "HOME",
      deterministicTransitionState: "idle",
      transitionToken: 0,
    }),
}));
