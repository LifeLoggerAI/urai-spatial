'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'

const PLATFORM_CENTER: [number, number, number] = [0, -0.57, -1.2]
const PALETTE = {
  blackStone: '#05070d',
  moonSilver: '#dbeafe',
  paleCyan: '#9be8ff',
  softGold: '#e7d59d',
  blueViolet: '#161a46',
}

function RuneRing({ radius, color, opacity, speed, reducedMotion }: { radius: number; color: string; opacity: number; speed: number; reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.MeshBasicMaterial>(null)

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    if (ref.current) ref.current.rotation.z = t * speed
    if (materialRef.current) materialRef.current.opacity = opacity + Math.sin(t * 1.05 + radius) * 0.018
  })

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={PLATFORM_CENTER}>
      <torusGeometry args={[radius, 0.006, 8, 192]} />
      <meshBasicMaterial ref={materialRef} color={color} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
  )
}

function SealedProgressionMarks({ reducedMotion }: { reducedMotion: boolean }) {
  const groupRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!groupRef.current || reducedMotion) return
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.008
  })

  return (
    <group ref={groupRef}>
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index / 24) * Math.PI * 2
        const radius = index % 4 === 0 ? 2.18 : 1.86
        const x = Math.cos(angle) * radius
        const z = -1.2 + Math.sin(angle) * radius
        const isMajor = index % 4 === 0

        return (
          <mesh key={index} position={[x, -0.454, z]} rotation={[-Math.PI / 2, 0, angle]}>
            <boxGeometry args={[isMajor ? 0.24 : 0.12, 0.008, 0.007]} />
            <meshBasicMaterial color={isMajor ? PALETTE.softGold : PALETTE.moonSilver} transparent opacity={isMajor ? 0.24 : 0.12} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
    </group>
  )
}

function OrbReflection() {
  return (
    <mesh position={[0, -0.446, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.92, 96]} />
      <meshBasicMaterial
        color={PALETTE.paleCyan}
        transparent
        opacity={0.082}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  )
}

export default function RitualPlatform({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const platformRef = useRef<THREE.Group>(null)
  const blackStone = useMemo(() => new THREE.Color(PALETTE.blackStone), [])

  useFrame(({ clock }) => {
    if (!platformRef.current || reducedMotion) return
    platformRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.01
  })

  return (
    <group ref={platformRef} position={[0, 0, 0]}>
      <mesh position={[0, -0.66, -1.2]} receiveShadow castShadow>
        <cylinderGeometry args={[2.42, 2.58, 0.2, 160]} />
        <meshStandardMaterial color={blackStone} roughness={0.24} metalness={0.48} emissive="#071126" emissiveIntensity={0.18} />
      </mesh>

      <mesh position={[0, -0.53, -1.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.36, 160]} />
        <meshStandardMaterial color="#070a12" roughness={0.18} metalness={0.62} emissive="#091326" emissiveIntensity={0.2} />
      </mesh>

      <mesh position={[0, -0.512, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.62, 160]} />
        <meshBasicMaterial color={PALETTE.softGold} transparent opacity={0.22} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <OrbReflection />
      <RuneRing radius={0.88} color={PALETTE.softGold} opacity={0.2} speed={0.026} reducedMotion={reducedMotion} />
      <RuneRing radius={1.24} color={PALETTE.moonSilver} opacity={0.16} speed={-0.018} reducedMotion={reducedMotion} />
      <RuneRing radius={1.66} color={PALETTE.paleCyan} opacity={0.11} speed={0.014} reducedMotion={reducedMotion} />
      <RuneRing radius={2.14} color={PALETTE.softGold} opacity={0.09} speed={-0.009} reducedMotion={reducedMotion} />
      <SealedProgressionMarks reducedMotion={reducedMotion} />
    </group>
  )
}
