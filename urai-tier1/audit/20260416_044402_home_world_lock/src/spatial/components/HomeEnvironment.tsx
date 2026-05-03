'use client'

import React, { useMemo, useRef } from 'react'
import { ThreeElements, ThreeEvent, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export type HomeEnvironmentProps = ThreeElements['group'] & {
  visible: boolean
  interactive?: boolean
  departure?: number
  onBeginAscent?: () => void
}

type Mass = {
  position: [number, number, number]
  scale: [number, number, number]
  color: string
  opacity: number
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export default function HomeEnvironment({
  visible,
  interactive = false,
  departure = 0,
  onBeginAscent,
  ...groupProps
}: HomeEnvironmentProps) {
  const rootRef = useRef<THREE.Group>(null)
  const orbRef = useRef<THREE.Group>(null)

  const skylineBack = useMemo<Mass[]>(
    () => [
      { position: [-10.8, 2.3, -11.8], scale: [2.2, 5.8, 1.2], color: '#02070e', opacity: 0.90 },
      { position: [-7.7, 2.8, -12.6], scale: [2.0, 6.6, 1.2], color: '#020912', opacity: 0.92 },
      { position: [-4.8, 2.2, -13.1], scale: [2.3, 5.2, 1.2], color: '#020810', opacity: 0.89 },
      { position: [-1.8, 3.0, -12.7], scale: [2.0, 6.8, 1.2], color: '#020a14', opacity: 0.92 },
      { position: [1.2, 2.0, -13.3], scale: [2.4, 4.8, 1.2], color: '#02070f', opacity: 0.89 },
      { position: [4.2, 2.7, -12.4], scale: [2.0, 6.0, 1.2], color: '#020912', opacity: 0.91 },
      { position: [7.2, 3.2, -11.9], scale: [2.3, 7.1, 1.2], color: '#020a14', opacity: 0.93 },
      { position: [10.4, 2.5, -12.8], scale: [2.5, 5.7, 1.2], color: '#02070e', opacity: 0.90 },
    ],
    []
  )

  const skylineMid = useMemo<Mass[]>(
    () => [
      { position: [-9.2, 1.4, -8.4], scale: [1.3, 3.1, 0.9], color: '#030b16', opacity: 0.76 },
      { position: [-5.9, 1.1, -8.8], scale: [1.1, 2.6, 0.9], color: '#030c17', opacity: 0.72 },
      { position: [-2.3, 1.7, -8.3], scale: [1.4, 3.6, 0.9], color: '#030c18', opacity: 0.78 },
      { position: [1.4, 1.0, -8.7], scale: [1.0, 2.5, 0.9], color: '#030b16', opacity: 0.72 },
      { position: [4.7, 1.5, -8.2], scale: [1.2, 3.2, 0.9], color: '#030d19', opacity: 0.77 },
      { position: [8.7, 1.2, -8.6], scale: [1.3, 2.9, 0.9], color: '#030b16', opacity: 0.74 },
    ],
    []
  )

  const windows = useMemo(
    () => [
      [-10.0, 0.7, -11.1], [-8.5, 1.0, -12.0], [-7.0, 0.4, -12.0],
      [-5.3, 0.8, -12.6], [-3.8, 1.2, -12.5], [-1.0, 0.6, -12.2],
      [0.5, 1.1, -12.8], [2.2, 0.5, -12.8], [3.9, 0.9, -11.9],
      [6.0, 1.3, -11.6], [8.5, 1.7, -11.3], [10.8, 0.8, -12.0],
      [-8.8, 0.4, -8.0], [-2.1, 0.9, -7.9], [4.6, 0.8, -7.9], [8.9, 0.5, -8.1],
    ] as Array<[number, number, number]>,
    []
  )

  const stars = useMemo(() => {
    const pts: Array<[number, number, number, number, number]> = []
    let seed = 41
    for (let i = 0; i < 92; i++) {
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const rx = seed / 0x7fffffff
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const ry = seed / 0x7fffffff
      seed = (seed * 1103515245 + 12345) & 0x7fffffff
      const rz = seed / 0x7fffffff
      pts.push([
        (rx - 0.5) * 28,
        3.6 + ry * 4.8,
        -20 - rz * 8,
        0.010 + ((i % 5) * 0.004),
        0.16 + ((i % 4) * 0.06),
      ])
    }
    return pts
  }, [])

  useFrame(({ clock }) => {
    const d = clamp(departure, 0, 1)
    if (rootRef.current) {
      rootRef.current.position.y = -d * 3.8
      rootRef.current.position.z = d * 2.4
    }
    if (orbRef.current) {
      const t = clock.elapsedTime
      orbRef.current.position.y = -0.28 + Math.sin(t * 0.82) * 0.025 - d * 0.08
      orbRef.current.position.z = -0.18 - d * 0.55
      const s = 1 - d * 0.18 + Math.sin(t * 1.1) * 0.006
      orbRef.current.scale.setScalar(s)
    }
  })

  const handleActivate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (!interactive) return
    onBeginAscent?.()
  }

  const d = clamp(departure, 0, 1)
  const worldFade = 1 - d * 0.28
  const skylineLift = d * 0.9
  const nearGroundShift = d * 1.9
  const orbFade = 1 - d * 0.22

  return (
    <group ref={rootRef} visible={visible} {...groupProps}>
      <ambientLight intensity={0.11 * worldFade} />
      <pointLight position={[-6.5, 3.0, -6.4]} intensity={0.36 * worldFade} distance={22} color="#21498e" />
      <pointLight position={[6.2, 2.8, -6.8]} intensity={0.30 * worldFade} distance={20} color="#16366c" />
      <pointLight position={[0.0, 0.7, 1.8]} intensity={1.05 * orbFade} distance={8} color="#89b8ff" />

      <mesh position={[0, 4.5, -24]}>
        <planeGeometry args={[44, 22]} />
        <meshBasicMaterial color="#010919" transparent opacity={0.98} depthWrite={false} />
      </mesh>

      {stars.map((s, i) => (
        <mesh key={`home-star-${i}`} position={[s[0], s[1] + d * 0.2, s[2]]}>
          <sphereGeometry args={[s[3], 8, 8]} />
          <meshBasicMaterial color="#dce9ff" transparent opacity={s[4] * worldFade} depthWrite={false} />
        </mesh>
      ))}

      <mesh position={[0.0, -2.45 - nearGroundShift, -6.4]} rotation={[-1.28, 0.04, -0.02]} scale={[20.5, 6.3, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#01060d" transparent opacity={0.96 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[-3.7, -1.98 - nearGroundShift * 0.72, -5.5]} rotation={[-1.24, 0.18, 0.16]} scale={[5.9, 1.62, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#06152d" transparent opacity={0.12 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[2.8, -1.84 - nearGroundShift * 0.60, -5.0]} rotation={[-1.23, -0.16, -0.14]} scale={[5.1, 1.42, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#081a37" transparent opacity={0.10 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[0.25, -1.70 - nearGroundShift * 0.48, -3.85]} rotation={[-1.23, 0.02, -0.04]} scale={[3.35, 0.82, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#153e83" transparent opacity={0.22 * worldFade} depthWrite={false} />
      </mesh>

      <mesh position={[1.35, -1.52 - nearGroundShift * 0.42, -3.45]} rotation={[-1.23, 0.08, 0.02]} scale={[1.88, 0.30, 1]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color="#2a61bc" transparent opacity={0.13 * worldFade} depthWrite={false} />
      </mesh>

      {skylineBack.map((m, i) => (
        <mesh key={`skyline-back-${i}`} position={[m.position[0], m.position[1] + skylineLift, m.position[2]]}>
          <boxGeometry args={m.scale} />
          <meshStandardMaterial
            color={m.color}
            roughness={0.99}
            metalness={0.01}
            transparent
            opacity={m.opacity * worldFade}
          />
        </mesh>
      ))}

      {skylineMid.map((m, i) => (
        <mesh key={`skyline-mid-${i}`} position={[m.position[0], m.position[1] + skylineLift * 0.8, m.position[2]]}>
          <boxGeometry args={m.scale} />
          <meshStandardMaterial
            color={m.color}
            roughness={0.98}
            metalness={0.01}
            transparent
            opacity={m.opacity * worldFade}
          />
        </mesh>
      ))}

      {windows.map((w, i) => (
        <mesh key={`window-${i}`} position={[w[0], w[1] + skylineLift * 0.85, w[2]]}>
          <boxGeometry args={[0.34, 0.10, 0.04]} />
          <meshBasicMaterial color="#355e9f" transparent opacity={(0.08 + ((i % 3) * 0.03)) * worldFade} depthWrite={false} />
        </mesh>
      ))}

      <group ref={orbRef} position={[0.15, -0.28, -0.18]} onClick={handleActivate}>
        <mesh position={[0, -0.26, 0]}>
          <sphereGeometry args={[0.72, 28, 28, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
          <meshStandardMaterial color="#0a111d" roughness={0.96} metalness={0.04} transparent opacity={0.94 * orbFade} />
        </mesh>

        <mesh position={[0, -0.04, 0]}>
          <torusGeometry args={[0.66, 0.07, 16, 48]} />
          <meshBasicMaterial color="#224d98" transparent opacity={0.34 * orbFade} depthWrite={false} />
        </mesh>

        <mesh position={[0, 0.18, 0]}>
          <sphereGeometry args={[0.52, 30, 30, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          <meshStandardMaterial
            color="#e8eef8"
            emissive="#95bbff"
            emissiveIntensity={0.16 * orbFade}
            roughness={0.66}
            metalness={0.02}
            transparent
            opacity={0.96 * orbFade}
          />
        </mesh>

        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.92, 24, 24]} />
          <meshBasicMaterial color="#4f7fd1" transparent opacity={0.055 * orbFade} depthWrite={false} />
        </mesh>
      </group>

      <mesh position={[0.08, -1.34 - nearGroundShift * 0.35, -1.86]} rotation={[-1.24, 0.03, 0.0]} scale={[3.05, 0.76, 1]}>
        <ringGeometry args={[0.34, 1.0, 96]} />
        <meshBasicMaterial color="#123a80" transparent opacity={0.11 * orbFade} depthWrite={false} />
      </mesh>

      <mesh position={[0.06, -1.38 - nearGroundShift * 0.35, -1.82]} rotation={[-1.24, 0.03, 0.0]} scale={[1.22, 0.34, 1]}>
        <circleGeometry args={[1, 96]} />
        <meshBasicMaterial color="#020915" transparent opacity={0.22 * orbFade} depthWrite={false} />
      </mesh>
    </group>
  )
}
