'use client'

import { Html } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { STATE_LABEL, type GroundDestination } from './GroundWorldModel'

export function Corridor({ destination }: { destination: GroundDestination }) {
  const x = destination.position[0] * 0.5
  const z = destination.position[2] * 0.5
  const length = Math.hypot(destination.position[0], destination.position[2])
  const angle = Math.atan2(destination.position[0], destination.position[2])

  return (
    <group position={[x, -0.015, z]} rotation={[0, angle, 0]}>
      <mesh receiveShadow>
        <boxGeometry args={[1.55, 0.08, length]} />
        <meshPhysicalMaterial color="#111d27" roughness={0.36} metalness={0.5} clearcoat={0.32} />
      </mesh>
      <mesh position={[-0.55, 0.055, 0]}>
        <boxGeometry args={[0.035, 0.018, length * 0.92]} />
        <meshBasicMaterial color={destination.color} transparent opacity={destination.availability === 'offline' ? 0.1 : 0.38} toneMapped={false} />
      </mesh>
      <mesh position={[0.55, 0.055, 0]}>
        <boxGeometry args={[0.035, 0.018, length * 0.92]} />
        <meshBasicMaterial color={destination.color} transparent opacity={destination.availability === 'offline' ? 0.1 : 0.38} toneMapped={false} />
      </mesh>
    </group>
  )
}

function ArchitecturalCrown({ variant, color }: { variant: number; color: THREE.Color }) {
  if (variant % 4 === 0) {
    return (
      <group position={[0, 3.45, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.75, 0.055, 12, 72]} /><meshBasicMaterial color={color} transparent opacity={0.82} toneMapped={false} /></mesh>
        <mesh position={[0, 0.72, 0]}><coneGeometry args={[0.52, 1.3, 5]} /><meshPhysicalMaterial color="#142635" emissive={color} emissiveIntensity={0.18} roughness={0.3} metalness={0.65} clearcoat={0.55} /></mesh>
      </group>
    )
  }
  if (variant % 4 === 1) {
    return (
      <group position={[0, 3.32, 0]}>
        <mesh><sphereGeometry args={[0.72, 32, 20, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#132532" emissive={color} emissiveIntensity={0.22} roughness={0.22} metalness={0.52} clearcoat={0.75} transparent opacity={0.9} /></mesh>
        <mesh position={[0, 0.7, 0]}><cylinderGeometry args={[0.035, 0.035, 1.15, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      </group>
    )
  }
  if (variant % 4 === 2) {
    return (
      <group position={[0, 3.25, 0]}>
        {[-0.62, 0, 0.62].map((x, index) => (
          <mesh key={x} position={[x, index === 1 ? 0.4 : 0, 0]}><coneGeometry args={[0.22, index === 1 ? 1.6 : 1.05, 4]} /><meshPhysicalMaterial color="#152a38" emissive={color} emissiveIntensity={0.2} roughness={0.3} metalness={0.64} clearcoat={0.5} /></mesh>
        ))}
      </group>
    )
  }
  return (
    <group position={[0, 3.45, 0]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><torusKnotGeometry args={[0.46, 0.07, 96, 12, 2, 3]} /><meshPhysicalMaterial color="#e8fbff" emissive={color} emissiveIntensity={0.7} roughness={0.18} metalness={0.3} transparent opacity={0.8} /></mesh>
    </group>
  )
}

export function DestinationArchitecture({ destination, active, onSelect, variant }: { destination: GroundDestination; active: boolean; onSelect: () => void; variant: number }) {
  const color = useMemo(() => new THREE.Color(destination.color), [destination.color])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect() }
  const width = 3.15 + (variant % 3) * 0.32
  const height = 2.45 + (variant % 2) * 0.38

  return (
    <group position={destination.position} userData={{ groundDestination: destination.id, serviceAvailability: destination.availability }}>
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[2.35, 2.65, 0.28, 8]} />
        <meshPhysicalMaterial color="#0b1721" emissive={color} emissiveIntensity={active ? 0.2 : 0.05} roughness={0.42} metalness={0.56} clearcoat={0.38} />
      </mesh>
      <mesh position={[0, height * 0.5 + 0.3, 0]} castShadow receiveShadow onClick={activate} onPointerEnter={() => { document.body.style.cursor = 'pointer' }} onPointerLeave={() => { document.body.style.cursor = '' }}>
        <boxGeometry args={[width, height, 1.45]} />
        <meshPhysicalMaterial color="#10222f" emissive={color} emissiveIntensity={active ? 0.38 : 0.1} roughness={0.28} metalness={0.62} clearcoat={0.62} />
      </mesh>
      {[-1, 1].map((side) => (
        <group key={side} position={[side * (width * 0.39), height * 0.5 + 0.3, 0.86]}>
          <mesh castShadow><cylinderGeometry args={[0.105, 0.13, height * 0.88, 16]} /><meshPhysicalMaterial color="#213644" emissive={color} emissiveIntensity={0.2} roughness={0.24} metalness={0.68} /></mesh>
          <mesh position={[0, height * 0.42, 0]}><sphereGeometry args={[0.15, 18, 18]} /><meshBasicMaterial color={color} transparent opacity={active ? 0.95 : 0.52} toneMapped={false} /></mesh>
        </group>
      ))}
      <mesh position={[0, height * 0.48 + 0.22, 0.78]} castShadow onClick={activate}>
        <boxGeometry args={[width * 0.54, height * 0.74, 0.14]} />
        <meshPhysicalMaterial color="#02070d" emissive={color} emissiveIntensity={active ? 1.1 : 0.42} roughness={0.14} metalness={0.75} clearcoat={0.85} />
      </mesh>
      <mesh position={[0, height * 0.55 + 0.25, 0.86]}>
        <planeGeometry args={[width * 0.34, height * 0.46]} />
        <meshBasicMaterial color={color} transparent opacity={active ? 0.14 : 0.055} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <ArchitecturalCrown variant={variant} color={color} />
      <pointLight position={[0, 2.15, 2.1]} color={color} intensity={active ? 9 : 4.2} distance={10} decay={2} />
      {active && (
        <Html position={[0, 4.75, 0]} center distanceFactor={12}>
          <div className="ground-active-label">
            <strong>{destination.label}</strong>
            <span>{destination.detail}</span>
            <em>{STATE_LABEL[destination.workforceState]} · {destination.availability}</em>
          </div>
        </Html>
      )}
    </group>
  )
}
