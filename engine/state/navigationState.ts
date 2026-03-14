import { create } from "zustand"

export type NavigationMode =
  | "explore"
  | "memory"
  | "replay"

type NavigationState = {

  mode: NavigationMode

  setMode: (mode: NavigationMode) => void

  setExplore: () => void
  setMemory: () => void
  setReplay: () => void
}

export const useNavigationState = create<NavigationState>((set)=>({

  mode: "explore",

  setMode: (mode) =>
    set({ mode }),

  setExplore: () =>
    set({ mode: "explore" }),

  setMemory: () =>
    set({ mode: "memory" }),

  setReplay: () =>
    set({ mode: "replay" }),

}))