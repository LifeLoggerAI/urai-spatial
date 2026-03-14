"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Mesh, SphereGeometry } from "three"

interface Props {
  position: [number, number, number]
}

export default function MomentContainer({ position }: Props) {

  const meshRef = useRef<Mesh | null>(null)
  const scaleRef = useRef(0)

  const geometry = useMemo(
    () => new SphereGeometry(0.3, 32, 32),
    []
  )

  useFrame((_, delta) => {

    if (!meshRef.current) return

    if (scaleRef.current < 1) {
      scaleRef.current += delta * 1.2
      scaleRef.current = Math.min(scaleRef.current, 1)

      const s = 1 + scaleRef.current * 4
      meshRef.current.scale.set(s, s, s)
    }

  })

  return (

    <mesh
      ref={meshRef}
      position={position}
      geometry={geometry}
      frustumCulled={false}
    >

      <meshStandardMaterial
        emissive="#ffffff"
        emissiveIntensity={3}
        toneMapped={false}
        color="#111111"
      />

    </mesh>

  )

}