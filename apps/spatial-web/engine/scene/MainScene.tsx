'use client'

import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useSceneModeStore } from '../state/useSceneModeStore'
import OrbAura from '../effects/OrbAura'

export default function MainScene() {
  const orbRef = useRef<THREE.Mesh>(null!)
  const avatarRef = useRef<THREE.Mesh>(null!)

  const [isHovered, setIsHovered] = useState(false)
  const setMode = useSceneModeStore((s) => s.setMode)

  const stars = useMemo(() => {
    const arr = new Float32Array(6000 * 3)
    for (let i = 0; i < 6000; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 800
      arr[i * 3 + 1] = Math.random() * 400
      arr[i * 3 + 2] = (Math.random() - 0.5) * 800
    }
    return arr
  }, [])

  useFrame((state, delta) => {
    const t = state.clock.getElapsedTime()

    if (orbRef.current) {
      const breath = 1 + Math.sin(t * 0.8) * 0.015
      const hoverScale = isHovered ? 1.05 : 1
      const finalScale = breath * hoverScale

      orbRef.current.scale.set(finalScale, finalScale, finalScale)
      orbRef.current.rotation.y += delta * 0.12
    }

    if (avatarRef.current) {
      avatarRef.current.position.y =
        1.1 + Math.sin(t * 0.5) * 0.06
    }
  })

  return (
    <>
      {/* GRADIENT SKY */}
      <mesh>
        <sphereGeometry args={[600, 64, 64]} />
        <meshBasicMaterial
          side={THREE.BackSide}
          color="#060912"
        />
      </mesh>

      {/* STARS */}
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={stars.length / 3}
            array={stars}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          size={1.1}
          color="#ffffff"
          sizeAttenuation
          depthWrite={false}
        />
      </points>

      {/* LIGHTING */}
      <hemisphereLight args={['#bcd4ff', '#0a0a0a', 0.7]} />
      <directionalLight
        position={[6, 18, 8]}
        intensity={1.8}
        castShadow
      />

      {/* RIM LIGHT */}
      <pointLight
        position={[0, 4, -4]}
        intensity={2}
        color="#88aaff"
      />

      {/* GROUND WITH DEPTH */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial
          color="#0a0a0a"
          roughness={1}
          metalness={0}
        />
      </mesh>

      {/* AVATAR */}
      <mesh
        ref={avatarRef}
        position={[0, 1.1, -2.2]}
        castShadow
      >
        <capsuleGeometry args={[0.4, 1.4, 8, 16]} />
        <meshStandardMaterial color="#151515" />
      </mesh>

      {/* ORB & AURA */}
      <group position={[0, 3, 0]}>
        <OrbAura />
        <mesh
          ref={orbRef}
          castShadow
          onPointerEnter={() => setIsHovered(true)}
          onPointerLeave={() => setIsHovered(false)}
          onClick={() => setMode('LIFEMAP')}
        >
          <sphereGeometry args={[1.9, 64, 64]} />
          <meshStandardMaterial
            color="#ffffff"
            roughness={0.25}
            metalness={0.3}
            emissive="#1a1a2a"
            emissiveIntensity={0.6}
          />
        </mesh>
      </group>
    </>
  )
}
