"use client"

import { useRef, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"

export default function CameraRig(){

  const { camera } = useThree()

  const yaw = useRef(0)
  const pitch = useRef(0.8)
  const radius = useRef(320)

  const target = useMemo(()=> new THREE.Vector3(0,0,0),[])

  const pos = useRef(new THREE.Vector3())

  useFrame((_,dt)=>{

    /* slow orbit motion */

    yaw.current += dt * 0.05

    const x = Math.sin(yaw.current) * radius.current
    const z = Math.cos(yaw.current) * radius.current
    const y = Math.sin(pitch.current) * radius.current * 0.4 + 80

    pos.current.set(x,y,z)

    /* smooth camera motion */

    camera.position.lerp(pos.current,0.06)

    camera.lookAt(target)

  })

  return null

}