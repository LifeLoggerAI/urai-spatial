"use client"

import { useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useSceneModeStore } from "../state/useSceneModeStore"
import { replayMemoryData } from "../data/replayMemoryData"

const ORB_POSITION = new THREE.Vector3(0, 3, 0)
const RING_RADIUS = 5.6

export default function ReplayScene() {
  const mode = useSceneModeStore((s) => s.mode)

  const cursorRef = useRef<THREE.Mesh>(null!)
  const { camera } = useThree()

  useFrame(() => {
    if (mode !== "REPLAY") return
    if (!cursorRef.current) return

    const progress = 0.25
    const angle = progress * Math.PI * 2

    const x = Math.cos(angle) * RING_RADIUS
    const z = Math.sin(angle) * RING_RADIUS

    cursorRef.current.position.set(
      ORB_POSITION.x + x,
      ORB_POSITION.y,
      ORB_POSITION.z + z
    )

    camera.lookAt(ORB_POSITION)
  })

  return (
    <>
      <mesh
        position={ORB_POSITION}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[5.5, 5.7, 128]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#88ccff"
          emissiveIntensity={1}
          transparent
          opacity={0.5}
        />
      </mesh>

      <mesh ref={cursorRef}>
        <sphereGeometry args={[0.2, 32, 32]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#88ccff"
          emissiveIntensity={1}
        />
      </mesh>

      {replayMemoryData.map((memory, i) => {
        const angle = memory.timestamp * Math.PI * 2
        const x = Math.cos(angle) * RING_RADIUS
        const z = Math.sin(angle) * RING_RADIUS

        return (
          <mesh
            key={memory.id}
            position={[ORB_POSITION.x + x, ORB_POSITION.y, ORB_POSITION.z + z]}
          >
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial
              color="#88ccff"
              emissive="#88ccff"
              emissiveIntensity={1}
            />
          </mesh>
        )
      })}
    </>
  )
}