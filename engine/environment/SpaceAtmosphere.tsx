"use client"

import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

export default function SpaceAtmosphere(){

  const { scene } = useThree()

  useEffect(()=>{

    scene.fog = new THREE.FogExp2("#02020a",0.08)

  },[scene])

  return(
    <>
      <ambientLight intensity={0.6} />

      <directionalLight
        position={[3,5,6]}
        intensity={0.7}
      />

      <directionalLight
        position={[-4,-2,3]}
        intensity={0.25}
      />
    </>
  )
}
