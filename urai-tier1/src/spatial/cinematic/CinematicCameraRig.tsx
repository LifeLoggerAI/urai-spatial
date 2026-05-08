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

function easeOutExpo(x: number) {
  return x === 1 ? 1 : 1 - Math.pow(2, -10 * x)
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
  const previousPosition = useRef(cameraPathPresets.arrival.position.clone())
  const previousTarget = useRef(cameraPathPresets.arrival.target.clone())
  const transition = useRef({ key: 'idle', progress: 1 })
  const previousPath = useRef<CameraPathKey>(path)

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
    previousPosition.current.copy(clampVectorToBounds(responsivePreset.position.clone()))
    previousTarget.current.copy(responsivePreset.target)
    previousPath.current = path
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
    const focusKey = focusPosition ? `${path}:${focusPosition.join(':')}` : path
    if (transition.current.key !== focusKey) {
      previousPosition.current.copy(camera.position)
      previousTarget.current.copy(lookTarget.current)
      previousPath.current = path
      transition.current = { key: focusKey, progress: reducedMotion ? 1 : 0 }
    }

    const motion = preset.motion
    transition.current.progress = Math.min(1, transition.current.progress + delta * (reducedMotion ? 3.5 : motion.transitionSpeed))
    const eased = reducedMotion ? 1 : easeInOutCubic(transition.current.progress)
    const release = reducedMotion ? 1 : easeOutExpo(transition.current.progress)
    const gate = reducedMotion ? 0 : Math.sin(transition.current.progress * Math.PI)
    const mobileOffset = size.width <= 390 ? 0.36 : size.width <= 430 ? 0.22 : 0

    const target = focusPosition ? new Vector3(focusPosition[0], focusPosition[1], focusPosition[2]) : preset.target
    const motionScale = reducedMotion ? 0 : motion.driftMultiplier
    const orbitalDrift = Math.sin(t * preset.drift.speed) * preset.drift.x * motionScale
    const sideBreath = Math.cos(t * preset.drift.speed * 0.72) * preset.drift.x * 0.36 * motionScale
    const lift = Math.sin(t * preset.drift.speed * 1.5) * preset.drift.y * motionScale
    const depth = Math.sin(t * preset.drift.speed * 0.62) * preset.drift.z * motionScale
    const transitionBreath = gate * motion.transitionImpulse
    const depthImpulse = gate * motion.depthImpulse
    const verticalImpulse = gate * motion.verticalImpulse
    const replaySpiral = path === 'replayDive' && !reducedMotion ? Math.sin(release * Math.PI * 1.5) * 0.1 : 0

    lookTarget.current.lerp(target, reducedMotion ? 0.18 : motion.targetLerp + eased * 0.045)

    if (focusPosition) {
      desiredPosition.current.set(
        target.x * 0.7 + orbitalDrift + replaySpiral,
        target.y + 0.58 + lift + verticalImpulse,
        target.z + 2.22 - depthImpulse + mobileOffset,
      )
    } else {
      desiredPosition.current.set(
        preset.position.x + orbitalDrift + sideBreath + replaySpiral,
        preset.position.y + lift - mobileOffset * 0.18 + verticalImpulse,
        preset.position.z + depth - depthImpulse + mobileOffset,
      )
    }

    if (!reducedMotion && transition.current.progress < 1) {
      desiredPosition.current.lerpVectors(previousPosition.current, desiredPosition.current, eased)
      lookTarget.current.lerpVectors(previousTarget.current, lookTarget.current, eased)
      desiredPosition.current.z -= transitionBreath
    }

    clampVectorToBounds(desiredPosition.current)

    if (camera instanceof PerspectiveCamera) {
      const fovImpulse = path === 'replayDive' ? gate * -2.8 : gate * -0.8
      camera.fov += (preset.fov + fovImpulse - camera.fov) * (reducedMotion ? 0.12 : motion.fovLerp)
      camera.updateProjectionMatrix()
    }

    camera.position.lerp(desiredPosition.current, reducedMotion ? 0.14 : motion.positionLerp + eased * 0.046)
    clampVectorToBounds(camera.position)
    camera.lookAt(lookTarget.current)

    if (camera instanceof PerspectiveCamera) {
      camera.rotation.z += (Math.sin(t * 0.31) * motion.roll + gate * motion.roll * 1.8 - camera.rotation.z) * (reducedMotion ? 0.12 : 0.04)
    }
  })

  return null
}
