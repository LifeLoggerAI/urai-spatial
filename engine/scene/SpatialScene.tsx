'use client'

import { Canvas } from "@react-three/fiber"
import { Suspense, useEffect } from "react"
import { OrbitControls } from "@react-three/drei"

import { useSpatialStore } from "../state/spatialStore"

import DeepStars from "../environment/DeepStars"
import SpaceAtmosphere from "../environment/SpaceAtmosphere"
import Starfield from "./Starfield"
import MemorySphere from "../memory/MemorySphere"

function ResetListener() {

  const setSelectedStarId = useSpatialStore((s) => s.setSelectedStarId)
  const setInteractionLock = useSpatialStore((s) => s.setInteractionLock)

  useEffect(() => {

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectedStarId(null)
        setInteractionLock(false)
      }
    }

    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)

  }, [setSelectedStarId, setInteractionLock])

  return null
}

export default function SpatialScene() {

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)

  return (
    <Canvas
      camera={{ position: [0, 0, 8], fov: 60 }}
      gl={{ antialias: true }}
      style={{ background: "#020412" }}
    >

      <Suspense fallback={null}>

        <ResetListener />

        <DeepStars />
        <SpaceAtmosphere />

        <Starfield />

        {selectedStarId && <MemorySphere />}

        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={25}
        />

      </Suspense>

    </Canvas>
  )
}