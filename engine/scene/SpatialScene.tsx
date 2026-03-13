"use client"

import { Canvas } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { Suspense, useMemo } from "react"

import CameraRig from "../camera/CameraRig"
import Starfield from "./Starfield"
import MemorySphere from "../memory/MemorySphere"
import StarTrails from "../effects/StarTrails"

import { useSpatialStore } from "../state/spatialStore"

function Controls() {

  const mode = useSpatialStore((s) => s.mode)

  return (
    <OrbitControls
      enablePan={mode !== "focus"}
      enableRotate={mode !== "focus"}
      enableZoom={false}
      rotateSpeed={0.6}
    />
  )
}

/* distant background starfield */

function BackgroundStars() {

  const geometry = useMemo(() => {

    const stars = new Float32Array(3000)

    for (let i = 0; i < 3000; i++) {
      stars[i] = (Math.random() - 0.5) * 900
    }

    const geo = new THREE.BufferGeometry()

    geo.setAttribute(
      "position",
      new THREE.BufferAttribute(stars, 3)
    )

    return geo

  }, [])

  const material = useMemo(() => {

    return new THREE.PointsMaterial({
      color: "#888888",
      size: 0.6,
      sizeAttenuation: true
    })

  }, [])

  return <points geometry={geometry} material={material} />
}

function SceneContent() {

  return (
    <>
      <ambientLight intensity={0.8} />
      <Controls />
      <BackgroundStars />

      <CameraRig />
      <Starfield />
      <StarTrails />
      <MemorySphere />
    </>
  )
}

export default function SpatialScene() {

  return (

    <Canvas
      camera={{ position: [0, 0, 48], fov: 50 }}
      gl={{ antialias: true }}
      frameloop="demand"
    >

      <color attach="background" args={["#000000"]} />
      <fog attach="fog" args={["#000000", 60, 300]} />

      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>

    </Canvas>

  )
}