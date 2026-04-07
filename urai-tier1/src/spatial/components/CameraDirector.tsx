'use client'

import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import {
  resolvePose,
  resolveCameraDamping,
  resolveVeil,
  type TransitionPhase,
} from '@/spatial/canon/cameraCanon'

export function CameraDirector({
  mode,
  transitionPhase,
}: {
  mode: string
  transitionPhase: TransitionPhase
}) {
  const { camera } = useThree()
  const lookRef = useRef(new THREE.Vector3(0, 0, -12))

  const pose = useMemo(
    () => resolvePose(mode, transitionPhase),
    [mode, transitionPhase]
  )

  const targetPos = useMemo(
    () => new THREE.Vector3(...pose.position),
    [pose]
  )

  const targetLook = useMemo(
    () => new THREE.Vector3(...pose.target),
    [pose]
  )

  useFrame((_, delta) => {
    const cam = camera as THREE.PerspectiveCamera
    const dt = Math.min(delta, 0.05)
    const speed = resolveCameraDamping(transitionPhase)
    const a = 1 - Math.exp(-speed * dt)

    const isAscentPhase = transitionPhase === 'ascent'
    const isReplayOpen = transitionPhase === 'open_replay'
    const isReplayClose = transitionPhase === 'close_replay'
    const isFocusOpen = transitionPhase === 'open_focus'

    const posAlpha =
      isReplayOpen ? a * 0.12 :
      isAscentPhase ? a * 0.30 :
      isFocusOpen ? a * 0.36 :
      isReplayClose ? a * 0.26 :
      a

    const lookAlpha =
      isReplayOpen ? a * 0.06 :
      isAscentPhase ? a * 0.12 :
      isFocusOpen ? a * 0.20 :
      isReplayClose ? a * 0.18 :
      a

    const fovAlpha =
      isReplayOpen ? a * 0.04 :
      isAscentPhase ? a * 0.08 :
      isFocusOpen ? a * 0.14 :
      isReplayClose ? a * 0.12 :
      a

    cam.position.lerp(targetPos, posAlpha)
    lookRef.current.lerp(targetLook, lookAlpha)
    cam.fov = THREE.MathUtils.lerp(cam.fov, pose.fov, fovAlpha)
    cam.lookAt(lookRef.current)
    cam.updateProjectionMatrix()
  })

  return null
}

export function TransitionVeil({
  mode,
  transitionPhase,
}: {
  mode: string
  transitionPhase: TransitionPhase
}) {
  const veil = resolveVeil(mode, transitionPhase)
  const isReplayPhase =
    mode === 'replay' ||
    transitionPhase === 'open_replay' ||
    transitionPhase === 'close_replay'
  const isAscentPhase = transitionPhase === 'ascent'

  if (isReplayPhase || veil.opacity <= 0.001) return null

  return (
    <group>
      {!isAscentPhase ? (
        <mesh position={[0, 0, -1.55]}>
          <planeGeometry args={[26, 16]} />
          <meshBasicMaterial
            color={veil.color}
            transparent
            opacity={veil.opacity}
            depthWrite={false}
          />
        </mesh>
      ) : null}

      <mesh position={[0, 0, -6.2]}>
        <sphereGeometry args={[6.8, 28, 28]} />
        <meshBasicMaterial
          color={veil.color}
          transparent
          opacity={isAscentPhase ? veil.opacity * 0.01 : veil.opacity * 0.18}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

export default CameraDirector
