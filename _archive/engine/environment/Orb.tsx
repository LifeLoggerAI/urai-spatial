"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function Orb() {

  const meshRef = useRef<THREE.Mesh>(null!)
  const haloRef = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(0.25, 48, 48)
  }, [])

  const haloGeometry = useMemo(() => {
    return new THREE.SphereGeometry(0.35, 32, 32)
  }, [])

  const baseColor = useMemo(() => new THREE.Color("#7fd8ff"), [])

  useFrame(({ clock }) => {

    const mesh = meshRef.current
    const halo = haloRef.current

    if (!mesh) return

    const t = clock.getElapsedTime()

    const pulse = 1 + Math.sin(t * 2.2) * 0.06

    mesh.scale.setScalar(pulse)
    mesh.rotation.y += 0.002

    if (halo) {
      halo.scale.setScalar(pulse * 1.25)
    }

  })

  useEffect(() => {
    return () => {
      geometry.dispose()
      haloGeometry.dispose()
    }
  }, [geometry, haloGeometry])

  return (
    <group position={[0, 0, -2]} frustumCulled={false}>

      <mesh ref={meshRef} geometry={geometry}>
        <meshStandardMaterial
          color={baseColor}
          emissive={baseColor}
          emissiveIntensity={2.2}
          roughness={0.15}
          metalness={0}
        />
      </mesh>

      <mesh ref={haloRef} geometry={haloGeometry}>
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

    </group>
  )
}