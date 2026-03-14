"use client"

import { Canvas } from "@react-three/fiber"
import { Suspense, useMemo } from "react"
import * as THREE from "three"

import { OrbitControls } from "@react-three/drei"

import CameraRig from "../camera/CameraRig"
import Starfield from "./Starfield"
import MemorySphere from "../memory/MemorySphere"

import NebulaLayer from "../background/NebulaLayer"
import SpiralNebula from "../background/SpiralNebula"
import NebulaClouds from "../background/NebulaClouds"
import DeepStars from "../background/DeepStars"
import ParallaxStars from "../background/ParallaxStars"

import GalaxyDust from "../effects/GalaxyDust"
import StarLightCones from "../effects/StarLightCones"
import StarCorona from "../effects/StarCorona"
import StarTrails from "../effects/StarTrails"
import HyperspaceStreaks from "../effects/HyperspaceStreaks"

import { useSpatialStore } from "../state/spatialStore"



function Controls(){

  const mode = useSpatialStore((s)=>s.mode)

  return(
    <OrbitControls
      enablePan={mode !== "focus"}
      enableRotate={mode !== "focus"}
      enableZoom={false}
      rotateSpeed={0.45}
    />
  )

}



/* cosmic sky gradient */

function CosmicGradient(){

  const shader = useMemo(()=>{

    return new THREE.ShaderMaterial({

      side:THREE.BackSide,
      depthWrite:false,

      uniforms:{
        top:{value:new THREE.Color("#05071e")},
        bottom:{value:new THREE.Color("#000000")}
      },

      vertexShader:`

        varying vec3 vPos;

        void main(){

          vPos = position;

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position,1.0);

        }

      `,

      fragmentShader:`

        varying vec3 vPos;

        uniform vec3 top;
        uniform vec3 bottom;

        void main(){

          float h =
            normalize(vPos).y * 0.5 + 0.5;

          vec3 col =
            mix(bottom, top, h);

          gl_FragColor =
            vec4(col,1.0);

        }

      `
    })

  },[])

  return(
    <mesh scale={3200} renderOrder={-10}>
      <sphereGeometry args={[1,64,64]} />
      <primitive object={shader}/>
    </mesh>
  )

}



export default function SpatialScene(){

  return(

    <Canvas

      camera={{ position:[0,0,60], fov:60 }}

      gl={{

        antialias:true,
        powerPreference:"high-performance",

        toneMapping:THREE.ACESFilmicToneMapping,
        toneMappingExposure:0.11,

        outputColorSpace:THREE.SRGBColorSpace,
        physicallyCorrectLights:true

      }}

      dpr={[1,2]}

    >

      {/* depth fog improves galaxy contrast */}

      <fog attach="fog" args={["#000000",120,900]} />

      <Suspense fallback={null}>

        <CameraRig/>

        <ambientLight intensity={0.04}/>

        <CosmicGradient/>

        {/* nebula layers */}

        <NebulaLayer radius={1500}/>
        <SpiralNebula/>
        <NebulaClouds/>

        {/* deep background stars */}

        <DeepStars/>
        <ParallaxStars/>

        {/* galaxy dust */}

        <GalaxyDust/>

        {/* main galaxy */}

        <Starfield/>

        {/* glow layers */}

        <StarLightCones/>
        <StarCorona/>

        {/* memory objects */}

        <MemorySphere/>

        {/* motion effects */}

        <StarTrails/>
        <HyperspaceStreaks/>

        <Controls/>

      </Suspense>

    </Canvas>

  )

}