'use client'

import { DESTINATIONS, type GroundDestination } from './GroundWorldModel'

const FLOOR_BAYS = Array.from({ length: 28 }, (_, index) => 8 - index * 1.45)
const RIB_BAYS = Array.from({ length: 13 }, (_, index) => 7.5 - index * 3.15)

function ChamberIdentity({ destination }: { destination: GroundDestination }) {
  const color = destination.color
  const form = destination.chamberForm

  if (form === 'pavilion') return <>
    <mesh position={[0, 3.45, .05]}><boxGeometry args={[3.7, .18, 1.45]} /><meshStandardMaterial color="#173448" emissive={color} emissiveIntensity={.1} roughness={.34} metalness={.42} /></mesh>
    {[-1.55, 1.55].map((x) => <mesh key={x} position={[x, 1.75, .08]}><cylinderGeometry args={[.1, .14, 3.45, 20]} /><meshStandardMaterial color="#1b4052" roughness={.4} metalness={.36} /></mesh>)}
  </>

  if (form === 'sanctuary') return <>
    <mesh position={[0, 1.72, .16]}><torusGeometry args={[1.32, .12, 18, 80, Math.PI]} /><meshStandardMaterial color="#1a3148" emissive={color} emissiveIntensity={.18} roughness={.3} metalness={.38} /></mesh>
    <mesh position={[0, .42, .1]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.72, 1.12, 72]} /><meshBasicMaterial color={color} transparent opacity={.22} depthWrite={false} /></mesh>
  </>

  if (form === 'council') return <>
    <mesh position={[0, 1.85, .12]}><ringGeometry args={[1.02, 1.17, 12]} /><meshStandardMaterial color="#243441" emissive={color} emissiveIntensity={.16} roughness={.42} metalness={.28} /></mesh>
    {[-1.42, -1.05, 1.05, 1.42].map((x) => <mesh key={x} position={[x, 1.45, .02]}><boxGeometry args={[.14, 2.9, .28]} /><meshStandardMaterial color="#203745" roughness={.5} metalness={.22} /></mesh>)}
  </>

  if (form === 'transit') return <>
    {[-.82, -.28, .28, .82].map((x) => <mesh key={x} position={[x, .08, .5]}><boxGeometry args={[.075, .06, 3.1]} /><meshBasicMaterial color={color} transparent opacity={.38} /></mesh>)}
    <mesh position={[0, 3.3, .05]}><boxGeometry args={[3.5, .16, .5]} /><meshStandardMaterial color="#1c3345" emissive={color} emissiveIntensity={.14} metalness={.45} roughness={.3} /></mesh>
  </>

  if (form === 'restorative') return <>
    <mesh position={[0, .05, .65]} rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.35, 72]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={.25} transparent opacity={.32} roughness={.08} transmission={.5} depthWrite={false} /></mesh>
    <mesh position={[0, 2.15, -.06]}><sphereGeometry args={[.72, 40, 24]} /><meshPhysicalMaterial color="#0b2630" emissive={color} emissiveIntensity={.28} transparent opacity={.72} roughness={.2} transmission={.18} /></mesh>
  </>

  if (form === 'archive') return <>
    {[-1.12, -.56, 0, .56, 1.12].map((x, index) => <mesh key={x} position={[x, 1.45 + (index % 2) * .16, -.02]}><boxGeometry args={[.34, 2.85, .55]} /><meshStandardMaterial color="#152b3c" emissive={color} emissiveIntensity={.06 + index * .015} roughness={.62} metalness={.16} /></mesh>)}
  </>

  if (form === 'reflection') return <>
    <mesh position={[0, 1.78, .04]} rotation={[0, Math.PI / 4, 0]}><octahedronGeometry args={[1.35, 0]} /><meshPhysicalMaterial color="#182333" emissive={color} emissiveIntensity={.25} metalness={.65} roughness={.08} transparent opacity={.82} /></mesh>
    <pointLight position={[0, 1.8, 1.4]} color={color} intensity={2.2} distance={5.5} decay={2} />
  </>

  if (form === 'vault') return <>
    <mesh position={[0, 1.65, .03]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[1.28, 1.28, .34, 48]} /><meshStandardMaterial color="#172938" emissive={color} emissiveIntensity={.13} roughness={.32} metalness={.66} /></mesh>
    <mesh position={[0, 1.65, .23]}><torusGeometry args={[.64, .07, 16, 64]} /><meshBasicMaterial color={color} transparent opacity={.48} /></mesh>
  </>

  if (form === 'observatory') return <>
    <mesh position={[0, 2.25, -.02]} rotation={[0, 0, Math.PI]}><sphereGeometry args={[1.5, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#0d2130" emissive={color} emissiveIntensity={.16} transparent opacity={.78} roughness={.22} transmission={.12} /></mesh>
    <mesh position={[0, .42, .2]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.68, 1.18, 64]} /><meshBasicMaterial color={color} transparent opacity={.25} /></mesh>
  </>

  if (form === 'aperture') return <>
    <mesh position={[0, 1.72, .08]}><torusGeometry args={[1.2, .16, 22, 96]} /><meshStandardMaterial color="#172b3d" emissive={color} emissiveIntensity={.32} roughness={.26} metalness={.42} /></mesh>
    <mesh position={[0, 1.72, .02]}><circleGeometry args={[1.02, 72]} /><meshBasicMaterial color={color} transparent opacity={.08} depthWrite={false} /></mesh>
  </>

  return <>
    <mesh position={[0, 2.95, .1]}><boxGeometry args={[3.55, .42, .72]} /><meshStandardMaterial color="#222837" emissive={color} emissiveIntensity={.18} roughness={.34} metalness={.38} /></mesh>
    {[-1.12, -.55, 0, .55, 1.12].map((x) => <mesh key={x} position={[x, 1.62, .16]}><boxGeometry args={[.09, 2.25, .18]} /><meshBasicMaterial color={color} transparent opacity={.28} /></mesh>)}
  </>
}

function PortalBay({ destination }: { destination: GroundDestination }) {
  const [x, , z] = destination.position
  const color = destination.color
  return (
    <group position={[x, 0, z - .35]} name={`ground-chamber-facade-${destination.id}`} userData={{ chamberForm: destination.chamberForm }}>
      <mesh position={[0, 1.82, -.5]} receiveShadow>
        <boxGeometry args={[4.15, 3.8, .42]} />
        <meshStandardMaterial color="#071321" roughness={.72} metalness={.1} />
      </mesh>
      <mesh position={[-1.7, 1.7, 0]} castShadow receiveShadow><boxGeometry args={[.34, 3.5, .72]} /><meshStandardMaterial color="#10283a" roughness={.52} metalness={.24} /></mesh>
      <mesh position={[1.7, 1.7, 0]} castShadow receiveShadow><boxGeometry args={[.34, 3.5, .72]} /><meshStandardMaterial color="#10283a" roughness={.52} metalness={.24} /></mesh>
      <mesh position={[0, 3.38, 0]} castShadow><boxGeometry args={[3.72, .28, .72]} /><meshStandardMaterial color="#10283a" roughness={.5} metalness={.28} /></mesh>
      <mesh position={[0, .02, .72]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><boxGeometry args={[3.9, 2.8, .12]} /><meshStandardMaterial color="#0b1f2c" emissive={color} emissiveIntensity={.045} roughness={.48} metalness={.26} /></mesh>
      <mesh position={[0, 1.68, .13]}><planeGeometry args={[2.7, 2.9]} /><meshBasicMaterial color={color} transparent opacity={destination.workforceState === 'blocked' ? .025 : .075} depthWrite={false} /></mesh>
      <ChamberIdentity destination={destination} />
      <pointLight position={[0, 2.05, 1.35]} color={color} intensity={destination.availability === 'offline' ? .25 : 1.5} distance={7} decay={2} />
    </group>
  )
}

export default function GroundContinuityArchitecture() {
  return (
    <group name="ground-continuity-architectural-shell" data-testid="urai-ground-continuity-shell" data-ground-visual-owner="shared-continuity-architecture">
      <fog attach="fog" args={['#020812', 12, 62]} />

      <mesh position={[0, -.22, -12]} receiveShadow><boxGeometry args={[28, .34, 44]} /><meshStandardMaterial color="#06111d" roughness={.8} metalness={.1} /></mesh>
      <mesh position={[0, -.02, -12]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[9.2, 43]} /><meshStandardMaterial color="#0b2231" roughness={.62} metalness={.2} /></mesh>
      <mesh position={[0, 5.28, -12]}><boxGeometry args={[27, .28, 44]} /><meshStandardMaterial color="#030a13" roughness={.78} metalness={.12} /></mesh>

      {FLOOR_BAYS.map((z, index) => <mesh key={`floor-bay-${z}`} position={[0, .012, z]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[8.8, .035]} /><meshBasicMaterial color={index % 4 === 0 ? '#9d78ff' : '#5adfff'} transparent opacity={index % 4 === 0 ? .14 : .065} depthWrite={false} /></mesh>)}

      <mesh position={[-13.5, 2.7, -12]} receiveShadow><boxGeometry args={[.75, 5.6, 44]} /><meshStandardMaterial color="#050d18" roughness={.86} metalness={.08} /></mesh>
      <mesh position={[13.5, 2.7, -12]} receiveShadow><boxGeometry args={[.75, 5.6, 44]} /><meshStandardMaterial color="#050d18" roughness={.86} metalness={.08} /></mesh>

      {RIB_BAYS.map((z, index) => <group key={`rib-${z}`} position={[0, 0, z]}>
        <mesh position={[-9.4, 2.5, 0]} castShadow><boxGeometry args={[.24, 5, .34]} /><meshStandardMaterial color="#102536" roughness={.5} metalness={.28} /></mesh>
        <mesh position={[9.4, 2.5, 0]} castShadow><boxGeometry args={[.24, 5, .34]} /><meshStandardMaterial color="#102536" roughness={.5} metalness={.28} /></mesh>
        <mesh position={[0, 5.02, 0]} castShadow><boxGeometry args={[18.9, .22, .34]} /><meshStandardMaterial color="#102536" roughness={.5} metalness={.28} /></mesh>
        <pointLight position={[0, 4.55, .6]} color={index % 3 === 0 ? '#9d78ff' : '#5adfff'} intensity={.42} distance={9} decay={2} />
      </group>)}

      {DESTINATIONS.map((destination) => <PortalBay key={`architecture-${destination.id}`} destination={destination} />)}

      <mesh position={[-11.8, 1.6, 4.8]} rotation={[0, .34, 0]} castShadow><boxGeometry args={[3.2, 3.4, 1.4]} /><meshStandardMaterial color="#030914" roughness={.9} /></mesh>
      <mesh position={[11.8, 1.6, 3.6]} rotation={[0, -.3, 0]} castShadow><boxGeometry args={[3.4, 3.4, 1.5]} /><meshStandardMaterial color="#030914" roughness={.9} /></mesh>

      <hemisphereLight args={['#8ddcff', '#02050b', .44]} />
      <directionalLight position={[4, 8, 6]} color="#dff8ff" intensity={.75} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
    </group>
  )
}
