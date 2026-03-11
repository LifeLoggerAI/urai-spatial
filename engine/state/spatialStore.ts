import { create } from "zustand"

type Star = {
  id:number
  position:[number,number,number]
}

type SpatialState = {

  mode:"explore" | "focus"

  selectedStar: Star | null

  cameraTarget:[number,number,number] | null

  setStar:(star:Star)=>void
  clearStar:()=>void
}

export const useSpatialStore = create<SpatialState>((set)=>({

  mode:"explore",

  selectedStar:null,

  cameraTarget:null,

  setStar:(star)=>{

    set({
      selectedStar:star,
      cameraTarget:star.position,
      mode:"focus"
    })

  },

  clearStar:()=>{

    set({
      selectedStar:null,
      cameraTarget:null,
      mode:"explore"
    })

  }

}))
