'use client'

import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneStore } from '../state/sceneStore'

export default function Ground() {
  const mode = useSceneStore((s) => s.mode)

  useFrame(({ scene }) => {
    const fog = scene.fog

    if (!(fog instanceof THREE.FogExp2)) return

    const targetDensity =
      mode === 'memory' || mode === 'replay'
        ? 0.08
        : 0.02

    fog.density = THREE.MathUtils.lerp(fog.density, targetDensity, 0.02)
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -10, 0]} receiveShadow>
      <circleGeometry args={[200, 64]} />
      <meshStandardMaterial color="#050505" roughness={1} metalness={0} />
    </mesh>
  )
}