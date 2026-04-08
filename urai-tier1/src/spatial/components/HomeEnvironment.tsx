'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'

type HomeEnvironmentProps = {
  visible?: boolean
  onSkyOpen?: () => void
}

type DustPoint = {
  position: [number, number, number]
  size: number
  opacity: number
}

function makeDust(count: number, radius: number, yMin: number, yMax: number): DustPoint[] {
  const points: DustPoint[] = []
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2 + (i % 7) * 0.37
    const ring = radius * (0.28 + ((i * 17) % 71) / 100)
    const x = Math.cos(angle) * ring
    const z = -Math.abs(Math.sin(angle) * ring) - 6 - (i % 9)
    const y = yMin + ((i * 13) % 100) / 100 * (yMax - yMin)
    points.push({
      position: [x, y, z],
      size: 0.02 + (i % 5) * 0.012,
      opacity: 0.035 + (i % 6) * 0.018,
    })
  }
  return points
}

export default function HomeEnvironment({
  visible = true,
  onSkyOpen,
}: HomeEnvironmentProps) {
  const farDust = useMemo(() => makeDust(44, 20, 1.2, 7.8), [])
  const nearDust = useMemo(() => makeDust(18, 9, 0.4, 3.6), [])

  if (!visible) return null

  return (
    <group>
      <mesh position={[0, 0, -14]}>
        <sphereGeometry args={[70, 40, 40]} />
        <meshBasicMaterial color="#04101a" side={THREE.BackSide} depthWrite={false} />
      </mesh>

      <mesh position={[0, -24.5, -20]} rotation={[-Math.PI / 2.08, 0, 0]}>
        <circleGeometry args={[44, 72]} />
        <meshBasicMaterial color="#03101b" transparent opacity={0.95} depthWrite={false} />
      </mesh>

      <mesh position={[0, -0.72, -7.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[20, 72]} />
        <meshBasicMaterial color="#082238" transparent opacity={0.18} depthWrite={false} />
      </mesh>

      <mesh position={[0, -0.44, -7.4]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[6.5, 16.5, 72]} />
        <meshBasicMaterial color="#123551" transparent opacity={0.12} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0.78, -7.2]}>
        <sphereGeometry args={[0.84, 36, 36]} />
        <meshBasicMaterial color="#eef6ff" transparent opacity={0.96} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0.78, -7.2]}>
        <sphereGeometry args={[1.34, 36, 36]} />
        <meshBasicMaterial color="#9bc6ff" transparent opacity={0.14} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0.78, -7.2]}>
        <sphereGeometry args={[2.45, 40, 40]} />
        <meshBasicMaterial color="#356aab" transparent opacity={0.06} depthWrite={false} />
      </mesh>

      <mesh position={[0, 0.78, -7.2]}>
        <sphereGeometry args={[4.25, 48, 48]} />
        <meshBasicMaterial color="#173c68" transparent opacity={0.035} depthWrite={false} />
      </mesh>

      <pointLight
        position={[0, 0.78, -7.2]}
        intensity={1.2}
        distance={18}
        decay={2}
        color="#9ec5ff"
      />

      <pointLight
        position={[0, -0.2, -5.5]}
        intensity={0.38}
        distance={14}
        decay={2}
        color="#6f98d8"
      />

      <mesh
        position={[0, 3.6, -16]}
        onClick={() => onSkyOpen?.()}
        onPointerDown={() => onSkyOpen?.()}
      >
        <planeGeometry args={[18, 10]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>

      {farDust.map((p, i) => (
        <mesh key={`far-${i}`} position={p.position}>
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial color="#d8e8ff" transparent opacity={p.opacity} depthWrite={false} />
        </mesh>
      ))}

      {nearDust.map((p, i) => (
        <mesh key={`near-${i}`} position={p.position}>
          <sphereGeometry args={[p.size * 1.6, 8, 8]} />
          <meshBasicMaterial color="#9fc5ff" transparent opacity={p.opacity * 0.8} depthWrite={false} />
        </mesh>
      ))}
    </group>
  )
}
