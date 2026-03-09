"use client"

import { Canvas } from "@react-three/fiber"

import Starfield from "./Starfield"
import CameraRig from "./CameraRig"
import MemorySphere from "./MemorySphere"

import { useSpatialStore } from "../store/spatialStore"

export default function MainScene(){

  const target = useSpatialStore((s)=>s.target)

  return(
    <Canvas camera={{ position:[0,6,12], fov:60 }}>

      <ambientLight intensity={0.6}/>
      <pointLight position={[10,10,10]}/>

      <CameraRig />

      <Starfield />

      {target && (
        <MemorySphere position={target}/>
      )}

    </Canvas>
  )
}
