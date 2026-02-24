'use client'

import { useReplayStore } from '@/engine/core/replay-store'
import { Sphere, Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'

const REPLAY_RAMP_TIME = 1.5 // seconds

export default function ReplayScene() {
  const { memoryId, emotionalWeight } = useReplayStore()
  const sphereRef = useRef<THREE.Mesh>(null!)
  const lightRef = useRef<THREE.PointLight>(null!)

  const targetIntensity = emotionalWeight * 2
  const targetScale = 1 + emotionalWeight
  const targetColor = new THREE.Color().setHSL(0.6 - emotionalWeight * 0.5, 0.8, 0.6)

  useFrame((state, delta) => {
    if (!sphereRef.current || !lightRef.current) return

    const rampProgress = Math.min(state.clock.elapsedTime / REPLAY_RAMP_TIME, 1.0)

    // Ramp scale
    sphereRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), rampProgress)

    // Ramp light intensity
    lightRef.current.intensity = THREE.MathUtils.lerp(0, targetIntensity * 3, rampProgress)

    // Ramp emissive
    if (sphereRef.current.material instanceof THREE.MeshStandardMaterial) {
      sphereRef.current.material.emissiveIntensity = THREE.MathUtils.lerp(0, targetIntensity, rampProgress)
      sphereRef.current.material.color.lerp(targetColor, rampProgress)
    }
  })

  if (!memoryId) return null

  return (
    <>
      <pointLight ref={lightRef} position={[0, 0, 0]} intensity={0} />

      <Sphere ref={sphereRef} args={[1, 64, 64]} position={[0, 0, 0]} scale={0}>
        <meshStandardMaterial color="#000000" emissive="#ffffff" emissiveIntensity={0} />
      </Sphere>

      <Text position={[0, 2.5, 0]} fontSize={0.15} color="white" anchorX="center">
        Replaying Memory
      </Text>
      <Text position={[0, -2.5, 0]} fontSize={0.2} color="white" anchorX="center">
        {memoryId}
      </Text>
    </>
  )
}
