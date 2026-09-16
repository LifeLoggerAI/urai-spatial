'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GROUND_ORB } from './groundCanon'

const DEG = Math.PI / 180
const ORB_READY_EVENT = 'urai:ground-orb-visual-ready'

function candidatePosition(player: THREE.Vector3, yaw: number, bearingDeg: number, distance: number, out: THREE.Vector3) {
  const bearing = yaw + bearingDeg * DEG
  return out.set(
    player.x - Math.sin(bearing) * distance,
    player.y,
    player.z - Math.cos(bearing) * distance,
  )
}

function obstacleClearance(point: THREE.Vector3, obstacles: readonly { x: number; z: number; radius: number }[]) {
  let clearance = Number.POSITIVE_INFINITY
  for (const obstacle of obstacles) {
    const distance = Math.hypot(point.x - obstacle.x, point.z - obstacle.z) - obstacle.radius
    clearance = Math.min(clearance, distance)
  }
  return clearance
}

export function GroundOrbCompanion({
  playerPosition,
  yaw,
  groundHeight,
  obstacles,
  reducedMotion,
}: {
  playerPosition: React.MutableRefObject<THREE.Vector3>
  yaw: React.MutableRefObject<number>
  groundHeight: (x: number, z: number) => number
  obstacles: readonly { x: number; z: number; radius: number }[]
  reducedMotion: boolean
}) {
  const group = useRef<THREE.Group>(null)
  const core = useRef<THREE.MeshStandardMaterial>(null)
  const position = useRef(new THREE.Vector3(1.4, GROUND_ORB.centerHeightM, 4.4))
  const velocity = useRef(new THREE.Vector3())
  const desired = useRef(new THREE.Vector3())
  const decisionElapsed = useRef(0)
  const followDelay = useRef(0)
  const gazeMs = useRef(0)
  const attention = useRef(false)
  const candidateA = useMemo(() => new THREE.Vector3(), [])
  const candidateB = useMemo(() => new THREE.Vector3(), [])
  const candidateC = useMemo(() => new THREE.Vector3(), [])
  const cameraForward = useMemo(() => new THREE.Vector3(), [])
  const toOrb = useMemo(() => new THREE.Vector3(), [])

  useEffect(() => {
    window.dispatchEvent(new CustomEvent(ORB_READY_EVENT, { detail: { ready: true } }))
    return () => window.dispatchEvent(new CustomEvent(ORB_READY_EVENT, { detail: { ready: false } }))
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
      candidatePosition(player, yaw.current, GROUND_ORB.preferredBearingDeg, distance, candidateA)
      candidatePosition(player, yaw.current, -GROUND_ORB.preferredBearingDeg, distance, candidateB)
      candidatePosition(player, yaw.current, 118, Math.min(GROUND_ORB.maximumIdleDistanceM, distance + 0.45), candidateC)
      const candidates = [candidateA, candidateB, candidateC]
      let best = candidates[0]
      let bestScore = -Infinity
      for (const candidate of candidates) {
        const clearance = obstacleClearance(candidate, obstacles)
        const travel = current.distanceTo(candidate)
        const score = clearance * 2.4 - travel * 0.15
        if (score > bestScore) {
          best = candidate
          bestScore = score
        }
      }
      if (followDelay.current >= GROUND_ORB.followDelayMs || separation > GROUND_ORB.catchupDistanceM) {
        desired.current.copy(best)
      } else {
        desired.current.copy(current)
      }
    }

    const flatDesired = desired.current
    const targetY = groundHeight(flatDesired.x, flatDesired.z) + GROUND_ORB.centerHeightM
    flatDesired.y = targetY
    const deltaToTarget = flatDesired.clone().sub(current)
    const distanceToTarget = deltaToTarget.length()
    const targetSpeed = separation > GROUND_ORB.catchupDistanceM ? GROUND_ORB.catchupSpeedMps : GROUND_ORB.normalSpeedMps
    if (distanceToTarget > 0.015) {
      deltaToTarget.normalize().multiplyScalar(targetSpeed)
      velocity.current.x = THREE.MathUtils.damp(velocity.current.x, deltaToTarget.x, GROUND_ORB.accelerationMps2, delta)
      velocity.current.y = THREE.MathUtils.damp(velocity.current.y, deltaToTarget.y, GROUND_ORB.accelerationMps2, delta)
      velocity.current.z = THREE.MathUtils.damp(velocity.current.z, deltaToTarget.z, GROUND_ORB.accelerationMps2, delta)
    } else {
      velocity.current.multiplyScalar(Math.pow(0.04, delta))
    }
    current.addScaledVector(velocity.current, delta)
    current.y = Math.max(current.y, groundHeight(current.x, current.z) + GROUND_ORB.centerHeightM - 0.015)

    camera.getWorldDirection(cameraForward)
    toOrb.copy(current).sub(camera.position).normalize()
    const gazeAngle = THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(cameraForward.dot(toOrb), -1, 1)))
    const closeEnough = camera.position.distanceTo(current) <= GROUND_ORB.attentionDistanceM
    if (closeEnough && gazeAngle <= 8) gazeMs.current += delta * 1000
    else gazeMs.current = Math.max(0, gazeMs.current - delta * 1800)
    attention.current = gazeMs.current >= GROUND_ORB.attentionGazeMs

    if (group.current) {
      const idleY = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.62) * GROUND_ORB.idleVerticalM
      const breath = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 0.38) * GROUND_ORB.breathScale
      group.current.position.set(current.x, current.y + idleY, current.z)
      group.current.scale.setScalar(breath)
      group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, yaw.current + Math.PI, 2.2, delta)
      group.current.userData.attention = attention.current
      group.current.userData.affordanceReady = gazeMs.current >= GROUND_ORB.affordanceGazeMs
    }
    if (core.current) {
      core.current.emissiveIntensity = THREE.MathUtils.damp(
        core.current.emissiveIntensity,
        attention.current ? 0.42 : closeEnough ? 0.34 : 0.3,
        4,
        delta,
      )
    }
  })

  return (
    <group
      ref={group}
      name="ground-physical-orb"
      scale={GROUND_ORB.widthM}
      userData={{ semanticOwner: 'single-ground-world-orb', visualAuthority: 'biomorphic-grounded-reliquary', mascotBehavior: false }}
    >
      <mesh castShadow receiveShadow scale={[0.55, 0.72, 0.46]} rotation={[0.08, -0.2, -0.11]}>
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
        <capsuleGeometry args={[0.055, 0.65, 4, 10]} />
        <meshStandardMaterial color="#d6c79c" emissive="#d6c79c" emissiveIntensity={0.58} roughness={0.48} />
      </mesh>
      <pointLight position={[0, 0.08, 0.18]} intensity={0.34} distance={2.4} decay={2} color="#d6c79c" />
    </group>
  )
}

export const GROUND_ORB_VISUAL_READY_EVENT = ORB_READY_EVENT
