"use client"

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"

export default function Orb(){

  const ref = useRef<any>()

  useFrame(({clock})=>{
    if(!ref.current) return
    const t = clock.elapsedTime
    const s = 1 + Math.sin(t*1.5)*0.06
    ref.current.scale.set(s,s,s)
  })

  return(
    <mesh position={[0,0,-8]} ref={ref}>
      <sphereGeometry args={[0.6,32,32]}/>
      <meshBasicMaterial
        color="#6fd3ff"
        transparent
        opacity={0.9}
      />
    </mesh>
  )
}
