'use client'

import { useThree, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

type Props = {
  mode: 'home' | 'lifemap' | 'focus' | 'replay'
  transitionPhase?: string
}

function getTarget(mode: Props['mode']) {
  switch (mode) {
    case 'home':
      return { pos: new THREE.Vector3(0, 1.2, 11), look: new THREE.Vector3(0, 0, 0) }
    case 'lifemap':
      return { pos: new THREE.Vector3(0, 0.4, 9), look: new THREE.Vector3(0, 0, -20) }
    case 'focus':
      return { pos: new THREE.Vector3(0, 0.2, 6.2), look: new THREE.Vector3(0, 0, -8) }
    case 'replay':
      return { pos: new THREE.Vector3(0, 0, 2.2), look: new THREE.Vector3(0, 0, -12) }
  }
}

export default function CinematicCameraRig({ mode }: Props) {
  const { camera } = useThree()

  const velocity = useRef(new THREE.Vector3())
  const targetPos = useRef(new THREE.Vector3())
  const targetLook = useRef(new THREE.Vector3())

  useFrame((_, dt) => {
    const t = getTarget(mode)

    targetPos.current.copy(t.pos)
    targetLook.current.copy(t.look)

    // critically damped motion (no float)
    const stiffness = 6.5
    const damping = 0.82

    const toTarget = targetPos.current.clone().sub(camera.position)
    velocity.current.add(toTarget.multiplyScalar(stiffness * dt))
    velocity.current.multiplyScalar(damping)

    camera.position.add(velocity.current)

    camera.lookAt(targetLook.current)
  })

  return null
}
