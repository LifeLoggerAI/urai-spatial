'use client'

import * as THREE from 'three'
import { useThree, useFrame } from '@react-three/fiber'
import Orb from './Orb'
import { useEffect, useRef, useMemo } from 'react'
import { useEmotionStore } from '../state/emotion-store'

export default function World() {
  const { scene } = useThree()
  const groundMaterialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const starMaterialRef = useRef<THREE.ShaderMaterial>(null!)
  const { state, intensity } = useEmotionStore()

  useEffect(() => {
    scene.background = new THREE.Color('#0a0f1c')
    scene.fog = new THREE.FogExp2('#0a0f1c', 0.028)
  }, [scene])

  useFrame(() => {
    if (groundMaterialRef.current) {
      const mat = groundMaterialRef.current

      let targetColor = new THREE.Color('#2f3640')
      let targetRoughness = 0.8

      switch (state) {
        case 'growth':
          targetColor = new THREE.Color('#5e7f62')
          targetRoughness = 0.75
          break

        case 'clarity':
          targetColor = new THREE.Color('#4a5d73')
          targetRoughness = 0.7
          break

        case 'grief':
          targetColor = new THREE.Color('#1f2328')
          targetRoughness = 0.9
          break

        case 'trauma':
          targetColor = new THREE.Color('#1a1d21')
          targetRoughness = 0.95
          break

        case 'recovery':
          targetColor = new THREE.Color('#3a4a5a')
          targetRoughness = 0.75
          break

        default:
          targetColor = new THREE.Color('#2f3640')
          targetRoughness = 0.8
      }

      mat.color.lerp(targetColor, 0.03)
      mat.roughness += (targetRoughness - mat.roughness) * 0.05
    }

    if (starMaterialRef.current) {
      let brightness = 1

      switch (state) {
        case 'grief':
          brightness = 0.7
          break

        case 'trauma':
          brightness = 0.6
          break

        case 'anxiety':
          brightness = 0.85
          break

        case 'clarity':
          brightness = 1.15
          break

        case 'growth':
          brightness = 1.1
          break

        case 'breakthrough':
          brightness = 1.25
          break

        case 'recovery':
          brightness = 1.05
          break

        default:
          brightness = 1
      }

      const target = brightness * (0.9 + intensity * 0.3)

      starMaterialRef.current.uniforms.uEmotionBrightness.value += (target - starMaterialRef.current.uniforms.uEmotionBrightness.value) * 0.05
    }
  })

  const starGeometry = useMemo(() => {
    const positions = new Float32Array(5000 * 3)
    for (let i = 0; i < 5000; i++) {
      const x = (Math.random() - 0.5) * 200
      const y = Math.random() * 100
      const z = (Math.random() - 0.5) * 200
      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geometry
  }, [])

  return (
    <>
      <Orb />

      {/* Ground repositioned for proper horizon */}
      <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 80]} />
        <meshStandardMaterial
          ref={groundMaterialRef}
          color="#2f3640"
          roughness={1}
          metalness={0}
        />
      </mesh>

      <points geometry={starGeometry}>
        <shaderMaterial
          ref={starMaterialRef}
          uniforms={{
            uEmotionBrightness: { value: 1.0 },
          }}
          vertexShader={`
            void main() {
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = 2.0;
            }
          `}
          fragmentShader={`
            uniform float uEmotionBrightness;

            void main() {
              gl_FragColor = vec4(vec3(uEmotionBrightness), 1.0);
            }
          `}
        />
      </points>

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 9, 6]} intensity={1.0} />
    </>
  )
}
