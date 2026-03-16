"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useRef } from "react"
import { cameraTarget } from "../../camera/cameraStore"

export default function CameraRig() {

  const { camera } = useThree()

  const currentPos = useRef(new THREE.Vector3())
  const currentLook = useRef(new THREE.Vector3())

  const damping = 0.06

  useFrame(() => {

    if (!cameraTarget.active) return

    currentPos.current.lerp(cameraTarget.position, damping)
    currentLook.current.lerp(cameraTarget.lookAt, damping)

    camera.position.copy(currentPos.current)
    camera.lookAt(currentLook.current)

  })

  return null
}