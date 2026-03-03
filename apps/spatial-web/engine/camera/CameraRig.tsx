/**
 * TIER 1 LOCKED CAMERA SYSTEM
 *
 * Invariants:
 * - No teleportation
 * - No implicit gravity to center
 * - Motion only when cameraTarget.active is true
 * - Delta clamped for tab throttle stability
 * - Acceleration clamped to remove impulse spike
 * - Rotation smoothed via quaternion slerp
 *
 * DO NOT MODIFY WITHOUT TIER ESCALATION.
 */

"use client"

import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { useRef } from "react"
import { cameraTarget } from "./cameraStore"

const STIFFNESS = 6
const DAMPING = 5
const EPSILON = 0.0001
const MAX_ACCEL = 25
const MAX_DELTA = 0.033
const ROTATION_LERP = 3.5

export default function CameraRig() {
  const { camera } = useThree()

  const targetPos = useRef(new THREE.Vector3())
  const velocity = useRef(new THREE.Vector3())
  const initialized = useRef(false)
  const active = useRef(false)

  const targetQuat = useRef(new THREE.Quaternion())
  const tempMat = new THREE.Matrix4()

  useFrame((_, rawDelta) => {

    const delta = Math.min(rawDelta, MAX_DELTA)

    if (!initialized.current) {
      targetPos.current.copy(camera.position)
      targetQuat.current.copy(camera.quaternion)
      initialized.current = true
    }

    if (cameraTarget.active) {
      targetPos.current.copy(cameraTarget.position)
      active.current = true
      cameraTarget.active = false
    }

    if (!active.current) return

    // ----- POSITION SPRING -----

    const displacement = new THREE.Vector3()
      .subVectors(targetPos.current, camera.position)

    if (displacement.lengthSq() < EPSILON) {
      velocity.current.set(0, 0, 0)
      active.current = false
    } else {

      const accel = displacement
        .multiplyScalar(STIFFNESS)
        .sub(velocity.current.clone().multiplyScalar(DAMPING))

      if (accel.length() > MAX_ACCEL) {
        accel.setLength(MAX_ACCEL)
      }

      velocity.current.add(accel.multiplyScalar(delta))
      camera.position.add(velocity.current.clone().multiplyScalar(delta))
    }

    // ----- ROTATION SMOOTHING -----

    tempMat.lookAt(camera.position, cameraTarget.lookAt, camera.up)
    targetQuat.current.setFromRotationMatrix(tempMat)

    camera.quaternion.slerp(
      targetQuat.current,
      1 - Math.exp(-ROTATION_LERP * delta)
    )
  })

  return null
}
