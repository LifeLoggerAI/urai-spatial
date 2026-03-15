"use client";

import { useMemo } from "react";
import { Canvas } from "@react-three/fiber";

import Starfield from "./Starfield";
import CameraRig from "./CameraRig";
import MemorySphere from "../memory/MemorySphere";
import Presence from "../components/Presence";
import PresenceController from "../core/PresenceController";

import { useSpatialStore } from "../state/spatialStore";
import { STAR_DATA } from "../data/starData";

export default function MainScene() {

  const selectedStarId = useSpatialStore((s) => s.selectedStarId)

  const selectedStar = useMemo(() => {

    if (!selectedStarId) return null

    return STAR_DATA.find((star) => star.id === selectedStarId) || null

  }, [selectedStarId])

  return (

    <Canvas
      camera={{ position: [0, 2, 16], fov: 60 }}
      gl={{ antialias: true }}
    >

      <color attach="background" args={["#020409"]} />

      <ambientLight intensity={0.55} />

      <pointLight position={[8, 10, 8]} intensity={1.2} />

      <CameraRig />

      <Starfield />

      <Presence />

      {/* Controllers */}
      <PresenceController />

      {selectedStar && (
        <MemorySphere />
      )}

    </Canvas>

  )
}
