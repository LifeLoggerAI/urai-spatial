"use client"

import { useSpatialStore } from "../store/spatialStore"
import { useLoader } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryContent(){

  const selectedStar = useSpatialStore((s)=>s.selectedStar)

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  if(!selectedStar) return null

  const [x,y,z] = selectedStar.position

  return (
    <mesh position={[x, y, z + 0.02]}>
      <planeGeometry args={[1.2,1.2]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}