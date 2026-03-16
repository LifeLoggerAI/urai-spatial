"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

export default function CinematicCamera() {
  const { camera } = useThree()

  const time = useRef(0)
  const target = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_, delta) => {
    time.current += delta * 0.04

    camera.position.x = Math.sin(time.current) * 80
    camera.position.z = 280 + Math.cos(time.current) * 40
    camera.position.y = 120 + Math.sin(time.current * 0.5) * 25

    camera.lookAt(target.current)
  })

  return null
}