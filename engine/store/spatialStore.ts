import { create } from "zustand"
import * as THREE from "three"

type SpatialState = {
  selectedStar: THREE.Vector3 | null
  setStar: (p: [number,number,number]) => void
}

export const useSpatialStore = create<SpatialState>((set)=>({

  selectedStar:null,

  setStar:(p)=>{
    const v = new THREE.Vector3(p[0],p[1],p[2])
    set({selectedStar:v})
  }

}))
