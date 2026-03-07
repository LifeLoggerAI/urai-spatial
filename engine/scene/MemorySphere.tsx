"use client"

import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import { useSpatial } from "@/stores/spatialStore"

export default function MemorySphere(){

  const mode = useSpatial(s=>s.spatialMode)
  const position = useSpatial(s=>s.position)

  const ref = useRef<any>()

  useFrame(({clock})=>{

    if(!ref.current) return

    const s = 1 + Math.sin(clock.elapsedTime*2)*0.04

    ref.current.scale.set(s,s,s)

  })

  if(mode!=="memory") return null

  return(
    <mesh position={position} ref={ref}>
      <sphereGeometry args={[2,32,32]} />
      <meshBasicMaterial
        color="#7fa9c6"
        transparent
        opacity={0.35}
      />
    </mesh>
  )
}
