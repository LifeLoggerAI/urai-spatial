"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function MemorySphere({ position }:{position:[number,number,number]}){

  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state)=>{

    const t = state.clock.getElapsedTime()

    const pulse = 1 + Math.sin(t*2)*0.03

    ref.current.scale.set(pulse,pulse,pulse)

  })

  return(

    <mesh ref={ref} position={position} scale={3}>

      <sphereGeometry args={[1,32,32]}/>

      <meshStandardMaterial
        color="#6e8593"
        transparent
        opacity={0.35}
        roughness={0.2}
        metalness={0.1}
      />

    </mesh>

  )
}
