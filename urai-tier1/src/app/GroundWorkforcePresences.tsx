'use client'

import { Suspense, useEffect } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { avatarAssets, type ImageAsset } from '@/spatial/assets/uraiAssets'

type WorkforceMember = {
  id: string
  label: string
  destinationId: string
  asset: ImageAsset
  offset: readonly [number, number, number]
  category: 'helper' | 'specialist'
}

/** Provider-rendered artwork is source-tracked, but final 3D likeness/artistic
 * admission is not yet granted. These are physical reference presences, not
 * claims that a specialist is executing or an independent reviewer approved it. */
export const GROUND_WORKFORCE: readonly WorkforceMember[] = [
  { id: 'receptionist', label: 'Receptionist', destinationId: 'reception', asset: avatarAssets.receptionist, offset: [0, 0, 1.3], category: 'helper' },
  { id: 'privacySteward', label: 'Privacy Steward', destinationId: 'privacy', asset: avatarAssets.privacySteward, offset: [0, 0, 1.3], category: 'helper' },
  { id: 'scheduleSteward', label: 'Schedule Steward', destinationId: 'logistics', asset: avatarAssets.scheduleSteward, offset: [0, 0, 1.3], category: 'helper' },
  { id: 'wellnessGuide', label: 'Wellness Guide', destinationId: 'wellness', asset: avatarAssets.wellnessGuide, offset: [0, 0, 1.3], category: 'helper' },
  { id: 'archivist', label: 'Archivist', destinationId: 'archive', asset: avatarAssets.archivist, offset: [0, 0, 1.3], category: 'helper' },
  { id: 'relationshipLiaison', label: 'Relationship Liaison', destinationId: 'council', asset: avatarAssets.relationshipLiaison, offset: [-2.7, 0, 1.5], category: 'specialist' },
  { id: 'operator', label: 'Operator', destinationId: 'council', asset: avatarAssets.operator, offset: [-1.62, 0, 1.5], category: 'specialist' },
  { id: 'builder', label: 'Builder', destinationId: 'council', asset: avatarAssets.builder, offset: [-0.54, 0, 1.5], category: 'specialist' },
  { id: 'protector', label: 'Protector', destinationId: 'council', asset: avatarAssets.protector, offset: [0.54, 0, 1.5], category: 'specialist' },
  { id: 'mirror', label: 'Mirror', destinationId: 'council', asset: avatarAssets.mirror, offset: [1.62, 0, 1.5], category: 'specialist' },
  { id: 'guide', label: 'Guide', destinationId: 'council', asset: avatarAssets.guide, offset: [2.7, 0, 1.5], category: 'specialist' },
]

function WorldPortrait({ member, position }: { member: WorkforceMember; position: [number, number, number] }) {
  // Only this specific reference portrait may suspend. Never hide the Ground
  // GLB, camera, collision surface, or accessible directory on image failure.
  const texture = useTexture(member.asset.src)
  useEffect(() => { texture.colorSpace = THREE.SRGBColorSpace; texture.needsUpdate = true }, [texture])
  return (
    <group
      name={`ground-workforce-${member.id}`}
      position={position}
      userData={{
        uraiWorkforceRole: member.id,
        uraiWorkforceCategory: member.category,
        uraiEnterableThreshold: `ground-enterable-threshold-${member.destinationId}`,
        visualStatus: 'provider-reference-pending-acceptance',
      }}
    >
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.86, 1.42, 0.09]} />
        <meshStandardMaterial color="#344e54" roughness={0.68} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.7, 0.051]}>
        <planeGeometry args={[0.79, 1.35]} />
        <meshBasicMaterial map={texture} transparent alphaTest={0.02} depthWrite={false} side={THREE.FrontSide} toneMapped={false} />
      </mesh>
      <mesh position={[0, -0.05, 0]} receiveShadow>
        <cylinderGeometry args={[0.47, 0.56, 0.12, 12]} />
        <meshStandardMaterial color="#637d80" roughness={0.86} metalness={0.1} />
      </mesh>
    </group>
  )
}

export function GroundWorkforcePresences({ world }: { world: THREE.Object3D }) {
  return (
    <group name="ground-world-workforce-presences" userData={{ status: 'reference-only', actionAuthority: 'none' }}>
      {GROUND_WORKFORCE.map(member => {
        const anchor = world.getObjectByName(`ground-destination-${member.destinationId}`)
        if (!anchor) return null // Existing Ground architectural validation owns this failure.
        const position: [number, number, number] = [
          anchor.position.x + member.offset[0],
          anchor.position.y + member.offset[1],
          anchor.position.z + member.offset[2],
        ]
        return (
          <Suspense key={member.id} fallback={null}>
            <WorldPortrait member={member} position={position} />
          </Suspense>
        )
      })}
    </group>
  )
}
