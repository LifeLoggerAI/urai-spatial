"use client"

import { useSpatialStore } from "../state/spatialStore"
import { useFrame } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

export default function StarHalo(){

  const selectedStar = useSpatialStore(s=>s.selectedStar)

  const mesh = useRef(null)

  useFrame(({clock})=>{

    if(!mesh.current) return

    const pulse = 1 + Math.sin(clock.elapsedTime*2)*0.08

    mesh.current.scale.set(pulse,pulse,pulse)

  })

  if(!selectedStar) return null

  return(

    <mesh position={selectedStar.position} ref={mesh}>

      <sphereGeometry args={[0.35,32,32]} />

      <meshBasicMaterial
        color="#9bbcff"
        transparent
        opacity={0.35}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />

    </mesh>

  )

}
