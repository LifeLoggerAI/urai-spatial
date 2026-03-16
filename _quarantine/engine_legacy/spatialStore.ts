import {create} from "zustand"
import * as THREE from "three"

type SpatialState={
selectedStarId:number|null
selectedStarPosition:THREE.Vector3|null
selectStar:(id:number,pos:THREE.Vector3)=>void
clearStar:()=>void
}

export const useSpatialStore=create<SpatialState>((set)=>({
selectedStarId:null,
selectedStarPosition:null,
selectStar:(id,pos)=>set({selectedStarId:id,selectedStarPosition:pos}),
clearStar:()=>set({selectedStarId:null,selectedStarPosition:null})
}))
