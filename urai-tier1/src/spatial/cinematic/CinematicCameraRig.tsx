'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'

export default function CinematicCameraRig({ active }: { active: boolean }) {
  const { camera } = useThree()
  const target = useRef(new Vector3(0, 1.35, -1.9))

  useEffect(() => {
    camera.position.set(0, 1.2, 4)
    camera.lookAt(target.current)
  }, [camera])

  useFrame(({ clock }) => {
    if (!active) return

    const t = clock.elapsedTime
    const orbit = Math.sin(t * 0.22) * 0.18
    const lift = Math.sin(t * 0.31) * 0.04

    camera.position.x += (orbit - camera.position.x) * 0.035
    camera.position.y += (1.24 + lift - camera.position.y) * 0.035
    camera.position.z += (3.72 - camera.position.z) * 0.025
    camera.lookAt(target.current)
  })

  return null
}
