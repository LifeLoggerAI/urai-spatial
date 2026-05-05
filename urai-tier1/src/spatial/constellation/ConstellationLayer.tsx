'use client'

import { useMemo, useRef } from 'react'
import { useConstellationManifests } from './useConstellationManifests'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { SpatialAssetManifest } from '../assets/manifestTypes'
import ManifestRenderer from '../assets/ManifestRenderer'

function nodePosition(index: number) {
  const angle = (index / 24) * Math.PI * 2
  const radius = 3.5 + Math.sin(index) * 0.6
  return [Math.cos(angle) * radius, 1.2 + Math.sin(index * 0.5) * 0.6, -Math.sin(angle) * radius] as const
}

function Node({ index, selected, onSelect }: { index: number; selected: boolean; onSelect: () => void }) {
  const ref = useRef<Mesh>(null)
  const position = useMemo(() => nodePosition(index), [index])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = clock.elapsedTime * 0.2
    const scale = selected ? 1.8 + Math.sin(clock.elapsedTime * 3) * 0.08 : 1
    ref.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={ref} position={position} onClick={(event) => { event.stopPropagation(); onSelect() }}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial emissive={selected ? '#22d3ee' : '#8b5cf6'} emissiveIntensity={selected ? 2.2 : 1.2} color="#1f1b2e" />
    </mesh>
  )
}

export default function ConstellationLayer({ enabled, selectedManifestId, onSelect }: { enabled: boolean; selectedManifestId: string | null; onSelect: (manifest: SpatialAssetManifest) => void }) {
  const manifests = useConstellationManifests(enabled)
  const selected = manifests.find((manifest) => manifest.manifestId === selectedManifestId) ?? null

  if (!enabled) return null

  return (
    <group>
      {manifests.map((manifest, i) => (
        <Node
          key={manifest.manifestId}
          index={i}
          selected={manifest.manifestId === selectedManifestId}
          onSelect={() => onSelect(manifest)}
        />
      ))}

      {selected ? <ManifestRenderer manifest={selected} /> : null}
    </group>
  )
}
