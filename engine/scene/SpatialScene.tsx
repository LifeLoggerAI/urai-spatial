"use client"

import { Canvas } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"

import DeepStars from "../environment/DeepStars"
import SpaceAtmosphere from "../environment/SpaceAtmosphere"

import CameraRig from "../camera/CameraRig"
import Starfield from "./Starfield"
import MemorySphere from "../memory/MemorySphere"
import ReplayController from "../replay/ReplayController"

export default function SpatialScene(){

  const resetSelection = useSpatialStore(s => s.resetSelection)

  const handleWheel = (e:any) => {

    e.stopPropagation()

    const { selectedStarId, inReplayMode } = useSpatialStore.getState()

    if(inReplayMode || selectedStarId !== null){
      resetSelection()
    }

  }

  return(

    <Canvas
      camera={{ position:[0,2,16], fov:60 }}
      onWheel={handleWheel}
      onPointerMissed={()=>{
        resetSelection()
      }}
    >

      <color attach="background" args={["#000000"]} />

      <DeepStars/>
      <SpaceAtmosphere/>

      <CameraRig/>

      <Starfield/>

      <MemorySphere/>

      <ReplayController/>

    </Canvas>

  )

}