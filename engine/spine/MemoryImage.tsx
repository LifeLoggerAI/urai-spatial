"use client"

import { useLoader } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryImage({ position }){

  const texture = useLoader(THREE.TextureLoader,"/memory.jpg")

  if(!position) return null

  return (
    <mesh position={[position[0],position[1],position[2]-0.2]}>
      <planeGeometry args={[2,2]} />
      <meshBasicMaterial map={texture} transparent />
    </mesh>
  )
}
