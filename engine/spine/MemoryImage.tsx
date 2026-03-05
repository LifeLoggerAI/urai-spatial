"use client"

import { useLoader } from "@react-three/fiber"
import { TextureLoader } from "three"

export default function MemoryImage({ position }) {

  const texture = useLoader(TextureLoader, "/memory.jpg")

  if (!position) return null

  const [x,y,z] = position

  return (
    <mesh position={[x,y,z + 0.02]} renderOrder={10}>
      <circleGeometry args={[0.7,64]} />
      <meshBasicMaterial
        map={texture}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}