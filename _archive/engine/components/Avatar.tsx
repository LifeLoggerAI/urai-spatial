"use client"

import { useMemo } from "react"
import * as THREE from "three"

type AvatarProps = {
  position?: [number, number, number]
  rotation?: [number, number, number]
}

export default function Avatar({ position, rotation }: AvatarProps) {

  const bodyGeometry = useMemo(
    () => new THREE.CapsuleGeometry(0.75, 3.6, 8, 16),
    []
  )

  const headGeometry = useMemo(
    () => new THREE.SphereGeometry(0.85, 32, 32),
    []
  )

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#05060a",
        roughness: 1,
        metalness: 0
      }),
    []
  )

  const headMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#1a1c22",
        roughness: 0.9,
        metalness: 0,
        emissive: "#0b0d12",
        emissiveIntensity: 0.3
      }),
    []
  )

  return (

    <group
      position={position ?? [0, 0, 0]}
      rotation={rotation ?? [0, 0, 0]}
      frustumCulled={false}
    >

      <mesh
        geometry={bodyGeometry}
        material={bodyMaterial}
        position={[0, 2.0, 0]}
      />

      <mesh
        geometry={headGeometry}
        material={headMaterial}
        position={[0, 4.0, 0]}
      />

    </group>

  )

}