'use client'

import * as THREE from 'three'
import { useSceneStore } from '@/spatial/state/sceneStore'

export default function MemorySphere() {
  const mode = useSceneStore((s) => s.mode)
  const selectedStarPosition = useSceneStore((s) => s.selectedStarPosition)

  if (mode !== 'memory' || !selectedStarPosition) {
    return null
  }

  return (
    <mesh position={selectedStarPosition}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.5}
        depthWrite={false}
      />
    </mesh>
  )
}