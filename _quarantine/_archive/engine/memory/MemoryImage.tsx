"use client"

import { useRef, useEffect } from "react"
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

  useEffect(()=>{

    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 8
    texture.needsUpdate = true

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
      position={[x, y, z + 0.08]}
      renderOrder={10}
      frustumCulled={false}
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