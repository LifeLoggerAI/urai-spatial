"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function Orb(){

  const ref = useRef<THREE.Mesh>(null!)

  const geometry = useMemo(
    () => new THREE.SphereGeometry(0.25, 32, 32),
    []
  )

  useFrame(({ clock }) => {

    if (!ref.current) return

    const t = clock.getElapsedTime()

    const pulse = 1 + Math.sin(t * 2) * 0.05

    ref.current.scale.set(pulse, pulse, pulse)

    ref.current.rotation.y += 0.002

  })

  return(

    <mesh
      ref={ref}
      geometry={geometry}
      position={[0,0,-2]}
      frustumCulled={false}
    >

      <meshStandardMaterial
        color="#7fd8ff"
        emissive="#7fd8ff"
        emissiveIntensity={2}
        roughness={0.15}
        metalness={0}
      />

    </mesh>

  )

}