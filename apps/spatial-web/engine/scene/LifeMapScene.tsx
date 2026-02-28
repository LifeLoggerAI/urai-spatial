'use client'

import * as THREE from 'three'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import { useFocusStore } from '../state/useFocusStore'
import { useSceneModeStore } from '../state/useSceneModeStore'
import { useReplayStore } from '../state/useReplayStore'
import { anchorData } from '../data/anchors'
import Starfield from './Starfield'

const ORB_POSITION = new THREE.Vector3(0, 3, 0)

function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const selectedId = useFocusStore((s) => s.selectedId)
  const mode = useSceneModeStore((s) => s.mode)
  const replaySelected = useReplayStore((s) => s.selectedIndex)

  useFrame((state) => {
    if (!meshRef.current) return

    const time = state.clock.elapsedTime

    let baseScale = 1
    let breatheSpeed = 1.2
    let emissiveTarget = 0.8
    let targetColor = new THREE.Color('#88ccff')

    // LIFEMAP selection
    if (selectedId) {
      baseScale = 1.12
      emissiveTarget = 2.2
    }

    // REPLAY base behavior
    if (mode === 'REPLAY') {
      breatheSpeed = 0.6
      baseScale = 1.05
      emissiveTarget = 1.8
    }

    // REPLAY isolation (memory selected)
    if (mode === 'REPLAY' && replaySelected !== null) {
      baseScale = 1.18
      breatheSpeed = 0.4
      emissiveTarget = 3.5
      targetColor = new THREE.Color('#aaddff')
    }

    const breathe =
      Math.sin(time * breatheSpeed) * 0.05

    const targetScale = baseScale + breathe

    meshRef.current.scale.lerp(
      new THREE.Vector3(
        targetScale,
        targetScale,
        targetScale
      ),
      0.06
    )

    const material =
      meshRef.current.material as THREE.MeshStandardMaterial

    material.emissiveIntensity = THREE.MathUtils.lerp(
      material.emissiveIntensity,
      emissiveTarget,
      0.05
    )

    material.emissive.lerp(targetColor, 0.05)
  })

  return (
    <mesh
      ref={meshRef}
      position={ORB_POSITION}
    >
      <sphereGeometry args={[2, 64, 64]} />
      <meshStandardMaterial
        color="#ffffff"
        emissive="#88ccff"
        emissiveIntensity={0.8}
      />
    </mesh>
  )
}

export default function LifeMapScene() {
  const radius = 10

  const basePositions = useMemo(() => {
    return anchorData.map((_, i) => {
      const angle =
        (i / anchorData.length) * Math.PI * 2
      return new THREE.Vector3(
        Math.cos(angle) * radius,
        3,
        Math.sin(angle) * radius
      )
    })
  }, [])

  return (
    <>
      <Starfield />

      <ambientLight intensity={0.4} />
      <hemisphereLight
        args={['#88ccff', '#0a0f1f', 0.6]}
      />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.2}
        castShadow
      />

      <Orb />
    </>
  )
}