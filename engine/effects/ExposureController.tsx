"use client"

import { useThree, useFrame } from "@react-three/fiber"
import { useRef, useEffect } from "react"
import * as THREE from "three"

export default function ExposureController(){

  const { camera, gl } = useThree()

  const minExposure = 0.25
  const maxExposure = 0.85

  const near = 20
  const far = 600

  const exposure = useRef(0.45)

  useEffect(()=>{

    gl.toneMapping = THREE.ACESFilmicToneMapping
    gl.toneMappingExposure = exposure.current

  },[gl])

  useFrame(()=>{

    const dist = camera.position.length()

    let t = (dist - near) / (far - near)

    if(t < 0) t = 0
    if(t > 1) t = 1

    const target =
      minExposure + (maxExposure - minExposure) * t

    exposure.current += (target - exposure.current) * 0.035

    gl.toneMappingExposure = exposure.current

  })

  return null

}