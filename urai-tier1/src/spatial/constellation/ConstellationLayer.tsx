'use client'

import { useMemo, useRef } from 'react'
import { useConstellationManifests } from './useConstellationManifests'
import * as THREE from 'three'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { SpatialAssetManifest } from '../assets/manifestTypes'
import ManifestRenderer from '../assets/ManifestRenderer'

export type ConstellationNodePosition = readonly [number, number, number]
type ClusterKey = 'memory' | 'intense' | 'visual' | 'spatial' | 'motion' | 'general'

const clusterOffsets: Record<ClusterKey, ConstellationNodePosition> = {
  memory: [-4.2, 1.55, -2.4],
  intense: [3.8, 2.05, -2.8],
  visual: [-2.5, 1.2, 2.6],
  spatial: [3.2, 1.35, 2.2],
  motion: [0.4, 2.4, -4.0],
  general: [0, 1.45, 0],
}

function clusterForManifest(manifest: SpatialAssetManifest): ClusterKey {
  const text = `${manifest.promptPreview || ''} ${manifest.assetType} ${manifest.spatialCompatibility?.type || ''}`.toLowerCase()

  if (text.includes('dream') || text.includes('memory') || text.includes('grief') || text.includes('soft')) return 'memory'
  if (text.includes('storm') || text.includes('battle') || text.includes('fire') || text.includes('launch')) return 'intense'
  if (text.includes('video') || text.includes('motion') || text.includes('animation')) return 'motion'
  if (text.includes('model') || text.includes('3d') || text.includes('spatial') || text.includes('glb')) return 'spatial'
  if (text.includes('image') || text.includes('portrait') || text.includes('visual')) return 'visual'

  return 'general'
}

function nodePosition(clusterKey: ClusterKey, indexInCluster: number, clusterSize: number): ConstellationNodePosition {
  const base = clusterOffsets[clusterKey]
  const safeSize = Math.max(clusterSize, 1)
  const angle = (indexInCluster / safeSize) * Math.PI * 2
  const radius = 0.75 + Math.min(safeSize, 12) * 0.055 + Math.sin(indexInCluster + safeSize) * 0.12

  return [
    base[0] + Math.cos(angle) * radius,
    base[1] + Math.sin(indexInCluster * 0.47) * 0.34,
    base[2] - Math.sin(angle) * radius,
  ] as const
}

function ConstellationLinks({
  nodes,
  selectedManifestId,
}: {
  nodes: Array<{ manifest: SpatialAssetManifest; clusterKey: ClusterKey; position: ConstellationNodePosition }>
  selectedManifestId: string | null
}) {
  const ref = useRef<THREE.LineSegments>(null)

  const geometry = useMemo(() => {
    const positions: number[] = []
    const byCluster = new Map<ClusterKey, Array<{ position: ConstellationNodePosition }>>()

    nodes.forEach((node) => {
      const list = byCluster.get(node.clusterKey) ?? []
      list.push(node)
      byCluster.set(node.clusterKey, list)
    })

    byCluster.forEach((clusterNodes, key) => {
      const hub = clusterOffsets[key]
      clusterNodes.forEach((node, index) => {
        const next = clusterNodes[(index + 1) % clusterNodes.length]
        positions.push(...node.position, ...hub)
        if (clusterNodes.length > 2 && next) positions.push(...node.position, ...next.position)
      })
    })

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [nodes])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.06) * 0.012
    const material = ref.current.material
    if (material instanceof THREE.LineBasicMaterial) {
      material.opacity = selectedManifestId ? 0.14 : 0.28 + Math.sin(clock.elapsedTime * 0.75) * 0.04
    }
  })

  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#8fdcff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  )
}

function Node({ position, selected, dimmed, onSelect }: { position: ConstellationNodePosition; selected: boolean; dimmed: boolean; onSelect: (position: ConstellationNodePosition) => void }) {
  const ref = useRef<Mesh>(null)
  const opacity = dimmed ? 0.18 : 1
  const baseScale = dimmed ? 0.72 : 1

  useFrame(({ clock }) => {
    if (!ref.current || dimmed) return
    ref.current.rotation.y = clock.elapsedTime * 0.2
    const scale = selected ? 1.8 + Math.sin(clock.elapsedTime * 3) * 0.08 : baseScale + Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.05
    ref.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={ref} position={position} scale={baseScale} onClick={(event) => { event.stopPropagation(); onSelect(position) }}>
      <sphereGeometry args={[0.12, 16, 16]} />
      <meshStandardMaterial
        emissive={selected ? '#22d3ee' : '#8b5cf6'}
        emissiveIntensity={selected ? 2.2 : dimmed ? 0.35 : 1.2}
        color="#1f1b2e"
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

export default function ConstellationLayer({ enabled, selectedManifestId, onSelect }: { enabled: boolean; selectedManifestId: string | null; onSelect: (manifest: SpatialAssetManifest, position: ConstellationNodePosition) => void }) {
  const manifests = useConstellationManifests(enabled)
  const selected = manifests.find((manifest) => manifest.manifestId === selectedManifestId) ?? null

  const positionedManifests = useMemo(() => {
    const clusterCounts = new Map<ClusterKey, number>()
    const clusterIndexes = new Map<ClusterKey, number>()

    manifests.forEach((manifest) => {
      const key = clusterForManifest(manifest)
      clusterCounts.set(key, (clusterCounts.get(key) || 0) + 1)
    })

    return manifests.map((manifest) => {
      const key = clusterForManifest(manifest)
      const indexInCluster = clusterIndexes.get(key) || 0
      clusterIndexes.set(key, indexInCluster + 1)

      return {
        manifest,
        clusterKey: key,
        position: nodePosition(key, indexInCluster, clusterCounts.get(key) || 1),
      }
    })
  }, [manifests])

  if (!enabled) return null

  return (
    <group>
      <ConstellationLinks nodes={positionedManifests} selectedManifestId={selectedManifestId} />

      {positionedManifests.map(({ manifest, position }) => (
        <Node
          key={manifest.manifestId}
          position={position}
          selected={manifest.manifestId === selectedManifestId}
          dimmed={Boolean(selectedManifestId) && manifest.manifestId !== selectedManifestId}
          onSelect={(nodePosition) => onSelect(manifest, nodePosition)}
        />
      ))}

      {selected ? <ManifestRenderer manifest={selected} /> : null}
    </group>
  )
}
