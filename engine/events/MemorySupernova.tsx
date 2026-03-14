'use client'

import { useEffect, useRef } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySupernova() {

  const selectedStar = useSpatialStore(s => s.selectedStar)

  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)

  const startTime = useRef<number | null>(null)

  useEffect(() => {
    if (selectedStar) {
      startTime.current = null
      if (meshRef.current) meshRef.current.visible = true
    }
  }, [selectedStar])

  useFrame(({ clock }) => {

    const mesh = meshRef.current
    const material = materialRef.current

    if (!mesh || !material || !selectedStar) {
      if (mesh) mesh.visible = false
      return
    }

    if (startTime.current === null) {
      startTime.current = clock.elapsedTime
    }

    const elapsed = clock.elapsedTime - startTime.current

    const scale = 1 + elapsed * 2
    const opacity = Math.max(0, 1 - elapsed / 2)

    mesh.position.set(
      selectedStar.position[0],
      selectedStar.position[1],
      selectedStar.position[2]
    )

    mesh.scale.set(scale, scale, scale)
    material.opacity = opacity

    if (opacity <= 0) {
      mesh.visible = false
    }

  })

  return (
    <mesh ref={meshRef} visible={false}>
      <ringGeometry args={[0.5, 0.6, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ffffff"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        transparent
      />
    </mesh>
  )
}