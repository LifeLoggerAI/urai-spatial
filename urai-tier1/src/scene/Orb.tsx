'use client'

import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import { subscribeNarratorSpeaking } from '../spatial/narrator/narratorStore'
import {
  AAA_MOONLIT_PALETTE,
  SacredGlassMaterial,
  SealedProgressionMaterial,
  resolveSpatialRenderBudget,
} from '../spatial/visual/aaaMaterials'
import { useReducedMotion } from '../spatial/hooks/useReducedMotion'

export type OrbState = 'idle' | 'listening' | 'memoryBloom' | 'ritual' | 'recovery'

type OrbSkin = {
  aura: string
  halo: string
  light: string
  emissive: string
  core: string
  shell: string
  ring: string
  accent: string
  intensity: number
  ringSpeed: number
  runeCount: number
}

const orbPalette: Record<OrbState, OrbSkin> = {
  idle: {
    aura: '#9b7cff',
    halo: '#8edcff',
    light: '#cbb6ff',
    emissive: '#d7c5ff',
    core: '#f4f6ff',
    shell: AAA_MOONLIT_PALETTE.moonSilver,
    ring: AAA_MOONLIT_PALETTE.paleCyan,
    accent: AAA_MOONLIT_PALETTE.sacredGold,
    intensity: 1.8,
    ringSpeed: 0.18,
    runeCount: 10,
  },
  listening: {
    aura: '#6ee7ff',
    halo: '#d9f7ff',
    light: '#8be9ff',
    emissive: '#bff7ff',
    core: '#e9fbff',
    shell: '#bff7ff',
    ring: '#6ee7ff',
    accent: '#d9f7ff',
    intensity: 2.35,
    ringSpeed: 0.3,
    runeCount: 12,
  },
  memoryBloom: {
    aura: '#f0abfc',
    halo: '#fef3c7',
    light: '#f5d0fe',
    emissive: '#f0abfc',
    core: '#fff7ed',
    shell: '#f5d0fe',
    ring: '#f0abfc',
    accent: '#fef3c7',
    intensity: 2.55,
    ringSpeed: 0.24,
    runeCount: 14,
  },
  ritual: {
    aura: '#fbbf24',
    halo: '#fed7aa',
    light: '#fde68a',
    emissive: '#facc15',
    core: '#fff7d6',
    shell: '#fde68a',
    ring: '#fbbf24',
    accent: '#ffffff',
    intensity: 2.75,
    ringSpeed: 0.36,
    runeCount: 16,
  },
  recovery: {
    aura: '#86efac',
    halo: '#bbf7d0',
    light: '#a7f3d0',
    emissive: '#bbf7d0',
    core: '#f0fdf4',
    shell: '#bbf7d0',
    ring: '#86efac',
    accent: '#dcfce7',
    intensity: 2.45,
    ringSpeed: 0.16,
    runeCount: 12,
  },
}

function OrbGyroRings({ skin, reducedMotion }: { skin: OrbSkin; reducedMotion: boolean }) {
  const outerRef = useRef<THREE.Group>(null)
  const middleRef = useRef<THREE.Group>(null)
  const innerRef = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const t = clock.elapsedTime
    if (outerRef.current) outerRef.current.rotation.y = t * skin.ringSpeed
    if (middleRef.current) middleRef.current.rotation.x = t * skin.ringSpeed * -0.72
    if (innerRef.current) innerRef.current.rotation.z = t * skin.ringSpeed * 0.58
  })

  return (
    <group data-testid="urai-orb-gyroscopic-rings">
      <group ref={outerRef} rotation={[0.38, 0, -0.12]}>
        <mesh>
          <torusGeometry args={[0.52, 0.008, 12, 160]} />
          <meshBasicMaterial color={skin.ring} transparent opacity={0.42} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={middleRef} rotation={[Math.PI / 2.65, 0.18, 0]}>
        <mesh>
          <torusGeometry args={[0.47, 0.006, 12, 144]} />
          <meshBasicMaterial color={skin.accent} transparent opacity={0.24} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
      <group ref={innerRef} rotation={[0.12, Math.PI / 2.6, 0.22]}>
        <mesh>
          <torusGeometry args={[0.41, 0.005, 12, 128]} />
          <meshBasicMaterial color={skin.halo} transparent opacity={0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  )
}

function OrbStateRunes({ state, skin, reducedMotion }: { state: OrbState; skin: OrbSkin; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)
  const runes = useMemo(() => Array.from({ length: skin.runeCount }), [skin.runeCount])

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * skin.ringSpeed * 0.42
  })

  return (
    <group ref={ref} data-testid="urai-orb-state-runes" data-orb-state-rune-skin={state}>
      {runes.map((_, index) => {
        const angle = (index / skin.runeCount) * Math.PI * 2
        const radius = 0.71
        const x = Math.cos(angle) * radius
        const z = Math.sin(angle) * radius
        const major = index % 4 === 0
        const activated = state === 'ritual' || state === 'memoryBloom' || index % 3 === 0

        return (
          <group key={index} position={[x, -0.005, z]} rotation={[0, -angle, 0]}>
            <mesh>
              <boxGeometry args={[major ? 0.095 : 0.055, 0.012, 0.006]} />
              <SealedProgressionMaterial major={major} activated={activated} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function OrbCoreArtifact({ skin, speechPulse }: { skin: OrbSkin; speechPulse: number }) {
  return (
    <group data-testid="urai-orb-layered-core">
      <mesh castShadow>
        <sphereGeometry args={[0.32 * speechPulse, 64, 64]} />
        <meshPhysicalMaterial
          color={skin.core}
          emissive={skin.emissive}
          emissiveIntensity={0.78 * speechPulse}
          metalness={0.12}
          roughness={0.16}
          clearcoat={0.76}
          clearcoatRoughness={0.1}
          reflectivity={0.62}
        />
      </mesh>

      <mesh scale={[1.08, 1.08, 1.08]}>
        <icosahedronGeometry args={[0.34, 3]} />
        <meshBasicMaterial color={skin.emissive} transparent opacity={0.08} depthWrite={false} wireframe blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

export default function Orb({ state = 'idle' }: { state?: OrbState }) {
  const groupRef = useRef<THREE.Group>(null)
  const auraRef = useRef<THREE.Mesh>(null)
  const haloRef = useRef<THREE.Mesh>(null)
  const shellRef = useRef<THREE.Mesh>(null)
  const lightRef = useRef<THREE.PointLight>(null)
  const [narratorSpeaking, setNarratorSpeakingState] = useState(false)
  const reducedMotion = useReducedMotion()
  const budget = useMemo(() => resolveSpatialRenderBudget({ reducedMotion, qualityTier: reducedMotion ? 'low' : 'high' }), [reducedMotion])
  const activeState = narratorSpeaking && state === 'idle' ? 'listening' : state
  const skin = orbPalette[activeState]

  useEffect(() => {
    const unsubscribe = subscribeNarratorSpeaking(setNarratorSpeakingState)

    return () => {
      unsubscribe()
    }
  }, [])

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const stateBoost =
      activeState === 'ritual'
        ? 0.09
        : activeState === 'memoryBloom'
          ? 0.075
          : activeState === 'listening'
            ? 0.06
            : 0.035

    const breath = 1 + Math.sin(t * 1.12) * stateBoost
    const pulse = 1 + Math.sin(t * 0.72 + 0.6) * (stateBoost * 2.2)
    const speechPulse = narratorSpeaking ? 1 + Math.sin(t * 8.5) * 0.045 : 1

    if (groupRef.current) {
      groupRef.current.position.y = -0.2 + Math.sin(t * 0.86) * (reducedMotion ? 0.012 : 0.045)
      groupRef.current.scale.setScalar(breath * speechPulse)
    }

    if (auraRef.current) {
      auraRef.current.scale.setScalar(1.55 * pulse * speechPulse)
      auraRef.current.rotation.z = reducedMotion ? 0 : t * 0.08

      const material = auraRef.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.set(skin.aura)
        material.opacity += ((narratorSpeaking ? 0.28 : 0.18) - material.opacity) * 0.06
      }
    }

    if (haloRef.current) {
      haloRef.current.scale.set(
        2.3 + Math.sin(t * 0.64) * (reducedMotion ? 0.03 : 0.1),
        2.3 + Math.cos(t * 0.52) * (reducedMotion ? 0.02 : 0.08),
        1,
      )
      haloRef.current.rotation.z = reducedMotion ? 0 : Math.sin(t * 0.24) * 0.12

      const material = haloRef.current.material
      if (material instanceof THREE.MeshBasicMaterial) {
        material.color.set(skin.halo)
        material.opacity += ((narratorSpeaking ? 0.16 : 0.09) - material.opacity) * 0.06
      }
    }

    if (shellRef.current) {
      shellRef.current.rotation.y = reducedMotion ? 0 : t * 0.11
      shellRef.current.rotation.x = reducedMotion ? 0 : Math.sin(t * 0.2) * 0.05
    }

    if (lightRef.current) {
      lightRef.current.color.set(skin.light)
      lightRef.current.intensity += (skin.intensity * speechPulse - lightRef.current.intensity) * 0.08
    }
  })

  const speechPulse = narratorSpeaking ? 1.04 : 1
  const ringEnabled = budget.atmosphereMode !== 'minimal'

  return (
    <group
      ref={groupRef}
      position={[0, -0.18, -1.2]}
      data-testid="urai-sacred-tech-orb"
      data-orb-state={activeState}
      data-orb-layered-artifact="true"
      data-render-budget-quality-tier={budget.qualityTier}
    >
      <pointLight
        ref={lightRef}
        position={[0, 0.15, 0.1]}
        intensity={skin.intensity}
        color={skin.light}
        distance={5.8}
      />

      <mesh ref={haloRef} rotation={[0, 0, 0]} position={[0, 0, -0.08]} data-testid="urai-orb-soft-halo">
        <circleGeometry args={[0.72, 80]} />
        <meshBasicMaterial color={skin.halo} transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={auraRef} position={[0, 0, 0]} data-testid="urai-orb-aura-shell">
        <sphereGeometry args={[0.54, 64, 64]} />
        <meshBasicMaterial color={skin.aura} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      <mesh ref={shellRef} scale={[1.18, 1.18, 1.18]} data-testid="urai-orb-glass-shell">
        <sphereGeometry args={[0.38, 64, 64]} />
        <SacredGlassMaterial color={skin.shell} opacity={0.17} emissiveIntensity={0.34} />
      </mesh>

      <OrbCoreArtifact skin={skin} speechPulse={speechPulse} />

      {ringEnabled ? <OrbGyroRings skin={skin} reducedMotion={reducedMotion} /> : null}
      <OrbStateRunes state={activeState} skin={skin} reducedMotion={reducedMotion} />

      <mesh position={[-0.13, 0.14, 0.29]} data-testid="urai-orb-moonlit-specular-gem">
        <sphereGeometry args={[0.075, 24, 24]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={0.74} />
      </mesh>
    </group>
  )
}
