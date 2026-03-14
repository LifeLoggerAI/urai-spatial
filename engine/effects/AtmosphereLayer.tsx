"use client"

import { useThree } from "@react-three/fiber"
import { useEffect, useMemo } from "react"
import * as THREE from "three"

export default function AtmosphereLayer(){

  const { scene } = useThree()

  const fog = useMemo(()=>{

    const color = new THREE.Color("#04060c")

    /* softer atmospheric depth for large space scenes */
    return new THREE.FogExp2(color,0.008)

  },[])

  useEffect(()=>{

    const previousFog = scene.fog

    scene.fog = fog

    return ()=>{
      scene.fog = previousFog ?? null
    }

  },[scene,fog])

  return null

}