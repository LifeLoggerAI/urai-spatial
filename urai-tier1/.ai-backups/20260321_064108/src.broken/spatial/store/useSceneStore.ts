import { create } from "zustand";

export type SceneMode =
  | "home"
  | "ground"
  | "lifemap"
  | "focusStar"
  | "replay"
  | "objectFocus";

type SceneState = {
  mode: SceneMode;
  selectedStar: string | null;
  selectedObject: string | null;
  transitionLock: boolean;

  setTransitionLock: (locked: boolean) => void;
  setMode: (mode: SceneMode) => void;

  goHome: () => void;
  goGround: () => void;
  goLifemap: () => void;

  selectStar: (id: string) => void;
  enterReplay: () => void;
  exitReplay: () => void;

  selectObject: (id: string) => void;
  exitObject: () => void;

  clearSelections: () => void;
};

export const useSceneStore = create<SceneState>((set, get) => ({
  mode: "home",
  selectedStar: null,
  selectedObject: null,
  transitionLock: false,

  setTransitionLock: (locked: boolean) => set({ transitionLock: locked }),

  setMode: (mode: SceneMode) => {
    if (get().transitionLock) return;
    set({ mode });
  },

  goHome: () => {
    if (get().transitionLock) return;
    set({
      mode: "home",
      selectedStar: null,
      selectedObject: null,
    });
  },

  goGround: () => {
    if (get().transitionLock) return;
    set({
      mode: "ground",
      selectedStar: null,
      selectedObject: null,
    });
  },

  goLifemap: () => {
    if (get().transitionLock) return;
    set({
      mode: "lifemap",
      selectedObject: null,
    });
  },

  selectStar: (id: string) => {
    if (get().transitionLock) return;
    set({
      mode: "focusStar",
      selectedStar: id,
      selectedObject: null,
    });
  },

  enterReplay: () => {
    if (get().transitionLock) return;
    if (!get().selectedStar) return;
    set({ mode: "replay" });
  },

  exitReplay: () => {
    if (get().transitionLock) return;
    set({
      mode: "lifemap",
      selectedStar: null,
      selectedObject: null,
    });
  },

  selectObject: (id: string) => {
    if (get().transitionLock) return;
    set({
      mode: "objectFocus",
      selectedObject: id,
      selectedStar: null,
    });
  },

  exitObject: () => {
    if (get().transitionLock) return;
    set({
      mode: "ground",
      selectedObject: null,
    });
  },

  clearSelections: () => {
    if (get().transitionLock) return;
    set({
      selectedStar: null,
      selectedObject: null,
    });
  },
}));
