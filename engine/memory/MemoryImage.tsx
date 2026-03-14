"use client"

import { useRef, useMemo } from "react"
import { useSpatialStore } from "../store/spatialStore"
import { useLoader, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryImage(){

  const star = useSpatialStore((s)=>s.selectedStar)

  const { camera } = useThree()

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  const meshRef = useRef<THREE.Mesh>(null!)

  useMemo(()=>{
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
  },[texture])

  useFrame(()=>{
    if(meshRef.current){
      meshRef.current.lookAt(camera.position)
    }
  })

  if(!star) return null

  const [x,y,z] = star.position

  return(

    <mesh
      ref={meshRef}
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