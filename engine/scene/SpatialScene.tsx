"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense } from "react"
import * as THREE from "three"

import CameraRig from "./CameraRig"
import EscapeController from "../input/EscapeController"

import GPUStarfield from "../space/GPUStarfield"

import GroundPlane from "../environment/GroundPlane"
import SkyDome from "../environment/SkyDome"

import NebulaVolume from "../visual/NebulaVolume"
import CoreGlow from "../visual/CoreGlow"

export default function SpatialScene(){

  return(

    <Canvas

      camera={{ position:[0,80,260], fov:60 }}

      gl={{

        antialias:true,
        powerPreference:"high-performance",

        toneMapping:THREE.ACESFilmicToneMapping,
        toneMappingExposure:1.25,

        outputColorSpace:THREE.SRGBColorSpace

      }}

      dpr={[1,2]}

    >

      <color attach="background" args={["#000000"]}/>

      <fog attach="fog" args={["#000000",300,2000]} />

      <Suspense fallback={null}>

        <CameraRig/>

        <EscapeController/>

        <ambientLight intensity={0.35}/>

        <SkyDome/>

        <GroundPlane/>

        <NebulaVolume/>

        <CoreGlow/>

        <GPUStarfield/>

      </Suspense>

    </Canvas>

  )

}