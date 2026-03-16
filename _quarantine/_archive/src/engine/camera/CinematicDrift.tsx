"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useRef } from "react"

export default function CinematicDrift() {
  const { camera } = useThree()

  const t = useRef(0)
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0))

  useFrame((_, delta) => {
    t.current += delta * 0.05

    camera.position.x = Math.sin(t.current) * 40
    camera.position.z = 260 + Math.cos(t.current) * 20
    camera.position.y = 80 + Math.sin(t.current * 0.5) * 10

    camera.lookAt(lookTarget.current)
  })

  return null
}