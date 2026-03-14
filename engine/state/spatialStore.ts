import { create } from "zustand"
import * as THREE from "three"

type SpatialMode = "lifemap" | "memory"

type SpatialState = {

  spatialMode: SpatialMode

  selectedStarId: number | null
  selectedStarPosition: THREE.Vector3 | null

  cameraTarget: THREE.Vector3 | null
  lookTarget: THREE.Vector3 | null

  homePosition: THREE.Vector3
  homeTarget: THREE.Vector3

  exploreRadius: number

  selectStar: (id: number, pos: THREE.Vector3) => void
  clearSelection: () => void
  resetSpatial: () => void

  zoomBy: (delta: number) => void
}

const HOME_POS = new THREE.Vector3(0,0,300)
const HOME_LOOK = new THREE.Vector3(0,0,0)

export const useSpatialStore = create<SpatialState>((set,get) => ({

  spatialMode: "lifemap",

  selectedStarId: null,
  selectedStarPosition: null,

  cameraTarget: HOME_POS.clone(),
  lookTarget: HOME_LOOK.clone(),

  homePosition: HOME_POS,
  homeTarget: HOME_LOOK,

  exploreRadius: 160,

  selectStar: (id,pos)=>
    set({

      selectedStarId: id,
      selectedStarPosition: pos,

      cameraTarget: pos.clone().add(new THREE.Vector3(0,0,18)),
      lookTarget: pos.clone(),

      spatialMode: "memory"

    }),

  clearSelection: ()=>
    set({

      selectedStarId: null,
      selectedStarPosition: null,

      cameraTarget: HOME_POS.clone(),
      lookTarget: HOME_LOOK.clone(),

      spatialMode: "lifemap"

    }),

  resetSpatial: ()=>
    set({

      selectedStarId: null,
      selectedStarPosition: null,

      cameraTarget: HOME_POS.clone(),
      lookTarget: HOME_LOOK.clone(),

      spatialMode: "lifemap"

    }),

  zoomBy:(delta:number)=>
    set((state)=>({

      exploreRadius: THREE.MathUtils.clamp(
        state.exploreRadius + delta,
        40,
        900
      )

    }))

}))