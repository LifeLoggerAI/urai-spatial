'use client'

import React, { useMemo } from 'react'
import * as THREE from 'three'

export type HomeEnvironmentProps = {
  visible?: boolean
  onSkyOpen: () => void
}

type Spark = {
  position: [number, number, number]
  scale: number
  opacity: number
}

function buildSparks(count: number): Spark[] {
  const sparks: Spark[] = []
  for (let i = 0; i < count; i += 1) {
    const x = Math.sin(i * 1.713) * (9 + (i % 11) * 0.75)
    const y = 2.8 + Math.cos(i * 1.217) * (3.8 + (i % 7) * 0.35)
    const z = -14 - ((i * 7) % 18)
    sparks.push({
      position: [x, y, z],
      scale: 0.035 + (i % 5) * 0.012,
      opacity: 0.2 + (i % 6) * 0.08,
    })
  }
  return sparks
}

export default function HomeEnvironment({
  visible = true,
  onSkyOpen,
}: HomeEnvironmentProps) {
  const sparks = useMemo(() => buildSparks(96), [])

  return (
    <group visible={visible}>
      <mesh position={[0, -2.9, -16]} rotation={[-Math.PI / 2.04, 0, 0]}>
        <planeGeometry args={[84, 84]} />
        <meshStandardMaterial
          color="#07111c"
          emissive="#0b1c2b"
          emissiveIntensity={0.6}
          roughness={0.98}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, -0.65, -14]} rotation={[-Math.PI / 2.0, 0, 0]}>
        <ringGeometry args={[6.2, 12.4, 96]} />
        <meshBasicMaterial
          color="#102338"
          transparent
          opacity={0.18}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.95, -11.8]}>
        <sphereGeometry args={[1.04, 48, 48]} />
        <meshStandardMaterial
          color="#e5f1ff"
          emissive="#9ecbff"
          emissiveIntensity={1.8}
          roughness={0.08}
          metalness={0.06}
        />
      </mesh>

      <mesh position={[0, 0.95, -11.8]} scale={[1.85, 1.85, 1.85]}>
        <sphereGeometry args={[1.0, 36, 36]} />
        <meshBasicMaterial
          color="#6eaef8"
          transparent
          opacity={0.16}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 0.95, -11.8]} scale={[3.2, 3.2, 3.2]}>
        <sphereGeometry args={[1.0, 36, 36]} />
        <meshBasicMaterial
          color="#2e6bbf"
          transparent
          opacity={0.06}
          depthWrite={false}
        />
      </mesh>

      <mesh position={[0, 8.8, -24]} onClick={(event) => { event.stopPropagation(); onSkyOpen() }}>
        <planeGeometry args={[96, 40]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} />
      </mesh>

      {sparks.map((spark, idx) => (
        <mesh key={`home-spark-${idx}`} position={spark.position} scale={spark.scale}>
          <sphereGeometry args={[1, 10, 10]} />
          <meshBasicMaterial
            color="#d8e8ff"
            transparent
            opacity={spark.opacity}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  )
}
