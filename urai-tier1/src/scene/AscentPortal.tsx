'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

function seeded(index: number) {
  const x = Math.sin(index * 9142.173) * 10000
  return x - Math.floor(x)
}

function AscentMist() {
  const ref = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const count = 220
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)

    for (let i = 0; i < count; i += 1) {
      const radius = 1.8 + seeded(i + 10) * 6.2
      const angle = seeded(i + 22) * Math.PI * 2
      const depth = -2 - seeded(i + 55) * 18
      const lift = seeded(i + 88) * 6.8

      positions[i * 3] = Math.cos(angle) * radius
      positions[i * 3 + 1] = -1.1 + lift
      positions[i * 3 + 2] = depth + Math.sin(angle) * radius * 0.18

      colors[i * 3] = 0.62 + seeded(i + 100) * 0.18
      colors[i * 3 + 1] = 0.74 + seeded(i + 200) * 0.16
      colors[i * 3 + 2] = 0.9 + seeded(i + 300) * 0.1
    }

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return g
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    ref.current.position.y = Math.sin(t * 0.22) * 0.08
    ref.current.position.z = Math.sin(t * 0.16) * 0.28
    ref.current.rotation.y = Math.sin(t * 0.09) * 0.035
  })

  return (
    <points ref={ref} geometry={geometry} frustumCulled={false}>
      <pointsMaterial size={0.028} vertexColors transparent opacity={0.42} depthWrite={false} />
    </points>
  )
}

function CrescentSeal({ index }: { index: number }) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime + index * 0.44
    const pulse = 1 + Math.sin(t * 0.9) * 0.028
    ref.current.scale.setScalar((1.35 + index * 0.42) * pulse)
    ref.current.rotation.z = Math.sin(t * 0.35) * 0.09 + index * 0.42
    ref.current.rotation.x = Math.PI / 2.85 + Math.sin(t * 0.18) * 0.03
  })

  return (
    <mesh ref={ref} position={[0, 1.18 + index * 0.18, -3.8 - index * 1.55]}>
      <torusGeometry args={[1, 0.006, 8, 96, Math.PI * 1.36]} />
      <meshBasicMaterial
        color={index % 3 === 1 ? '#e7d59d' : index % 2 === 0 ? '#dbeafe' : '#9bd9ff'}
        transparent
        opacity={0.24 - index * 0.018}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

function OrbContinuityAnchor() {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * 1.15) * 0.025
    ref.current.scale.setScalar(breath)
    ref.current.position.y = 1.18 + Math.sin(t * 0.72) * 0.035
  })

  return (
    <group ref={ref} position={[0, 1.18, -3.2]}>
      <mesh>
        <sphereGeometry args={[0.34, 48, 24]} />
        <meshStandardMaterial color="#0b1226" emissive="#bff7ff" emissiveIntensity={1.65} roughness={0.42} metalness={0.18} transparent opacity={0.92} />
      </mesh>
      <mesh scale={1.65}>
        <sphereGeometry args={[0.34, 48, 24]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh scale={[2.1, 2.1, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.36, 0.006, 8, 96]} />
        <meshBasicMaterial color="#e7d59d" transparent opacity={0.32} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function MoonbeamVeil() {
  return (
    <group>
      <mesh position={[0, 2.8, -7.2]} rotation={[0, 0, 0]}>
        <planeGeometry args={[7.4, 8.6]} />
        <meshBasicMaterial color="#dbeafe" transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, 0.05, -2.9]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 4.8, 128]} />
        <meshBasicMaterial color="#9bd9ff" transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function AscentPortal() {
  return (
    <group>
      <MoonbeamVeil />
      <OrbContinuityAnchor />
      {Array.from({ length: 6 }).map((_, index) => <CrescentSeal key={index} index={index} />)}
      <mesh position={[0, 1.35, -7.4]}>
        <sphereGeometry args={[2.1, 48, 24]} />
        <meshBasicMaterial color="#9bd9ff" transparent opacity={0.052} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <AscentMist />
    </group>
  )
}
