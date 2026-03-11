import { create } from "zustand"

type NavigationMode =
  | "explore"
  | "memory"
  | "replay"

type NavigationState = {

  mode:NavigationMode

  setExplore:()=>void
  setMemory:()=>void
  setReplay:()=>void

}

export const useNavigationState = create<NavigationState>((set)=>({

  mode:"explore",

  setExplore:()=>set({mode:"explore"}),
  setMemory:()=>set({mode:"memory"}),
  setReplay:()=>set({mode:"replay"}),

}))
