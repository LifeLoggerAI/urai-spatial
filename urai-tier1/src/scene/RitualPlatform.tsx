'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import {
  AAA_MOONLIT_PALETTE,
  makeProceduralStoneNormalTexture,
  MoonlitBlackStoneMaterial,
  SacredGlassMaterial,
  SealedProgressionMaterial,
  UraiReflectionMode,
} from '../spatial/visual/aaaMaterials'

const PLATFORM_CENTER: [number, number, number] = [0, -0.57, -1.2]
const PALETTE = {
  blackStone: AAA_MOONLIT_PALETTE.blackStone,
  moonSilver: AAA_MOONLIT_PALETTE.moonSilver,
  paleCyan: AAA_MOONLIT_PALETTE.paleCyan,
  softGold: AAA_MOONLIT_PALETTE.sacredGold,
  blueViolet: AAA_MOONLIT_PALETTE.blueViolet,
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
    <group ref={groupRef} data-testid="urai-world-native-progression-locks">
      {Array.from({ length: 24 }).map((_, index) => {
        const angle = (index / 24) * Math.PI * 2
        const radius = index % 4 === 0 ? 2.18 : 1.86
        const x = Math.cos(angle) * radius
        const z = -1.2 + Math.sin(angle) * radius
        const isMajor = index % 4 === 0
        const activated = index < 5

        return (
          <group key={index} position={[x, -0.454, z]} rotation={[-Math.PI / 2, 0, angle]}>
            <mesh>
              <boxGeometry args={[isMajor ? 0.24 : 0.12, 0.008, 0.007]} />
              <SealedProgressionMaterial major={isMajor} activated={activated} />
            </mesh>
            {isMajor ? (
              <mesh position={[0, 0, 0.012]}>
                <circleGeometry args={[0.055, 28]} />
                <SealedProgressionMaterial major activated={activated} />
              </mesh>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}

function OrbReflection({ reflectionMode }: { reflectionMode: UraiReflectionMode }) {
  const opacity = reflectionMode === 'planar' ? 0.16 : reflectionMode === 'faked' ? 0.095 : 0
  if (opacity <= 0) return null

  return (
    <group data-testid="urai-orb-reflection-field">
      <mesh position={[0, -0.446, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.98, 128]} />
        <meshBasicMaterial color={PALETTE.paleCyan} transparent opacity={opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[0, -0.445, -1.2]} rotation={[-Math.PI / 2, 0, 0]} scale={[1.65, 0.48, 1]}>
        <circleGeometry args={[0.74, 96]} />
        <meshBasicMaterial color={PALETTE.moonSilver} transparent opacity={opacity * 0.34} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function EngravedStoneVeins({ reducedMotion }: { reducedMotion: boolean }) {
  const count = reducedMotion ? 8 : 16

  return (
    <group>
      {Array.from({ length: count }).map((_, index) => {
        const angle = (index / count) * Math.PI * 2
        const radius = 0.92 + (index % 5) * 0.2
        const x = Math.cos(angle) * radius
        const z = -1.2 + Math.sin(angle) * radius

        return (
          <mesh key={index} position={[x, -0.506, z]} rotation={[-Math.PI / 2, 0, angle + Math.PI / 2]}>
            <planeGeometry args={[0.012, 0.54 + (index % 3) * 0.16]} />
            <meshBasicMaterial color={index % 4 === 0 ? PALETTE.softGold : PALETTE.paleCyan} transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
        )
      })}
    </group>
  )
}

export default function RitualPlatform({
  reducedMotion = false,
  reflectionMode = 'faked',
}: {
  reducedMotion?: boolean
  reflectionMode?: UraiReflectionMode
}) {
  const platformRef = useRef<THREE.Group>(null)
  const normalMap = useMemo(() => makeProceduralStoneNormalTexture(), [])

  useFrame(({ clock }) => {
    if (!platformRef.current || reducedMotion) return
    platformRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.12) * 0.01
  })

  return (
    <group ref={platformRef} position={[0, 0, 0]} data-testid="urai-aaa-ritual-platform">
      <mesh position={[0, -0.7, -1.2]} receiveShadow castShadow>
        <cylinderGeometry args={[2.48, 2.72, 0.28, 192, 2]} />
        <meshPhysicalMaterial
          color={PALETTE.blackStone}
          roughness={0.18}
          metalness={0.54}
          clearcoat={0.78}
          clearcoatRoughness={0.14}
          reflectivity={0.7}
          normalMap={normalMap}
          normalScale={new THREE.Vector2(0.08, 0.08)}
          emissive="#071126"
          emissiveIntensity={0.18}
        />
      </mesh>

      <mesh position={[0, -0.53, -1.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[2.36, 192]} />
        <MoonlitBlackStoneMaterial emissiveIntensity={0.2} reflective={reflectionMode !== 'off'} />
      </mesh>

      <mesh position={[0, -0.512, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.62, 160]} />
        <SacredGlassMaterial color={PALETTE.softGold} opacity={0.2} emissiveIntensity={0.32} />
      </mesh>

      <mesh position={[0, -0.505, -1.2]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.33, 192]} />
        <SacredGlassMaterial color={PALETTE.moonSilver} opacity={0.045} emissiveIntensity={0.18} />
      </mesh>

      <OrbReflection reflectionMode={reflectionMode} />
      <EngravedStoneVeins reducedMotion={reducedMotion} />
      <RuneRing radius={0.88} color={PALETTE.softGold} opacity={0.2} speed={0.026} reducedMotion={reducedMotion} />
      <RuneRing radius={1.24} color={PALETTE.moonSilver} opacity={0.16} speed={-0.018} reducedMotion={reducedMotion} />
      <RuneRing radius={1.66} color={PALETTE.paleCyan} opacity={0.11} speed={0.014} reducedMotion={reducedMotion} />
      <RuneRing radius={2.14} color={PALETTE.softGold} opacity={0.09} speed={-0.009} reducedMotion={reducedMotion} />
      <SealedProgressionMarks reducedMotion={reducedMotion} />
    </group>
  )
}
