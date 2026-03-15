"use client"

import { useEffect, useRef, useMemo } from "react"
import * as THREE from "three"
import { useFrame } from "@react-three/fiber"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySupernova() {

  const selectedStar = useSpatialStore((s) => s.selectedStar)

  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null!)

  const startTime = useRef<number | null>(null)
  const lastStarId = useRef<number | null>(null)

  const geometry = useMemo(() => {
    return new THREE.RingGeometry(0.5, 0.6, 48)
  }, [])

  useEffect(() => {

    if (!selectedStar) return

    if (lastStarId.current !== selectedStar.id) {
      lastStarId.current = selectedStar.id
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

    mesh.scale.setScalar(scale)
    material.opacity = opacity

    if (opacity <= 0) {
      mesh.visible = false
    }

  })

  useEffect(() => {
    return () => {
      geometry.dispose()
    }
  }, [geometry])

  return (
    <mesh ref={meshRef} geometry={geometry} visible={false}>
      <meshBasicMaterial
        ref={materialRef}
        color="#ffffff"
        side={THREE.DoubleSide}
        blending={THREE.AdditiveBlending}
        transparent
        depthWrite={false}
      />
    </mesh>
  )
}