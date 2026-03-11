"use client"

import { useRef } from "react"
import { useFrame } from "@react-three/fiber"

export default function NebulaFog(){

  const ref = useRef()

  useFrame(({clock})=>{

    if(!ref.current) return

    ref.current.rotation.z = clock.elapsedTime * 0.01

  })

  return(

    <mesh ref={ref} position={[0,0,-120]}>

      <planeGeometry args={[500,500]} />

      <meshBasicMaterial
        color="#24325f"
        transparent
        opacity={0.08}
        depthWrite={false}
      />

    </mesh>

  )

}
