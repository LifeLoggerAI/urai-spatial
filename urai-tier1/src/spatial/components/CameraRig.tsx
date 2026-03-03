'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { useSceneStore } from '../state/sceneStore'

function smooth(current: number, target: number) {
  return current + (target - current) * 0.04
}

export default function CameraRig() {
  const { camera } = useThree()
  const { mode } = useSceneStore()

  const targetPos = useRef(new THREE.Vector3(0, 0, 400))
  const lookTarget = useRef(new THREE.Vector3(0, 0, 0))
  const targetFov = useRef(65)

  useFrame(() => {
    if (mode === 'home') {
      targetPos.current.set(0, 10, 500)
      lookTarget.current.set(0, 0, 0)
      targetFov.current = 65
    }

    if (mode === 'lifemap') {
      targetPos.current.set(0, 200, 150)
      lookTarget.current.set(0, 200, 0)  // <-- critical change
      targetFov.current = 52
    }

    if (mode === 'memory' || mode === 'replay') {
      targetPos.current.set(0, 0, 25)
      lookTarget.current.set(0, 0, 0)
      targetFov.current = 38
    }

    camera.position.x = smooth(camera.position.x, targetPos.current.x)
    camera.position.y = smooth(camera.position.y, targetPos.current.y)
    camera.position.z = smooth(camera.position.z, targetPos.current.z)

    camera.fov = smooth(camera.fov, targetFov.current)
    camera.updateProjectionMatrix()

    camera.lookAt(lookTarget.current)
  })

  return null
}
