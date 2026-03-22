"use client";

import { create } from "zustand";

export type SceneMode = "home" | "lifemap" | "replay" | "ground";

export type SceneStoreState = {
  mode: SceneMode;
  selectedStar: string | null;
  hoveredStar: string | null;
  presenting: boolean;
  enterLifemap: () => void;
  enterGround: () => void;
  selectStar: (id: string | null) => void;
  setHoveredStar: (id: string | null) => void;
  enterReplay: (id?: string | null) => void;
  exitReplay: () => void;
  returnHome: () => void;
  returnFromGround: () => void;
  returnFromLifemap: () => void;
  setPresenting: (value: boolean) => void;
  resetScene: () => void;
};

export const useSceneStore = create<SceneStoreState>((set, get) => ({
  mode: "home",
  selectedStar: null,
  hoveredStar: null,
  presenting: false,

  enterLifemap: () =>
    set((state) => ({
      mode: "lifemap",
      selectedStar: state.selectedStar,
    })),

  enterGround: () =>
    set({
      mode: "ground",
      selectedStar: null,
      hoveredStar: null,
    }),

  selectStar: (id) =>
    set({
      selectedStar: id ?? null,
    }),

  setHoveredStar: (id) =>
    set({
      hoveredStar: id ?? null,
    }),

  enterReplay: (id) =>
    set((state) => ({
      mode: "replay",
      selectedStar: id ?? state.selectedStar ?? null,
      hoveredStar: null,
    })),

  exitReplay: () =>
    set((state) => ({
      mode: state.selectedStar ? "lifemap" : "home",
    })),

  returnHome: () =>
    set({
      mode: "home",
      selectedStar: null,
      hoveredStar: null,
      presenting: false,
    }),

  returnFromGround: () =>
    set({
      mode: "home",
      hoveredStar: null,
    }),

  returnFromLifemap: () =>
    set({
      mode: "home",
      selectedStar: null,
      hoveredStar: null,
    }),

  setPresenting: (value) =>
    set({
      presenting: !!value,
    }),

  resetScene: () =>
    set({
      mode: "home",
      selectedStar: null,
      hoveredStar: null,
      presenting: false,
    }),
}));

export default useSceneStore;

// __URAI_HOME_PRODUCT_HELPERS__
try {
  const api: any = useSceneStore as any;
  if (api && typeof api.getState === "function" && typeof api.setState === "function") {
    const s = api.getState() || {};
    const patch: any = {};
    if (!s.setMode) patch.setMode = (mode: string) => api.setState({ mode, sceneMode: mode } as any);
    if (!s.setSceneMode) patch.setSceneMode = (sceneMode: string) => api.setState({ sceneMode, mode: sceneMode } as any);
    if (!s.enterLifeMap) patch.enterLifeMap = () => api.setState({ mode: "lifemap", sceneMode: "lifemap" } as any);
    if (Object.keys(patch).length) api.setState(patch);
  }
} catch {}
