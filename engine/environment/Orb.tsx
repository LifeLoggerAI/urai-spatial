"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

export default function Orb(){

  const ref = useRef<THREE.Mesh>(null!)

  useFrame((state)=>{

    const t = state.clock.getElapsedTime()

    const pulse = 1 + Math.sin(t*2)*0.05

    ref.current.scale.set(pulse,pulse,pulse)

    ref.current.rotation.y += 0.002

  })

  return(

    <mesh ref={ref} position={[0,0,-2]}>

      <sphereGeometry args={[0.25,32,32]}/>

      <meshStandardMaterial
        color="#7fd8ff"
        emissive="#7fd8ff"
        emissiveIntensity={2}
        roughness={0.1}
        metalness={0.0}
      />

    </mesh>

  )

}
