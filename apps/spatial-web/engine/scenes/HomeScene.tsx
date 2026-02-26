
'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { useRef } from 'react'
import * as THREE from 'three'
import { useInteractionStore } from '../state/interactionStore'
import { Anchor } from '../types/anchor'
import { homeAnchors } from '../state/anchorRegistry'

/* ===================== CAMERA ===================== */

function CameraRig() {
  const { camera } = useThree()

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    camera.position.y = 1.4 + Math.sin(t * 0.2) * 0.02
    camera.position.x = Math.sin(t * 0.15) * 0.02
  })

  return null
}

/* ===================== ORB ===================== */

function Orb() {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<THREE.MeshStandardMaterial>(null!)
  const { setHovered, setActive } = useInteractionStore()

  useFrame(({ clock }) => {
    if (!meshRef.current || !materialRef.current) return
    const t = clock.getElapsedTime()

    // Breathing effect
    const scale = 1 + Math.sin(t * 1.2) * 0.015
    meshRef.current.scale.set(scale, scale, scale)

    // Emissive pulse
    materialRef.current.emissiveIntensity = 0.35 + Math.sin(t * 0.6) * 0.05
  })

  return (
    <mesh
      ref={meshRef}
      position={[0, 1.1, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered('orb')
      }}
      onPointerOut={() => setHovered(null)}
      onClick={() => setActive('orb')}
    >
      <sphereGeometry args={[0.6, 128, 128]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#c2187a"
        emissive="#4a0033"
        emissiveIntensity={0.4}
        roughness={0.25}
        metalness={0.3}
      />
    </mesh>
  )
}

/* ===================== ANCHORS ===================== */

function AnchorObject({ anchor }: { anchor: Anchor }) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const { setHovered, setActive, hoveredId } = useInteractionStore()
  const isHovered = hoveredId === anchor.id

  useFrame(() => {
    if (!meshRef.current) return
    const targetY = isHovered ? -1.45 : -1.5
    meshRef.current.position.y = THREE.MathUtils.lerp(
      meshRef.current.position.y,
      targetY,
      0.1
    )
  })

  return (
    <mesh
      ref={meshRef}
      position={[anchor.position[0], -1.5, anchor.position[2]]}
      rotation={[-Math.PI / 2, 0, 0]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(anchor.id)
      }}
      onPointerOut={() => setHovered(null)}
      onClick={() => setActive(anchor.id)}
    >
      <cylinderGeometry args={[0.3, 0.3, 0.05, 64]} />
      <meshStandardMaterial
        color={isHovered ? '#ffffff' : '#444444'}
        emissive={isHovered ? '#ffffff' : '#000000'}
        emissiveIntensity={isHovered ? 0.5 : 0}
        toneMapped={false}
        roughness={0.4}
        metalness={0.1}
      />
    </mesh>
  )
}

function Anchors() {
  return (
    <>
      {homeAnchors.map((anchor) => (
        <AnchorObject key={anchor.id} anchor={anchor} />
      ))}
    </>
  )
}

/* ===================== GROUND ===================== */

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.5, 0]}>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#050a1f" roughness={0.9} metalness={0.0} />
    </mesh>
  )
}

/* ===================== ENVIRONMENT ===================== */

function Environment() {
  const starLayer1 = useRef<THREE.Group>(null!)
  const starLayer2 = useRef<THREE.Group>(null!)

  useFrame(() => {
    if (!starLayer1.current || !starLayer2.current) return
    starLayer1.current.rotation.y += 0.0001
    starLayer2.current.rotation.y += 0.0003
  })

  return (
    <>
      <fog attach="fog" args={['#050a1f', 6, 18]} />
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 3, 0]} intensity={2.5} color="#c2187a" />

      <group ref={starLayer1}>
        <Stars
          radius={50}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
      </group>
      <group ref={starLayer2}>
        <Stars
          radius={100}
          depth={50}
          count={8000}
          factor={5}
          saturation={0}
          fade
          speed={0.8}
        />
      </group>
    </>
  )
}

/* ===================== HOME SCENE ===================== */

export default function HomeScene() {
  const { camera } = useThree()

  // Initial camera setup
  camera.position.set(0, 1.4, 4.5)
  camera.lookAt(0, 1.1, 0)
  camera.fov = 45
  camera.updateProjectionMatrix()

  return (
    <>
      <Environment />
      <Ground />
      <Orb />
      <Anchors />
      <CameraRig />
    </>
  )
}
