import { create } from "zustand";

export type SceneMode = "home" | "sky" | "lifemap" | "focus" | "replay";

export type SceneState = {
  mode: SceneMode;
  selectedStarId: string | null;
  selectedObject: string | null;
  hoveredStarId: string | null;
  isTransitioning: boolean;
  setMode: (mode: SceneMode) => void;
  setSelectedStarId: (id: string | null) => void;
  setSelectedObject: (id: string | null) => void;
  setHoveredStarId: (id: string | null) => void;
  setTransitioning: (value: boolean) => void;
  goHome: () => void;
  reset: () => void;
};

const defaultSceneState = {
  mode: "home",
  selectedStarId: null,
  selectedObject: null,
  hoveredStarId: null,
  isTransitioning: false,
} satisfies Omit<
  SceneState,
  | "setMode"
  | "setSelectedStarId"
  | "setSelectedObject"
  | "setHoveredStarId"
  | "setTransitioning"
  | "goHome"
  | "reset"
>;

export const useSceneStore = create<SceneState>((set, get) => ({
  ...defaultSceneState,

  setMode: (mode) => set(() => ({ mode })),

  setSelectedStarId: (id) =>
    set(() => ({
      selectedStarId: id,
    })),

  setSelectedObject: (id) =>
    set(() => ({
      selectedObject: id,
    })),

  setHoveredStarId: (id) =>
    set(() => ({
      hoveredStarId: id,
    })),

  setTransitioning: (value) =>
    set(() => ({
      isTransitioning: value,
    })),

  goHome: () =>
    set(() => ({
      ...defaultSceneState,
      mode: "home",
    })),

  reset: () =>
    set(() => ({
      ...defaultSceneState,
    })),
}));

export default useSceneStore;
