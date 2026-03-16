"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

import { useSceneModeStore } from "../state/useSceneModeStore"
import { replayMemoryData } from "../data/replayMemoryData"

const ORB_POSITION = new THREE.Vector3(0, 3, 0)
const RING_RADIUS = 5.6

export default function ReplayScene() {

  const mode = useSceneModeStore((s) => s.mode)

  const cursorRef = useRef<THREE.Mesh>(null!)
  const progress = useRef(0)

  const { camera } = useThree()

  const memoryPositions = useMemo(() => {

    return replayMemoryData.map((memory) => {

      const angle = memory.timestamp * Math.PI * 2

      const x = Math.cos(angle) * RING_RADIUS
      const z = Math.sin(angle) * RING_RADIUS

      return {
        id: memory.id,
        position: new THREE.Vector3(
          ORB_POSITION.x + x,
          ORB_POSITION.y,
          ORB_POSITION.z + z
        )
      }

    })

  }, [])

  useFrame((_, delta) => {

    if (mode !== "REPLAY") return
    if (!cursorRef.current) return

    progress.current += delta * 0.05
    if (progress.current > 1) progress.current = 0

    const angle = progress.current * Math.PI * 2

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

    <group>

      <mesh position={ORB_POSITION} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[5.5, 5.7, 64]} />
        <meshStandardMaterial
          color="#88ccff"
          emissive="#88ccff"
          emissiveIntensity={1}
          transparent
          opacity={0.45}
        />
      </mesh>

      <mesh ref={cursorRef}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#88ccff"
          emissiveIntensity={1.2}
        />
      </mesh>

      {memoryPositions.map((m) => (
        <mesh key={m.id} position={m.position}>
          <sphereGeometry args={[0.15, 12, 12]} />
          <meshStandardMaterial
            color="#88ccff"
            emissive="#88ccff"
            emissiveIntensity={1}
          />
        </mesh>
      ))}

    </group>

  )

}