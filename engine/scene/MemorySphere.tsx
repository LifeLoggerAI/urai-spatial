"use client"

import { useSpatialStore } from "../state/spatialStore"
import { useLoader, useFrame } from "@react-three/fiber"
import { TextureLoader, BackSide } from "three"
import { useRef, useEffect } from "react"

export default function MemorySphere(){

  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const texture = useLoader(TextureLoader,"/memory/sample.jpg")

  const sphere = useRef<any>(null)

  // reset scale when star changes
  useEffect(()=>{
    if(sphere.current){
      sphere.current.scale.set(1,1,1)
    }
  },[selectedStar])

  useFrame((state)=>{

    if(!sphere.current || !selectedStar) return

    const t = state.clock.elapsedTime

    const pulse = 1 + Math.sin(t * 1.2) * 0.03

    sphere.current.scale.set(pulse,pulse,pulse)

  })

  if(!selectedStar) return null

  return(

    <mesh
      ref={sphere}
      position={selectedStar.position}
    >

      <sphereGeometry args={[1.6,64,64]} />

      <meshStandardMaterial
        map={texture}
        side={BackSide}
        transparent
        opacity={0.95}
        roughness={0.25}
        metalness={0.05}
        emissive="#223355"
        emissiveIntensity={0.45}
      />

    </mesh>

  )

}