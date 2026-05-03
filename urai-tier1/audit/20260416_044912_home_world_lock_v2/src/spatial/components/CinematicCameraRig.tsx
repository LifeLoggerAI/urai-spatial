'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

export type CinematicCameraRigProps = {
  phase?: string
  selected?: [number, number, number]
}

function normalizePhase(input: unknown): string {
  return String(input ?? 'HOME').toUpperCase()
}

function poseForPhase(phase: string, selected?: [number, number, number]) {
  const star = selected ?? [0, 0.7, -8.6]

  switch (phase) {
    case 'ASCENT':
      return {
        position: new THREE.Vector3(2.25, 2.45, 6.75),
        lookAt: new THREE.Vector3(0.1, -0.2, -4.9),
        damp: 0.078,
      }
    case 'LIFEMAP':
      return {
        position: new THREE.Vector3(0.10, 0.75, 11.2),
        lookAt: new THREE.Vector3(0.05, 0.18, -8.8),
        damp: 0.060,
      }
    case 'FOCUS':
      return {
        position: new THREE.Vector3(star[0] + 1.75, star[1] + 0.82, star[2] + 4.8),
        lookAt: new THREE.Vector3(star[0] + 0.10, star[1] + 0.12, star[2] - 0.08),
        damp: 0.062,
      }
    case 'REPLAY':
      return {
        position: new THREE.Vector3(star[0] + 1.05, star[1] + 0.58, star[2] + 3.3),
        lookAt: new THREE.Vector3(star[0], star[1] + 0.06, star[2] - 0.18),
        damp: 0.060,
      }
    case 'HOME':
    default:
      return {
        position: new THREE.Vector3(6.45, 1.42, 10.35),
        lookAt: new THREE.Vector3(0.0, -0.18, -4.25),
        damp: 0.052,
      }
  }
}

export default function CinematicCameraRig({ phase = 'HOME', selected }: CinematicCameraRigProps) {
  const { camera } = useThree()
  const targetLook = useRef(new THREE.Vector3())
  const tmp = useMemo(() => new THREE.Vector3(), [])
  const pose = poseForPhase(normalizePhase(phase), selected)

  useEffect(() => {
    targetLook.current.copy(pose.lookAt)
  }, [pose])

  useFrame((_, delta) => {
    const alpha = 1 - Math.exp(-Math.max(0.001, delta) / pose.damp)
    camera.position.lerp(pose.position, alpha)
    tmp.copy(targetLook.current)
    camera.lookAt(tmp)
    camera.updateProjectionMatrix()
  })

  return null
}
