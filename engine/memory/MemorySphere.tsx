"use client"

import { useSpatialStore } from "../state/spatialStore"
import { useFrame, useLoader } from "@react-three/fiber"
import * as THREE from "three"
import { useRef, useEffect } from "react"

export default function MemorySphere(){

  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const meshRef = useRef<THREE.Mesh>(null!)

  const texture = useLoader(
    THREE.TextureLoader,
    "/memory/sample.jpg"
  )

  useEffect(()=>{
    texture.colorSpace = THREE.SRGBColorSpace
    texture.anisotropy = 16
    texture.needsUpdate = true
  },[texture])

  useFrame(({clock})=>{

    if(!meshRef.current) return

    const t = clock.getElapsedTime()

    // subtle breathing pulse
    const pulse = 1 + Math.sin(t * 0.8) * 0.015

    meshRef.current.scale.set(pulse,pulse,pulse)

  })

  if(!selectedStar) return null

  return(

    <mesh
      ref={meshRef}
      position={selectedStar.position}
      scale={[-1,1,1]} // invert sphere so texture renders inside
    >

      {/* larger radius so camera remains outside sphere */}
      <sphereGeometry args={[2.6,96,96]} />

      <meshBasicMaterial
        map={texture}
        side={THREE.BackSide}
      />

    </mesh>

  )
}