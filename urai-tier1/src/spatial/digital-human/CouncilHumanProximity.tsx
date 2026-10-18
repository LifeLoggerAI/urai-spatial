'use client'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { proximityState } from './humanEncounter.mjs'

/**
 * Opt-in development proximity telemetry for *existing* Council rigged humans.
 * The six Council models are NOT the founder, approved private people or a
 * substitute voice identity. This component does not dispatch provider calls.
 * Uses the actual three.js camera position set by CouncilCamera.
 */
export default function CouncilHumanProximity({
  position, onRange, enabled = true,
}: {
  position: readonly [number, number, number]
  onRange: (inRange: boolean, distanceMeters: number) => void
  enabled?: boolean
}) {
  const { camera } = useThree()
  const target = useRef(new THREE.Vector3())
  const nearby = useRef(false)
  const lastNotice = useRef(-1)
  useEffect(() => {
    nearby.current = false
    lastNotice.current = -1
    onRange(false, Number.POSITIVE_INFINITY)
    return () => onRange(false, Number.POSITIVE_INFINITY)
  }, [position[0], position[1], position[2], enabled, onRange])
  useFrame(({ clock }) => {
    if (!enabled) return
    target.current.set(position[0], camera.position.y, position[2])
    const distance = camera.position.distanceTo(target.current)
    const next = proximityState(nearby.current, distance)
    if (next !== nearby.current || clock.elapsedTime - lastNotice.current >= 0.35) {
      nearby.current = next
      lastNotice.current = clock.elapsedTime
      onRange(next, distance)
    }
  })
  return null
}
