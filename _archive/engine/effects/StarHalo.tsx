"use client"

import { useSpatialStore } from "../state/spatialStore"
import { useFrame, useThree } from "@react-three/fiber"
import { useEffect, useRef } from "react"
import * as THREE from "three"

export default function StarHalo() {
  const selectedStar = useSpatialStore((s) => s.selectedStar)

  const meshRef = useRef<THREE.Mesh>(null!)
  const startTimeRef = useRef(0)
  const lastStarIdRef = useRef<string | null>(null)

  const { camera } = useThree()

  useEffect(() => {
    if (!selectedStar) {
      lastStarIdRef.current = null
      return
    }

    if (lastStarIdRef.current !== selectedStar.id) {
      startTimeRef.current = 0
      lastStarIdRef.current = selectedStar.id
    }
  }, [selectedStar])

  useFrame(({ clock }) => {
    const mesh = meshRef.current
    if (!mesh || !selectedStar) return

    if (startTimeRef.current === 0) {
      startTimeRef.current = clock.elapsedTime
    }

    const t = clock.elapsedTime - startTimeRef.current

    // Follow selected star every frame in case its Vector3 is mutated externally.
    mesh.position.copy(selectedStar.position)

    // Soft pulse
    const pulse = 1 + Math.sin(t * 2.0) * 0.08
    mesh.scale.setScalar(pulse)

    // Billboard toward camera
    mesh.quaternion.copy(camera.quaternion)
  })

  if (!selectedStar) return null

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <planeGeometry args={[3.2, 3.2]} />
      <meshBasicMaterial
        color="#9bbcff"
        transparent
        opacity={0.42}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        depthTest={true}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}