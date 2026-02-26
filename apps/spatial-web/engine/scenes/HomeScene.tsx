
'use client'

import { useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import Atmosphere from '../../environment/Atmosphere'
import EmotionalLighting from '../../components/scene/EmotionalLighting'

/* ===================== ORB ===================== */

function Orb() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const scale = 1 + Math.sin(t * 1.2) * 0.05 // breathing
    ref.current.scale.set(scale, scale, scale)
  })

  return (
    <mesh ref={ref} position={[0, 0.6, 0]}>
      <sphereGeometry args={[1, 128, 128]} />
      <meshStandardMaterial
        color="#b83b8f"
        roughness={0.25}
        metalness={0.2}
        emissive="#3a0a2e"
        emissiveIntensity={0.4}
      />
    </mesh>
  )
}

/* ===================== GRADIENT GROUND ===================== */

function Ground() {
  const material = new THREE.ShaderMaterial({
    uniforms: {},
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      void main() {
        vec3 top = vec3(0.05, 0.08, 0.2);
        vec3 bottom = vec3(0.01, 0.02, 0.06);
        vec3 color = mix(bottom, top, vUv.y);
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  })

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[50, 50]} />
      <primitive object={material} attach="material" />
    </mesh>
  )
}

/* ===================== SKY DOME ===================== */

function Sky() {
  return (
    <mesh>
      <sphereGeometry args={[100, 32, 32]} />
      <meshBasicMaterial
        color="#020817"
        side={THREE.BackSide}
      />
    </mesh>
  )
}

/* ===================== HOME SCENE ===================== */

export default function HomeScene() {
  return (
    <>
      <fog attach="fog" args={['#020817', 6, 20]} />

      <EmotionalLighting />

      <Sky />
      <Atmosphere />

      {/* Starfield Layer */}
      <Stars
        radius={120}
        depth={60}
        count={5000}
        factor={6}
        saturation={0}
        fade
        speed={0.5}
      />

      <Ground />
      <Orb />
    </>
  )
}
