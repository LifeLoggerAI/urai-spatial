"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

interface Props {
  position: [number, number, number]
}

export default function MomentContainer({ position }: Props) {

  const meshRef = useRef<THREE.Mesh>(null!)
  const grow = useRef(0)

  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(0.35, 32, 32)
  }, [])

  useFrame((state, delta) => {

    const mesh = meshRef.current
    if (!mesh) return

    /* grow animation */

    if (grow.current < 1) {
      grow.current += delta * 1.1
      grow.current = Math.min(grow.current, 1)
    }

    /* smooth scale */

    const baseScale = 1 + grow.current * 4

    /* subtle idle pulse */

    const pulse =
      Math.sin(state.clock.elapsedTime * 2.2) * 0.05

    const s = baseScale + pulse

    mesh.scale.set(s, s, s)

  })

  return (

    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      frustumCulled={false}
    >

      <meshStandardMaterial
        color="#0a0a0a"
        emissive="#ffffff"
        emissiveIntensity={2.8}
        roughness={0.2}
        metalness={0.0}
        toneMapped={false}
      />

    </mesh>

  )

}