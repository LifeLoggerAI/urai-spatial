'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type Vec3Tuple = [number, number, number]
type Vec3Object = { x: number; y: number; z: number }
type Vec3Like = Vec3Tuple | Vec3Object

type Props = {
  phase: string
  selected?: Vec3Like | null
}

function normalizePhase(phase: string | null | undefined) {
  const p = String(phase || '').toUpperCase()
  if (p === 'ASCENT') return 'ASCENT'
  if (p === 'LIFEMAP') return 'LIFEMAP'
  if (p === 'FOCUS') return 'FOCUS'
  if (p === 'REPLAY') return 'REPLAY'
  return 'HOME'
}

function damp(current: number, target: number, lambda: number, dt: number) {
  return THREE.MathUtils.damp(current, target, lambda, dt)
}

export default function CinematicCameraRig({ phase, selected = null }: Props) {
  const { camera } = useThree()

  const targetPos = useRef(new THREE.Vector3(0, 1.6, 10))
  const targetLook = useRef(new THREE.Vector3(0, 1.1, 0))
  const workLook = useRef(new THREE.Vector3(0, 1.1, 0))

  const lastPhase = useRef<string>('HOME')

  const sel = useMemo(() => {
    if (!selected) return null
    if (Array.isArray(selected)) {
      if (selected.length !== 3) return null
      const [x, y, z] = selected
      if (typeof x !== 'number' || typeof y !== 'number' || typeof z !== 'number') return null
      return { x, y, z }
    }
    if (
      typeof selected.x !== 'number' ||
      typeof selected.y !== 'number' ||
      typeof selected.z !== 'number'
    ) return null
    return selected
  }, [selected])

  useEffect(() => {
    camera.near = 0.1
    camera.far = 200
    camera.updateProjectionMatrix()
  }, [camera])

  useFrame((_, dt) => {
    const p = normalizePhase(phase)
    lastPhase.current = p

    if (p === 'HOME') {
      targetPos.current.set(0, 1.6, 10)
      targetLook.current.set(0, 1.1, 0)
    } else if (p === 'ASCENT') {
      targetPos.current.set(0.2, 6.4, 18.5)
      targetLook.current.set(0.0, 3.4, -2.8)
    } else if (p === 'LIFEMAP') {
      if (sel) {
        targetPos.current.set(sel.x * 0.28 + 0.70, sel.y + 0.85, sel.z + 5.4)
        targetLook.current.set(sel.x * 0.06, sel.y + 0.10, sel.z - 0.10)
      } else {
        targetPos.current.set(0.35, 5.8, -24.0)
        targetLook.current.set(0.06, 4.7, -37.0)
      }
    } else if (p === 'FOCUS') {
      if (sel) {
        targetPos.current.set(
          sel.x * 0.085 + 0.34,
          sel.y * 0.18 + 0.96,
          sel.z + 2.85
        )
        targetLook.current.set(
          sel.x * 0.030 - 0.02,
          sel.y * 0.08 + 0.12,
          sel.z - 2.25
        )
      } else {
        targetPos.current.set(0.34, 0.96, -10.8)
        targetLook.current.set(-0.04, 0.12, -14.6)
      }
    } else if (p === 'REPLAY') {
      if (sel) {
        targetPos.current.set(
          sel.x * 0.040 + 0.12,
          sel.y * 0.05 + 0.50,
          sel.z + 1.02
        )
        targetLook.current.set(
          sel.x * 0.012,
          sel.y * 0.03 + 0.08,
          sel.z - 3.35
        )
      } else {
        targetPos.current.set(0.10, 0.50, -7.6)
        targetLook.current.set(0.00, 0.08, -16.9)
      }
    }

    const posLambda =
      p === 'ASCENT' ? 6.8 :
      p === 'LIFEMAP' ? 5.6 :
      p === 'FOCUS' ? 6.2 :
      p === 'REPLAY' ? 7.1 :
      5.2

    const lookLambda =
      p === 'ASCENT' ? 7.4 :
      p === 'LIFEMAP' ? 6.0 :
      p === 'FOCUS' ? 6.8 :
      p === 'REPLAY' ? 7.8 :
      5.8

    camera.position.set(
      damp(camera.position.x, targetPos.current.x, posLambda, dt),
      damp(camera.position.y, targetPos.current.y, posLambda, dt),
      damp(camera.position.z, targetPos.current.z, posLambda, dt),
    )

    workLook.current.set(
      damp(workLook.current.x, targetLook.current.x, lookLambda, dt),
      damp(workLook.current.y, targetLook.current.y, lookLambda, dt),
      damp(workLook.current.z, targetLook.current.z, lookLambda, dt),
    )

    camera.lookAt(workLook.current)
  })

  return null
}
