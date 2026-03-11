import { create } from "zustand"

type NavState = {
  zoomLevel:number
  setZoom:(z:number)=>void
}

export const useNavStore = create<NavState>((set)=>({

  zoomLevel:0,

  setZoom:(z)=>set({zoomLevel:z})

}))
