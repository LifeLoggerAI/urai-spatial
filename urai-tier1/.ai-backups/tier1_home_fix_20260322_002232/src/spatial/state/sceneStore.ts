"use client";

import { create } from "zustand";
import type { SceneMode } from "../types";

type SceneStore = {
  mode: SceneMode;
  selectedStar: string | null;
  hoveredStar: string | null;
  enterHome: () => void;
  enterLifemap: () => void;
  enterGround: () => void;
  selectStar: (id: string) => void;
  hoverStar: (id: string | null) => void;
  enterReplay: (id?: string | null) => void;
  exitReplay: () => void;
  returnHome: () => void;
  returnFromGround: () => void;
  returnFromLifemap: () => void;
  escape: () => void;
};

export const useSceneStore = create<SceneStore>((set, get) => ({
  mode: "home",
  selectedStar: null,
  hoveredStar: null,

  enterHome: () => set({ mode: "home", selectedStar: null, hoveredStar: null }),
  enterLifemap: () => set({ mode: "lifemap" }),
  enterGround: () => set({ mode: "ground" }),
  selectStar: (id) => set({ selectedStar: id, mode: "lifemap" }),
  hoverStar: (id) => set({ hoveredStar: id }),
  enterReplay: (id) => set({ selectedStar: id ?? get().selectedStar, mode: "replay" }),
  exitReplay: () => set({ mode: "lifemap" }),
  returnHome: () => set({ mode: "home", selectedStar: null, hoveredStar: null }),
  returnFromGround: () => set({ mode: "home" }),
  returnFromLifemap: () => set({ mode: "home", selectedStar: null, hoveredStar: null }),
  escape: () => {
    const mode = get().mode;
    if (mode === "replay") {
      set({ mode: "lifemap" });
      return;
    }
    if (mode === "lifemap" || mode === "ground") {
      set({ mode: "home", selectedStar: null, hoveredStar: null });
      return;
    }
    set({ mode: "home" });
  }
}));

export default useSceneStore;
