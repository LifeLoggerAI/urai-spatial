'use client'

import { useMemo } from 'react'
import * as THREE from 'three'

function Landscape() {
  const trees = useMemo(() => [
    [-11.5, -6.8, 0.9], [11.5, -7.2, 1.1], [-12.2, -16, 1.25], [12.3, -15.7, 1],
    [-9.8, -27.5, 1.2], [10.3, -28, 1.35], [-4.8, -29.6, 0.95], [5.2, -30.2, 1.1],
  ] as const, [])
  return (
    <group name="ground-landscape">
      {trees.map(([x, z, scale], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]} scale={scale}>
          <mesh position={[0, 0.8, 0]} castShadow><cylinderGeometry args={[0.1, 0.18, 1.6, 10]} /><meshStandardMaterial color="#102126" roughness={0.8} /></mesh>
          <mesh position={[0, 2.1, 0]} castShadow><coneGeometry args={[0.85, 2.5, 7]} /><meshStandardMaterial color={index % 2 ? '#123b3d' : '#162f39'} emissive={index % 2 ? '#0b3534' : '#102839'} emissiveIntensity={0.14} roughness={0.72} /></mesh>
          <mesh position={[0, 1.65, 0]} castShadow><coneGeometry args={[1.1, 2.1, 7]} /><meshStandardMaterial color="#0b242d" roughness={0.78} /></mesh>
        </group>
      ))}
    </group>
  )
}

function CouncilPresence() {
  return (
    <group position={[0, 0.06, -9]}>
      <mesh position={[0, 0.35, 0]} receiveShadow castShadow><cylinderGeometry args={[1.35, 1.55, 0.22, 48]} /><meshPhysicalMaterial color="#15202a" emissive="#facc6b" emissiveIntensity={0.08} roughness={0.3} metalness={0.65} clearcoat={0.5} /></mesh>
      <mesh position={[0, 0.49, 0]}><cylinderGeometry args={[0.82, 1.08, 0.08, 48]} /><meshPhysicalMaterial color="#2d2918" emissive="#facc6b" emissiveIntensity={0.35} roughness={0.18} metalness={0.72} clearcoat={0.8} /></mesh>
      {[0, 1, 2, 3, 4, 5].map((index) => {
        const angle = (index / 6) * Math.PI * 2
        return <mesh key={index} position={[Math.cos(angle) * 1.42, 0.45, Math.sin(angle) * 1.42]}><cylinderGeometry args={[0.18, 0.24, 0.72, 18]} /><meshStandardMaterial color="#172631" emissive="#facc6b" emissiveIntensity={0.12} roughness={0.42} metalness={0.35} /></mesh>
      })}
    </group>
  )
}

export function WorldEnvelope() {
  return (
    <group name="ground-world-envelope">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -12]} receiveShadow>
        <planeGeometry args={[48, 66]} />
        <meshStandardMaterial color="#07131d" emissive="#061522" emissiveIntensity={0.15} roughness={0.84} metalness={0.2} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.035, -10.5]} receiveShadow>
        <circleGeometry args={[10.2, 96]} />
        <meshPhysicalMaterial color="#10232d" emissive="#0c2834" emissiveIntensity={0.13} roughness={0.24} metalness={0.58} clearcoat={0.68} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, -10.5]}>
        <ringGeometry args={[8.7, 9.05, 96]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} toneMapped={false} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, -10.5]}>
        <circleGeometry args={[4.1, 72]} />
        <meshPhysicalMaterial color="#071019" emissive="#132c3b" emissiveIntensity={0.25} roughness={0.08} metalness={0.72} clearcoat={1} transparent opacity={0.88} />
      </mesh>
      {[-14.5, 14.5].map((x) => (
        <mesh key={x} position={[x, 5.8, -15]} receiveShadow castShadow>
          <boxGeometry args={[1.25, 12, 58]} />
          <meshStandardMaterial color="#06111b" emissive="#0e2f42" emissiveIntensity={0.1} roughness={0.62} metalness={0.38} />
        </mesh>
      ))}
      {[[-10.8, -9], [10.8, -9], [-12, -20], [12, -20], [-8, -31], [8, -31]].map(([x, z], index) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 4.4 + (index % 2), 0]} castShadow receiveShadow><cylinderGeometry args={[1.15, 1.6, 8.8 + (index % 2) * 2, 7]} /><meshPhysicalMaterial color="#0a1823" emissive={index % 2 ? '#162f48' : '#0f3442'} emissiveIntensity={0.12} roughness={0.38} metalness={0.56} clearcoat={0.32} /></mesh>
          <mesh position={[0, 9 + (index % 2) * 2, 0]}><coneGeometry args={[1.2, 2.2, 7]} /><meshStandardMaterial color="#10293a" emissive="#1c4c64" emissiveIntensity={0.12} roughness={0.45} metalness={0.48} /></mesh>
        </group>
      ))}
      <mesh position={[0, 7.1, -34]} castShadow receiveShadow>
        <boxGeometry args={[20, 14, 2.4]} />
        <meshPhysicalMaterial color="#06111c" emissive="#153651" emissiveIntensity={0.16} roughness={0.38} metalness={0.58} clearcoat={0.32} />
      </mesh>
      <mesh position={[0, 7.2, -32.7]}><planeGeometry args={[12, 6.5]} /><meshBasicMaterial color="#7dd3fc" transparent opacity={0.055} blending={THREE.AdditiveBlending} toneMapped={false} /></mesh>
      <Landscape />
      <CouncilPresence />
    </group>
  )
}
