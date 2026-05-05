'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'

export default function CinematicCameraRig({ active, focusPosition }: { active: boolean; focusPosition?: readonly [number, number, number] | null }) {
  const { camera } = useThree()
  const defaultTarget = useMemo(() => new Vector3(0, 1.35, -1.9), [])
  const lookTarget = useRef(defaultTarget.clone())
  const desiredPosition = useRef(new Vector3(0, 1.2, 4))

  useEffect(() => {
    camera.position.set(0, 1.2, 4)
    camera.lookAt(defaultTarget)
  }, [camera, defaultTarget])

  useFrame(({ clock }) => {
    if (!active) return

    const t = clock.elapsedTime
    const target = focusPosition ? new Vector3(focusPosition[0], focusPosition[1], focusPosition[2]) : defaultTarget
    const orbitalDrift = Math.sin(t * 0.22) * 0.18
    const lift = Math.sin(t * 0.31) * 0.04

    lookTarget.current.lerp(target, 0.055)

    if (focusPosition) {
      desiredPosition.current.set(target.x * 0.72 + orbitalDrift, target.y + 0.6 + lift, target.z + 2.25)
    } else {
      desiredPosition.current.set(orbitalDrift, 1.24 + lift, 3.72)
    }

    camera.position.lerp(desiredPosition.current, focusPosition ? 0.045 : 0.025)
    camera.lookAt(lookTarget.current)
  })

  return null
}
