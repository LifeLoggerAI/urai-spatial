'use client'

import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type Props = {
  phase?: string | null
  selected?: [number, number, number] | null
}

function normalizePhase(phase?: string | null) {
  const p = String(phase || '').toUpperCase()
  if (p === 'ASCENT') return 'ASCENT'
  if (p === 'LIFEMAP') return 'LIFEMAP'
  if (p === 'FOCUS') return 'FOCUS'
  if (p === 'REPLAY') return 'REPLAY'
  return 'HOME'
}

export default function CinematicCameraRig({ phase, selected = null }: Props) {
  const { camera } = useThree()

  useFrame((state, delta) => {
    const p = normalizePhase(phase)
    const t = state.clock.getElapsedTime()

    let targetPos = new THREE.Vector3(0, 1.6, 10.5)
    let targetLook = new THREE.Vector3(0, 1.0, 0)
    let targetFov = 44
    let damp = 2.6

    if (p === 'ASCENT') {
      targetPos = new THREE.Vector3(0, 8.8, 22.0)
      targetLook = new THREE.Vector3(0, 4.2, -10.0)
      targetFov = 50
      damp = 2.0
    }

    if (p === 'LIFEMAP') {
      targetPos = new THREE.Vector3(
        Math.sin(t * 0.08) * 1.5,
        3.0 + Math.cos(t * 0.06) * 0.45,
        37.5 + Math.sin(t * 0.05) * 0.9
      )
      targetLook = new THREE.Vector3(
        Math.sin(t * 0.07) * 1.0,
        0.2 + Math.cos(t * 0.05) * 0.50,
        -18.0
      )
      targetFov = 56
      damp = 1.7
    }

    if (p === 'FOCUS') {
      const s = selected ? new THREE.Vector3(selected[0], selected[1], selected[2]) : new THREE.Vector3(0, 0, -18)
      targetPos = new THREE.Vector3(s.x + 0.4, s.y + 1.3, s.z + 8.6)
      targetLook = new THREE.Vector3(s.x, s.y, s.z)
      targetFov = 42
      damp = 2.5
    }

    if (p === 'REPLAY') {
      const s = selected ? new THREE.Vector3(selected[0], selected[1], selected[2]) : new THREE.Vector3(0, 0, -18)
      targetPos = new THREE.Vector3(s.x + 0.2, s.y + 0.8, s.z + 6.4)
      targetLook = new THREE.Vector3(s.x, s.y, s.z - 1.2)
      targetFov = 40
      damp = 2.8
    }

    const alpha = 1 - Math.exp(-delta * damp)
    camera.position.lerp(targetPos, alpha)

    const currentLook = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion).add(camera.position)
    currentLook.lerp(targetLook, alpha)
    camera.lookAt(currentLook)

    const c = camera as THREE.PerspectiveCamera
    c.fov = THREE.MathUtils.lerp(c.fov, targetFov, alpha)
    c.updateProjectionMatrix()
  })

  return null
}
