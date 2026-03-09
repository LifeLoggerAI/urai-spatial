"use client"

import { useMemoryTarget } from "../state/useMemoryTarget"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"

export default function MemorySphere(){

  const target = useMemoryTarget(s=>s.target)
  const locked = useMemoryTarget(s=>s.cameraLocked)

  const ref = useRef()

  useFrame(({clock})=>{

    if(!ref.current) return

    const t = clock.getElapsedTime()
    const s = 1 + Math.sin(t*2)*0.03

    ref.current.scale.set(s,s,s)

  })

  if(!target || !locked) return null

  return(
    <group position={[target[0],target[1],target[2]+0.35]} ref={ref}>

      <mesh>

        <sphereGeometry args={[1.0,64,64]} />

        <meshStandardMaterial
          color="#ffffff"
          emissive="#4a90ff"
          emissiveIntensity={1.5}
          transparent
          opacity={0.6}
        />

      </mesh>

      <mesh position={[0,0,0.45]}>

        <planeGeometry args={[0.6,0.6]} />

        <meshBasicMaterial color="white" />

      </mesh>

    </group>
  )
}
