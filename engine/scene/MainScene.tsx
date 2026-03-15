"use client"

import { Canvas } from "@react-three/fiber"

import Starfield from "./Starfield"
import CameraRig from "./CameraRig"
import MemorySphere from "../memory/MemorySphere"
import Presence from "../components/Presence"
import PresenceController from "../core/PresenceController"

import { useSpatialStore } from "../state/spatialStore"

export default function MainScene() {

  const selectedStarPosition = useSpatialStore(
    (s) => s.selectedStarPosition
  )

  return (

    <Canvas
      camera={{ position: [0, 2, 16], fov: 60, near: 0.1, far: 2000 }}
      gl={{
        antialias: true,
        powerPreference: "high-performance"
      }}
    >

      <color attach="background" args={["#020409"]} />

      {/* lighting */}
      <ambientLight intensity={0.55} />
      <pointLight position={[8, 10, 8]} intensity={1.2} />

      {/* core scene */}
      <CameraRig />
      <Starfield />
      <Presence />

      {/* controllers */}
      <PresenceController />

      {/* memory visuals */}
      {selectedStarPosition && (
        <MemorySphere />
      )}

    </Canvas>

  )
}