"use client"

import { useSpatialStore } from "../../stores/useSpatialStore"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"

export default function MemorySphere(){

  const target=useSpatialStore(s=>s.selected)
  const arrived=useSpatialStore(s=>s.arrived)

  const mesh=useRef<any>()

  useFrame(({clock})=>{
    if(!mesh.current) return
    const t=clock.getElapsedTime()
    mesh.current.scale.setScalar(1+Math.sin(t*2)*0.04)
  })

  if(!target||!arrived) return null

  return(
    <mesh ref={mesh} position={target}>
      <sphereGeometry args={[4,32,32]}/>
      <meshBasicMaterial
        color="#6e8fb8"
        transparent
        opacity={0.45}
      />
    </mesh>
  )
}
