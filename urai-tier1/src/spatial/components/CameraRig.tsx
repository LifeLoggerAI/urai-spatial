'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '@/spatial/state/sceneStore'

export default function CameraRig() {
  const { camera } = useThree()
  const cam = camera as THREE.PerspectiveCamera

  const mode = useSceneStore((s) => s.mode)

  const targetPos = useRef(new THREE.Vector3(0, 0, 180))
  const targetLook = useRef(new THREE.Vector3(0, 0, 0))
  const smoothLook = useRef(new THREE.Vector3(0, 0, 0))
  const targetFov = useRef(65)

  useFrame((_, delta) => {
    const posLerp = 1 - Math.exp(-3.5 * delta)
    const lookLerp = 1 - Math.exp(-5.5 * delta)
    const fovLerp = 1 - Math.exp(-4.5 * delta)

    switch (mode) {
      case 'home':
        targetPos.current.set(0, 0, 180)
        targetLook.current.set(0, 0, 0)
        targetFov.current = 65
        break

      case 'lifemap':
        targetPos.current.set(0, 60, 140)
        targetLook.current.set(0, 0, 0)
        targetFov.current = 58
        break

      case 'memory':
        targetPos.current.set(0, 0, 30)
        targetLook.current.set(0, 0, 0)
        targetFov.current = 40
        break

      case 'replay':
        targetPos.current.set(0, 0, 18)
        targetLook.current.set(0, 0, 0)
        targetFov.current = 36
        break
    }

    cam.position.lerp(targetPos.current, posLerp)
    smoothLook.current.lerp(targetLook.current, lookLerp)
    cam.lookAt(smoothLook.current)

    cam.fov = THREE.MathUtils.lerp(cam.fov, targetFov.current, fovLerp)
    cam.updateProjectionMatrix()
  })

  return null
}