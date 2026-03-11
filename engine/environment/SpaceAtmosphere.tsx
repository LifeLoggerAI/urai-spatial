"use client"

import { useThree } from "@react-three/fiber"
import { useEffect } from "react"
import * as THREE from "three"

export default function SpaceAtmosphere(){

  const { scene } = useThree()

  useEffect(()=>{

    scene.fog = new THREE.FogExp2("#02020a",0.06)

  },[scene])

  return(
    <>
      <ambientLight intensity={0.35}/>
    </>
  )
}
