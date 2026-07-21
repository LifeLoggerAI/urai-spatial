'use client'

import { DESTINATIONS } from './GroundWorldModel'

const FLOOR_BAYS = Array.from({ length: 28 }, (_, index) => 8 - index * 1.45)
const RIB_BAYS = Array.from({ length: 13 }, (_, index) => 7.5 - index * 3.15)

function PortalBay({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 1.8, -0.32]}>
        <boxGeometry args={[3.1, 3.6, 0.22]} />
        <meshStandardMaterial color="#071321" roughness={0.74} metalness={0.08} />
      </mesh>
      <mesh position={[-1.33, 1.65, 0]}>
        <boxGeometry args={[0.22, 3.3, 0.44]} />
        <meshStandardMaterial color="#10283a" roughness={0.58} metalness={0.18} />
      </mesh>
      <mesh position={[1.33, 1.65, 0]}>
        <boxGeometry args={[0.22, 3.3, 0.44]} />
        <meshStandardMaterial color="#10283a" roughness={0.58} metalness={0.18} />
      </mesh>
      <mesh position={[0, 3.22, 0]}>
        <boxGeometry args={[2.88, 0.22, 0.44]} />
        <meshStandardMaterial color="#10283a" roughness={0.58} metalness={0.18} />
      </mesh>
      <mesh position={[0, 1.66, 0.13]}>
        <planeGeometry args={[2.4, 2.75]} />
        <meshBasicMaterial color={color} transparent opacity={0.055} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 2.05, 1.1]} color={color} intensity={1.25} distance={6.5} decay={2} />
    </group>
  )
}

export default function GroundContinuityArchitecture() {
  return (
    <group name="ground-continuity-architectural-shell" data-testid="urai-ground-continuity-shell">
      <fog attach="fog" args={['#020812', 10, 58]} />

      <mesh position={[0, -0.22, -12]} receiveShadow>
        <boxGeometry args={[28, 0.34, 44]} />
        <meshStandardMaterial color="#06111d" roughness={0.82} metalness={0.08} />
      </mesh>
      <mesh position={[0, -0.02, -12]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[9.2, 43]} />
        <meshStandardMaterial color="#0b2231" roughness={0.66} metalness={0.16} />
      </mesh>

      {FLOOR_BAYS.map((z, index) => (
        <mesh key={`floor-bay-${z}`} position={[0, 0.012, z]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[8.8, 0.035]} />
          <meshBasicMaterial color={index % 4 === 0 ? '#9d78ff' : '#5adfff'} transparent opacity={index % 4 === 0 ? 0.17 : 0.09} depthWrite={false} />
        </mesh>
      ))}

      <mesh position={[-13.5, 2.7, -12]}>
        <boxGeometry args={[0.75, 5.6, 44]} />
        <meshStandardMaterial color="#050d18" roughness={0.88} metalness={0.05} />
      </mesh>
      <mesh position={[13.5, 2.7, -12]}>
        <boxGeometry args={[0.75, 5.6, 44]} />
        <meshStandardMaterial color="#050d18" roughness={0.88} metalness={0.05} />
      </mesh>

      {RIB_BAYS.map((z, index) => (
        <group key={`rib-${z}`} position={[0, 0, z]}>
          <mesh position={[-9.4, 2.5, 0]}>
            <boxGeometry args={[0.24, 5, 0.34]} />
            <meshStandardMaterial color="#102536" roughness={0.56} metalness={0.22} />
          </mesh>
          <mesh position={[9.4, 2.5, 0]}>
            <boxGeometry args={[0.24, 5, 0.34]} />
            <meshStandardMaterial color="#102536" roughness={0.56} metalness={0.22} />
          </mesh>
          <mesh position={[0, 5.02, 0]}>
            <boxGeometry args={[18.9, 0.22, 0.34]} />
            <meshStandardMaterial color="#102536" roughness={0.56} metalness={0.22} />
          </mesh>
          <pointLight position={[0, 4.55, 0.6]} color={index % 3 === 0 ? '#9d78ff' : '#5adfff'} intensity={0.48} distance={9} decay={2} />
        </group>
      ))}

      {DESTINATIONS.map((destination) => (
        <PortalBay key={`architecture-${destination.id}`} x={destination.position[0]} z={destination.position[2] - 0.35} color={destination.color} />
      ))}

      <mesh position={[-11.8, 1.6, 4.8]} rotation={[0, 0.34, 0]}>
        <boxGeometry args={[3.2, 3.4, 1.4]} />
        <meshStandardMaterial color="#030914" roughness={0.92} />
      </mesh>
      <mesh position={[11.8, 1.6, 3.6]} rotation={[0, -0.3, 0]}>
        <boxGeometry args={[3.4, 3.4, 1.5]} />
        <meshStandardMaterial color="#030914" roughness={0.92} />
      </mesh>

      <hemisphereLight args={['#8ddcff', '#02050b', 0.48]} />
      <directionalLight position={[4, 8, 6]} color="#dff8ff" intensity={0.72} />
    </group>
  )
}
