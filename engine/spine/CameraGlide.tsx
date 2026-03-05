"use client"

import { useFrame, useThree } from "@react-three/fiber"
import { useRef } from "react"
import * as THREE from "three"

export default function CameraGlide({ target }) {

  const { camera } = useThree()
  const desired = useRef(new THREE.Vector3())

  useFrame(() => {

    if (!target) return

    desired.current.set(
      target[0],
      target[1],
      target[2] + 8
    )

    camera.position.lerp(desired.current, 0.05)
    camera.lookAt(target[0], target[1], target[2])

  })

  return null
}
