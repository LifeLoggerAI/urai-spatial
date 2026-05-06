'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { Vector3 } from 'three'

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export default function CinematicCameraRig({ active, focusPosition }: { active: boolean; focusPosition?: readonly [number, number, number] | null }) {
  const { camera } = useThree()
  const defaultTarget = useMemo(() => new Vector3(0, -0.18, -2.85), [])
  const lookTarget = useRef(defaultTarget.clone())
  const desiredPosition = useRef(new Vector3(0, 0.72, 5.35))
  const transition = useRef({ key: 'idle', progress: 1 })

  useEffect(() => {
    camera.position.set(0, 0.72, 5.35)
    camera.lookAt(defaultTarget)
  }, [camera, defaultTarget])

  useFrame(({ clock }, delta) => {
    if (!active) return

    const t = clock.elapsedTime
    const focusKey = focusPosition ? focusPosition.join(':') : 'default'
    if (transition.current.key !== focusKey) {
      transition.current = { key: focusKey, progress: 0 }
    }

    transition.current.progress = Math.min(1, transition.current.progress + delta * 0.62)
    const eased = easeInOutCubic(transition.current.progress)

    const target = focusPosition ? new Vector3(focusPosition[0], focusPosition[1], focusPosition[2]) : defaultTarget
    const orbitalDrift = Math.sin(t * 0.18) * 0.28
    const sideBreath = Math.cos(t * 0.13) * 0.1
    const lift = Math.sin(t * 0.27) * 0.055
    const settle = focusPosition ? Math.sin(eased * Math.PI) * 0.16 : 0

    lookTarget.current.lerp(target, 0.032 + eased * 0.052)

    if (focusPosition) {
      desiredPosition.current.set(target.x * 0.7 + orbitalDrift, target.y + 0.58 + lift + settle, target.z + 2.22 - settle)
    } else {
      desiredPosition.current.set(orbitalDrift + sideBreath, 0.72 + lift, 5.35 + Math.sin(t * 0.11) * 0.18)
    }

    camera.position.lerp(desiredPosition.current, focusPosition ? 0.032 + eased * 0.045 : 0.026)
    camera.lookAt(lookTarget.current)
  })

  return null
}
