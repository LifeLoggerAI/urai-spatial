"use client"

import { Canvas } from "@react-three/fiber"

import DeepStars from "../environment/DeepStars"
import BackgroundStars from "../space/BackgroundStars"
import ParallaxStars from "../space/ParallaxStars"
import SpaceAtmosphere from "../environment/SpaceAtmosphere"
import GalaxyBand from "../environment/GalaxyBand"
import NebulaFog from "../environment/NebulaFog"

import CameraRig from "../camera/CameraRig"
import Starfield from "./Starfield"
import StarHalo from "../effects/StarHalo"
import MemorySphere from "./MemorySphere"
import ReplayController from "../replay/ReplayController"

export default function SpatialScene(){

  return(

    <Canvas
      camera={{ position:[0,0,6], fov:60 }}
      raycaster={{ params:{ Mesh:{} } }}
      onPointerMissed={()=>{}}
    >

      <ambientLight intensity={0.8} />

      {/* Environment */}
      <DeepStars />
      <BackgroundStars />
      <ParallaxStars />
      <SpaceAtmosphere />
      <GalaxyBand />
      <NebulaFog />

      {/* Interaction */}
      <CameraRig />
      <Starfield />
      <StarHalo />
      <MemorySphere />
      <ReplayController />

    </Canvas>

  )

}
