"use client"

import { useRef, useEffect } from "react"
import { useSpatialStore } from "../store/spatialStore"
import { useLoader, useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function MemoryContent(){

  const selectedStar = useSpatialStore((s)=>s.selectedStar)

  const { camera } = useThree()

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  const meshRef = useRef<THREE.Mesh>(null!)

  useEffect(()=>{
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
  },[texture])

  useFrame(()=>{
    if(!selectedStar) return
    if(meshRef.current){
      meshRef.current.lookAt(camera.position)
    }
  })

  if(!selectedStar) return null

  const [x,y,z] = selectedStar.position

  return (
    <mesh ref={meshRef} position={[x, y, z + 0.02]}>
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