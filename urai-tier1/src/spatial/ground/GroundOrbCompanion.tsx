'use client'

import { useEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { requestHapticCue } from '@/spatial/haptics/HapticRuntime'
import { requestUraiWorldOrbOpen } from '@/spatial/world/worldEvents'
import { GROUND_ORB } from './groundCanon'

const DEG = Math.PI / 180
const ORB_READY_EVENT = 'urai:ground-orb-visual-ready'

function candidate(player: THREE.Vector3, yaw: number, bearingDeg: number, distance: number, out: THREE.Vector3) {
  const bearing = yaw + bearingDeg * DEG
  return out.set(player.x - Math.sin(bearing) * distance, player.y, player.z - Math.cos(bearing) * distance)
}

function clearance(point: THREE.Vector3, obstacles: readonly { x: number; z: number; radius: number }[]) {
  let value = Number.POSITIVE_INFINITY
  for (const obstacle of obstacles) value = Math.min(value, Math.hypot(point.x - obstacle.x, point.z - obstacle.z) - obstacle.radius)
  return value
}

export function GroundOrbCompanion({ playerPosition, yaw, groundHeight, obstacles, reducedMotion }: {
  playerPosition: MutableRefObject<THREE.Vector3>
  yaw: MutableRefObject<number>
  groundHeight: (x: number, z: number) => number
  obstacles: readonly { x: number; z: number; radius: number }[]
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.MeshStandardMaterial>(null)
  const position = useRef(new THREE.Vector3(1.4, GROUND_ORB.centerHeightM, 4.4))
  const velocity = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3(1.4, GROUND_ORB.centerHeightM, 4.4))
  const deltaTarget = useRef(new THREE.Vector3())
  const decisionElapsed = useRef(0)
  const followDelay = useRef(0)
  const gazeMs = useRef(0)
  const previousAttentive = useRef(false)
  const candidateA = useMemo(() => new THREE.Vector3(), [])
  const candidateB = useMemo(() => new THREE.Vector3(), [])
  const candidateC = useMemo(() => new THREE.Vector3(), [])
  const cameraForward = useMemo(() => new THREE.Vector3(), [])
  const toOrb = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(ORB_READY_EVENT, { detail: { ready: true } }))
    const fallback = document.querySelector<HTMLButtonElement>('.urai-world-companion__orb')
    const previous = fallback ? { opacity: fallback.style.opacity, pointerEvents: fallback.style.pointerEvents, transition: fallback.style.transition } : null
    const reveal = () => { if (fallback) fallback.style.opacity = '1' }
    const hide = () => { if (fallback) fallback.style.opacity = '0' }
    if (fallback) {
      fallback.dataset.physicalGroundOrbFallback = 'true'
      fallback.style.opacity = '0'
      fallback.style.pointerEvents = 'none'
      fallback.style.transition = 'opacity 120ms ease'
      fallback.addEventListener('focus', reveal)
      fallback.addEventListener('blur', hide)
    }
    return () => {
      window.dispatchEvent(new CustomEvent(ORB_READY_EVENT, { detail: { ready: false } }))
      document.body.style.cursor = ''
      if (fallback && previous) {
        fallback.removeEventListener('focus', reveal)
        fallback.removeEventListener('blur', hide)
        delete fallback.dataset.physicalGroundOrbFallback
        fallback.style.opacity = previous.opacity
        fallback.style.pointerEvents = previous.pointerEvents
        fallback.style.transition = previous.transition
      }
    }
  }, [])

  useFrame(({ camera, clock }, delta) => {
    const player = playerPosition.current
    const current = position.current
    decisionElapsed.current += delta
    const separation = Math.hypot(current.x - player.x, current.z - player.z)
    if (separation > GROUND_ORB.preferredDistanceM + 0.35) followDelay.current += delta * 1000
    else followDelay.current = 0

    if (decisionElapsed.current >= 1 / GROUND_ORB.decisionHz) {
      decisionElapsed.current = 0
      const distance = separation > GROUND_ORB.catchupDistanceM
        ? GROUND_ORB.preferredDistanceM
        : THREE.MathUtils.clamp(separation, GROUND_ORB.minimumDistanceM, GROUND_ORB.preferredDistanceM)
      candidate(player, yaw.current, GROUND_ORB.preferredBearingDeg, distance, candidateA)
      candidate(player, yaw.current, -GROUND_ORB.preferredBearingDeg, distance, candidateB)
      candidate(player, yaw.current, 118, Math.min(GROUND_ORB.maximumIdleDistanceM, distance + 0.45), candidateC)
      let best = candidateA
      let score = -Infinity
      for (const option of [candidateA, candidateB, candidateC]) {
        const nextScore = clearance(option, obstacles) * 2.4 - current.distanceTo(option) * 0.15
        if (nextScore > score) { best = option; score = nextScore }
      }
      if (followDelay.current >= GROUND_ORB.followDelayMs || separation > GROUND_ORB.catchupDistanceM) desired.current.copy(best)
      else desired.current.copy(current)
    }

    desired.current.y = groundHeight(desired.current.x, desired.current.z) + GROUND_ORB.centerHeightM
    deltaTarget.current.copy(desired.current).sub(current)
    const targetSpeed = separation > GROUND_ORB.catchupDistanceM ? GROUND_ORB.catchupSpeedMps : GROUND_ORB.normalSpeedMps
    if (deltaTarget.current.length() > 0.015) {
      deltaTarget.current.normalize().multiplyScalar(targetSpeed)
      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, deltaTarget.current.x, GROUND_ORB.accelerationMps2, delta)
      velocity.current.y = THREE.MathUtils.damp(velocity.current.y, deltaTarget.current.y, GROUND_ORB.accelerationMps2, delta)
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, deltaTarget.current.z, GROUND_ORB.accelerationMps2, delta)
    } else velocity.current.multiplyScalar(Math.pow(0.04, delta))
    current.addScaledVector(velocity.current, delta)
    current.y = Math.max(current.y, groundHeight(current.x, current.z) + GROUND_ORB.centerHeightM - 0.015)

    camera.getWorldDirection(cameraForward)
    toOrb.copy(current).sub(camera.position).normalize()
    const gazeAngle = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(cameraForward.dot(toOrb), -1, 1)))
    const close = camera.position.distanceTo(current) <= GROUND_ORB.attentionDistanceM
    gazeMs.current = close && gazeAngle <= GROUND_ORB.centerExclusionDeg ? gazeMs.current + delta * 1000 : Math.max(0, gazeMs.current - delta * 1800)
    const attentive = gazeMs.current >= GROUND_ORB.attentionGazeMs
    if (attentive && !previousAttentive.current) requestHapticCue('orb-attention', 'ground-physical-orb')
    previousAttentive.current = attentive

    if (group.current) {
      const idleY = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.62) * GROUND_ORB.idleVerticalM
      const breath = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 0.38) * GROUND_ORB.breathScale
      group.current.position.set(current.x, current.y + idleY, current.z)
      group.current.scale.setScalar(breath)
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, yaw.current + Math.PI, 2.2, delta)
      group.current.userData.attention = attentive
      group.current.userData.affordanceReady = gazeMs.current >= GROUND_ORB.affordanceGazeMs
    }
    if (core.current) core.current.emissiveIntensity = THREE.MathUtils.damp(core.current.emissiveIntensity, attentive ? 0.42 : close ? 0.34 : 0.3, 4, delta)
  })

  return <group
    ref={group}
    name="ground-physical-orb"
    userData={{ semanticOwner: 'single-ground-world-orb', visualAuthority: 'biomorphic-grounded-reliquary', canonicalWidthM: GROUND_ORB.widthM, mascotBehavior: false }}
    onClick={(event) => { event.stopPropagation(); requestUraiWorldOrbOpen() }}
    onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer' }}
    onPointerOut={() => { document.body.style.cursor = '' }}
  >
    <mesh castShadow receiveShadow scale={[0.5, 0.72, 0.46]} rotation={[0.08, -0.2, -0.11]}>
      <icosahedronGeometry args={[0.48, 3]} />
      <meshStandardMaterial ref={core} color="#6d7569" roughness={0.72} metalness={0.015} emissive="#b8a67c" emissiveIntensity={0.3} />
    </mesh>
    <mesh castShadow receiveShadow position={[-0.15, 0.08, 0.03]} scale={[0.3, 0.5, 0.34]} rotation={[0.2, 0.35, 0.2]}>
      <icosahedronGeometry args={[0.5, 2]} />
      <meshStandardMaterial color="#53665c" roughness={0.82} metalness={0.01} emissive="#6f8b79" emissiveIntensity={0.16} />
    </mesh>
    <mesh castShadow receiveShadow position={[0.17, 0.05, -0.02]} scale={[0.31, 0.47, 0.33]} rotation={[-0.12, -0.28, -0.14]}>
      <icosahedronGeometry args={[0.5, 2]} />
      <meshStandardMaterial color="#75636a" roughness={0.8} metalness={0.01} emissive="#957b82" emissiveIntensity={0.14} />
    </mesh>
    <mesh position={[0, -0.03, 0.29]} scale={[0.045, 0.42, 0.035]} rotation={[0.08, 0, 0.18]}>
      <cylinderGeometry args={[0.055, 0.055, 0.65, 10]} />
      <meshStandardMaterial color="#d6c79c" emissive="#d6c79c" emissiveIntensity={0.58} roughness={0.48} />
    </mesh>
    <pointLight position={[0, 0.08, 0.18]} intensity={0.34} distance={2.4} decay={2} color="#d6c79c" />
  </group>
}

export const GROUND_ORB_VISUAL_READY_EVENT = ORB_READY_EVENT
