"use client"

import { useSpatialStore } from "../store/spatialStore"
import { useLoader } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryImage(){

  const star = useSpatialStore((s)=>s.selectedStar)

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  if(!star) return null

  const [x,y,z] = star.position

  return(

    <mesh
      position={[x, y, z + 0.06]}
      renderOrder={10}
    >

      <planeGeometry args={[0.9,0.9]} />

      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
        depthWrite={false}
        depthTest={false}
      />

    </mesh>

  )

}