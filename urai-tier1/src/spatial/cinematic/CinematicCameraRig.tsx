'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { CameraPathKey, cameraPathPresets } from './cameraPaths'

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

export default function CinematicCameraRig({
  active,
  focusPosition,
  path = 'arrival',
  reducedMotion = false,
}: {
  active: boolean
  focusPosition?: readonly [number, number, number] | null
  path?: CameraPathKey
  reducedMotion?: boolean
}) {
  const { camera, size } = useThree()
  const lookTarget = useRef(cameraPathPresets.arrival.target.clone())
  const desiredPosition = useRef(cameraPathPresets.arrival.position.clone())
  const transition = useRef({ key: 'idle', progress: 1 })

  useEffect(() => {
    const preset = cameraPathPresets[path]
    camera.position.copy(preset.position)
    camera.lookAt(preset.target)
    if (camera instanceof PerspectiveCamera) {
      camera.fov = size.width <= 430 ? Math.min(64, preset.fov + 6) : preset.fov
      camera.updateProjectionMatrix()
    }
  }, [camera, path, size.width])

  useFrame(({ clock }, delta) => {
    if (!active) return

    const t = clock.elapsedTime
    const preset = cameraPathPresets[path]
    const focusKey = focusPosition ? focusPosition.join(':') : path
    if (transition.current.key !== focusKey) {
      transition.current = { key: focusKey, progress: reducedMotion ? 1 : 0 }
    }

    transition.current.progress = Math.min(1, transition.current.progress + delta * (reducedMotion ? 3.5 : 0.62))
    const eased = reducedMotion ? 1 : easeInOutCubic(transition.current.progress)
    const mobileOffset = size.width <= 390 ? 0.36 : size.width <= 430 ? 0.22 : 0

    const target = focusPosition ? new Vector3(focusPosition[0], focusPosition[1], focusPosition[2]) : preset.target
    const motionScale = reducedMotion ? 0 : 1
    const orbitalDrift = Math.sin(t * preset.drift.speed) * preset.drift.x * motionScale
    const sideBreath = Math.cos(t * preset.drift.speed * 0.72) * preset.drift.x * 0.36 * motionScale
    const lift = Math.sin(t * preset.drift.speed * 1.5) * preset.drift.y * motionScale
    const depth = Math.sin(t * preset.drift.speed * 0.62) * preset.drift.z * motionScale
    const settle = focusPosition && !reducedMotion ? Math.sin(eased * Math.PI) * 0.16 : 0

    lookTarget.current.lerp(target, reducedMotion ? 0.18 : 0.032 + eased * 0.052)

    if (focusPosition) {
      desiredPosition.current.set(target.x * 0.7 + orbitalDrift, target.y + 0.58 + lift + settle, target.z + 2.22 - settle + mobileOffset)
    } else {
      desiredPosition.current.set(
        preset.position.x + orbitalDrift + sideBreath,
        preset.position.y + lift - mobileOffset * 0.18,
        preset.position.z + depth + mobileOffset,
      )
    }

    if (camera instanceof PerspectiveCamera) {
      const responsiveFov = size.width <= 430 ? Math.min(64, preset.fov + 6) : preset.fov
      camera.fov += (responsiveFov - camera.fov) * (reducedMotion ? 0.12 : 0.035)
      camera.updateProjectionMatrix()
    }

    camera.position.lerp(desiredPosition.current, reducedMotion ? 0.14 : focusPosition ? 0.032 + eased * 0.045 : 0.026)
    camera.lookAt(lookTarget.current)
  })

  return null
}
