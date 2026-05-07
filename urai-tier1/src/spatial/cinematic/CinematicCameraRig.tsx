'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import { PerspectiveCamera, Vector3 } from 'three'
import { CameraPathKey, cameraPathPresets } from './cameraPaths'

const CAMERA_BOUNDS = {
  minX: -7.5,
  maxX: 7.5,
  minY: 0.35,
  maxY: 7.25,
  minZ: -18,
  maxZ: 10,
}

function easeInOutCubic(x: number) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

function clampVectorToBounds(v: Vector3) {
  v.x = Math.min(CAMERA_BOUNDS.maxX, Math.max(CAMERA_BOUNDS.minX, v.x))
  v.y = Math.min(CAMERA_BOUNDS.maxY, Math.max(CAMERA_BOUNDS.minY, v.y))
  v.z = Math.min(CAMERA_BOUNDS.maxZ, Math.max(CAMERA_BOUNDS.minZ, v.z))
  return v
}

export default function CinematicCameraRig({
  active,
  focusPosition,
  path = 'arrival',
  reducedMotion = false,
  resetSignal = 0,
}: {
  active: boolean
  focusPosition?: readonly [number, number, number] | null
  path?: CameraPathKey
  reducedMotion?: boolean
  resetSignal?: number
}) {
  const { camera, size } = useThree()
  const lookTarget = useRef(cameraPathPresets.arrival.target.clone())
  const desiredPosition = useRef(cameraPathPresets.arrival.position.clone())
  const transition = useRef({ key: 'idle', progress: 1 })

  const responsivePreset = useMemo(() => {
    const preset = cameraPathPresets[path]
    return {
      ...preset,
      fov: size.width <= 430 ? Math.min(64, preset.fov + 6) : preset.fov,
    }
  }, [path, size.width])

  useEffect(() => {
    camera.position.copy(clampVectorToBounds(responsivePreset.position.clone()))
    camera.lookAt(responsivePreset.target)
    lookTarget.current.copy(responsivePreset.target)
    desiredPosition.current.copy(clampVectorToBounds(responsivePreset.position.clone()))
    transition.current = { key: `reset:${resetSignal}:${path}`, progress: 1 }

    if (camera instanceof PerspectiveCamera) {
      camera.fov = responsivePreset.fov
      camera.updateProjectionMatrix()
    }
  }, [camera, path, resetSignal, responsivePreset])

  useFrame(({ clock }, delta) => {
    if (!active) return

    const t = clock.elapsedTime
    const preset = responsivePreset
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

    clampVectorToBounds(desiredPosition.current)

    if (camera instanceof PerspectiveCamera) {
      camera.fov += (preset.fov - camera.fov) * (reducedMotion ? 0.12 : 0.035)
      camera.updateProjectionMatrix()
    }

    camera.position.lerp(desiredPosition.current, reducedMotion ? 0.14 : focusPosition ? 0.032 + eased * 0.045 : 0.026)
    clampVectorToBounds(camera.position)
    camera.lookAt(lookTarget.current)
  })

  return null
}
