'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneModeStore } from '../state/useSceneModeStore'
import HomeScene from '../scene/HomeScene'
import LifeMapScene from '../scene/LifeMapScene'
import ReplayScene from '../scene/ReplayScene'
import ModeToggle from '../ui/ModeToggle'

export default function SceneRouter() {
  const mode = useSceneModeStore((s) => s.mode)

  const homeRef = useRef<THREE.Group>(null!)
  const lifeMapRef = useRef<THREE.Group>(null!)
  const replayRef = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!homeRef.current || !lifeMapRef.current || !replayRef.current) return

    const homeTarget = mode === 'HOME' ? 1 : 0.85
    const lifeTarget = mode === 'LIFEMAP' ? 1 : 0.85
    const replayTarget = mode === 'REPLAY' ? 1 : 0.85

    homeRef.current.scale.lerp(
      new THREE.Vector3(homeTarget, homeTarget, homeTarget),
      0.05
    )

    lifeMapRef.current.scale.lerp(
      new THREE.Vector3(lifeTarget, lifeTarget, lifeTarget),
      0.05
    )

    replayRef.current.scale.lerp(
      new THREE.Vector3(replayTarget, replayTarget, replayTarget),
      0.05
    )
  })

  return (
    <>
      <group ref={homeRef}>
        <HomeScene />
      </group>

      <group ref={lifeMapRef}>
        <LifeMapScene />
      </group>

      <group ref={replayRef}>
        <ReplayScene />
      </group>

      <ModeToggle />
    </>
  )
}