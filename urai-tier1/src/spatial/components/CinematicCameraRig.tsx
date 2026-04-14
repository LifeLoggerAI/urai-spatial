'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type CanonPhase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'

type Props = {
  phase: CanonPhase | string
  selected?: [number, number, number] | null
  onSettled?: (phase: any) => void
}

const HOME_POS = new THREE.Vector3(0, 1.2, 8.8)
const HOME_LOOK = new THREE.Vector3(0, 1.0, 0)

/*
  Canon fix:
  - Ascent must travel FORWARD toward the star volume, not away from it.
  - Lifemap must inherit the same heading and settle into the cluster.
  - Focus must frame the selected star from outside, not fling behind it.
*/
const ASCENT_FROM_POS = HOME_POS.clone()
const ASCENT_TO_POS = new THREE.Vector3(0, 12, 64)
const ASCENT_FROM_LOOK = HOME_LOOK.clone()
const ASCENT_TO_LOOK = new THREE.Vector3(0, 10, -260)

const LIFEMAP_POS = new THREE.Vector3(0, 10, 42)
const LIFEMAP_LOOK = new THREE.Vector3(0, 10, -260)

const FOCUS_OFFSET = new THREE.Vector3(2.6, 1.5, 14)
const REPLAY_OFFSET = new THREE.Vector3(0.6, 0.45, 7.5)

const ASCENT_MS = 1800
const LIFEMAP_SETTLE_MS = 500
const FOCUS_SETTLE_MS = 950
const REPLAY_ENTRY_MS = 1350

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
}

function smootherstep(t: number) {
  const x = clamp01(t)
  return x * x * x * (x * (x * 6 - 15) + 10)
}

function easeOutCubic(t: number) {
  const x = clamp01(t)
  return 1 - Math.pow(1 - x, 3)
}

function normalizePhase(value: string): CanonPhase {
  const p = String(value || '').toUpperCase()
  if (p === 'ASCENT') return 'ASCENT'
  if (p === 'LIFEMAP') return 'LIFEMAP'
  if (p === 'FOCUS') return 'FOCUS'
  if (p === 'REPLAY') return 'REPLAY'
  return 'HOME'
}

export default function CinematicCameraRig({ phase, selected = null, onSettled }: Props) {
  const { camera } = useThree()

  const currentPhaseRef = useRef<CanonPhase>(normalizePhase(String(phase)))
  const phaseStartedAtRef = useRef<number>(0)
  const settledRef = useRef<string>('')

  const targetPosRef = useRef(new THREE.Vector3().copy(HOME_POS))
  const targetLookRef = useRef(new THREE.Vector3().copy(HOME_LOOK))
  const lookCurrentRef = useRef(new THREE.Vector3().copy(HOME_LOOK))

  useEffect(() => {
    const next = normalizePhase(String(phase))
    if (currentPhaseRef.current !== next) {
      currentPhaseRef.current = next
      phaseStartedAtRef.current = performance.now()
      settledRef.current = ''
    }
  }, [phase])

  useFrame(() => {
    const now = performance.now()
    const p = currentPhaseRef.current
    const elapsed = now - phaseStartedAtRef.current
    const targetPos = targetPosRef.current
    const targetLook = targetLookRef.current

    if (p === 'HOME') {
      targetPos.copy(HOME_POS)
      targetLook.copy(HOME_LOOK)
      if (settledRef.current !== 'HOME') {
        settledRef.current = 'HOME'
        onSettled?.('HOME')
      }
    } else if (p === 'ASCENT') {
      const t = smootherstep(elapsed / ASCENT_MS)
      targetPos.copy(ASCENT_FROM_POS).lerp(ASCENT_TO_POS, t)
      targetLook.copy(ASCENT_FROM_LOOK).lerp(ASCENT_TO_LOOK, t)
    } else if (p === 'LIFEMAP') {
      const t = easeOutCubic(elapsed / LIFEMAP_SETTLE_MS)
      targetPos.copy(ASCENT_TO_POS).lerp(LIFEMAP_POS, t)
      targetLook.copy(ASCENT_TO_LOOK).lerp(LIFEMAP_LOOK, t)
      if (t >= 0.999 && settledRef.current !== 'LIFEMAP') {
        settledRef.current = 'LIFEMAP'
        onSettled?.('LIFEMAP')
      }
    } else if (p === 'FOCUS') {
      const anchor = selected
        ? new THREE.Vector3(selected[0], selected[1], selected[2])
        : new THREE.Vector3(0, 10, -260)
      const t = easeOutCubic(elapsed / FOCUS_SETTLE_MS)
      const focusPos = anchor.clone().add(FOCUS_OFFSET)
      const fromPos = LIFEMAP_POS.clone()
      const fromLook = LIFEMAP_LOOK.clone()
      targetPos.copy(fromPos.lerp(focusPos, t))
      targetLook.copy(fromLook.lerp(anchor, t))
      if (t >= 0.999 && settledRef.current !== 'FOCUS') {
        settledRef.current = 'FOCUS'
        onSettled?.('FOCUS')
      }
    } else if (p === 'REPLAY') {
      const anchor = selected
        ? new THREE.Vector3(selected[0], selected[1], selected[2])
        : new THREE.Vector3(0, 10, -260)
      const t = smootherstep(elapsed / REPLAY_ENTRY_MS)
      const replayPos = anchor.clone().add(REPLAY_OFFSET)
      const focusPos = anchor.clone().add(FOCUS_OFFSET)
      targetPos.copy(focusPos.lerp(replayPos, t))
      targetLook.copy(anchor)
      if (t >= 0.999 && settledRef.current !== 'REPLAY') {
        settledRef.current = 'REPLAY'
        onSettled?.('REPLAY')
      }
    }

    const cameraLerp =
      p === 'ASCENT' ? 0.05 :
      p === 'REPLAY' ? 0.042 :
      0.078

    camera.position.lerp(targetPos, cameraLerp)
    lookCurrentRef.current.lerp(targetLook, p === 'REPLAY' ? 0.055 : 0.09)
    camera.lookAt(lookCurrentRef.current)
    camera.updateProjectionMatrix()
  })

  return null
}
