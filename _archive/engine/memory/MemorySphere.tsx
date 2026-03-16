"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useSpatialStore } from "../state/spatialStore"

export default function MemorySphere(){

  const mesh = useRef<THREE.Mesh>(null!)
  const material = useRef<THREE.MeshStandardMaterial>(null!)

  const pos = useSpatialStore(s => s.selectedStarPosition)

  useFrame(({ clock }) => {

    if (!mesh.current || !material.current) return

    const t = clock.getElapsedTime()

    mesh.current.rotation.y += 0.006

    const pulse = 1 + Math.sin(t * 2.2) * 0.06
    mesh.current.scale.set(pulse, pulse, pulse)

    material.current.emissiveIntensity =
      1.2 + Math.sin(t * 3.5) * 0.25
  })

  if (!pos) return null

  return(

    <mesh
      ref={mesh}
      position={pos}
      renderOrder={5}
      frustumCulled={false}
    >

      <sphereGeometry args={[4, 48, 48]} />

      <meshStandardMaterial
        ref={material}
        color="#4aa8ff"
        emissive="#4aa8ff"
        emissiveIntensity={1.2}
        metalness={0.1}
        roughness={0.25}
        transparent
        opacity={0.85}
      />

    </mesh>

  )
}