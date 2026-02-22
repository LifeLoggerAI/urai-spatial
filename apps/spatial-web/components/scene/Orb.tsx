'use client'

import { useRef, useState } from 'react'
import { Mesh, Color, AdditiveBlending, Vector3, Vector2, Material } from 'three'
import { useFrame } from '@react-three/fiber'
import { useSpring, animated } from '@react-spring/three'
import { MathUtils } from 'three'

// Define a type for the material to satisfy TypeScript when accessing emissiveIntensity
interface EmissiveMaterial extends Material {
  emissiveIntensity: number
}

export default function Orb() {
  const meshRef = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)
  const [isManifested, setIsManifested] = useState(false)

  // A ref to hold the smoothly interpolated cursor position
  const gravityOffset = useRef(new Vector3()).current
  const orbScreenPos = useRef(new Vector2()).current

  const { scale } = useSpring({
    from: { scale: 0.001 },
    to: { scale: 1 },
    config: { duration: 1200, easing: (t) => 1 - Math.pow(1 - t, 3) }, // easeOutCubic
    onRest: () => setIsManifested(true),
  })

  useFrame(({ clock, pointer, camera }) => {
    if (!meshRef.current || !haloRef.current) return

    const t = clock.getElapsedTime()

    // --- Animations ---

    // 1. Gravity: Smoothly interpolates toward a target offset defined by cursor position.
    const gravityTarget = new Vector3(pointer.x * 0.05, pointer.y * 0.05, 0)
    gravityOffset.lerp(gravityTarget, 0.05) // Slow lerp for cinematic feel

    // 2. Floating: A gentle, continuous vertical oscillation around the anchor point.
    const verticalAnchor = 0.5
    const floatY = verticalAnchor + Math.sin(t * 0.2) * 0.2

    // 3. Rotation: Slow, constant rotation.
    const rotationYUpdate = 0.003

    // --- Apply to Meshes ---
    meshRef.current.position.x = gravityOffset.x
    meshRef.current.position.y = floatY + gravityOffset.y
    meshRef.current.rotation.y += rotationYUpdate

    haloRef.current.position.copy(meshRef.current.position)
    haloRef.current.rotation.copy(meshRef.current.rotation)

    // --- Post-Manifestation Animations ---
    if (isManifested) {
      // 4. Breathing: A micro-scale animation.
      const breathe = 1 + Math.sin(t * 0.25) * 0.012
      meshRef.current.scale.set(breathe, breathe, breathe)
      haloRef.current.scale.set(breathe, breathe, breathe)

      // 5. Proximity Energy Lift: Emissive intensity increases when cursor is near the orb.
      const meshMaterial = meshRef.current.material as EmissiveMaterial
      
      // Project orb's world position to normalized screen coordinates (-1 to 1)
      const screenPosVec3 = meshRef.current.position.clone().project(camera)
      orbScreenPos.set(screenPosVec3.x, screenPosVec3.y)

      // Calculate distance from cursor (pointer) to the orb's screen position
      const dist = pointer.distanceTo(orbScreenPos)

      // Define target intensity based on proximity
      const baseIntensity = 0.25
      const proximityIntensity = 0.45
      const targetIntensity = dist < 0.3 ? proximityIntensity : baseIntensity

      // Smoothly interpolate the emissive intensity
      meshMaterial.emissiveIntensity = MathUtils.lerp(
        meshMaterial.emissiveIntensity,
        targetIntensity,
        0.05
      )
    }
  })

  return (
    <animated.group scale={scale}>
      <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
        <sphereGeometry args={[0.9, 64, 64]} />
        <meshStandardMaterial
          color="#1e3a8a"
          emissive="#0b4d6b"
          emissiveIntensity={0.25} // Initial intensity
          roughness={0.3}
          metalness={0.7}
        />
      </mesh>
      <mesh ref={haloRef} position={[0, 0.5, 0]}>
        <sphereGeometry args={[1.05, 64, 64]} />
        <meshStandardMaterial
          color={new Color('#0ea5e9')}
          transparent
          opacity={0.1}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </animated.group>
  )
}
