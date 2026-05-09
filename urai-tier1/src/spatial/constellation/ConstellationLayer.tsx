'use client'

import { useMemo, useRef, useState } from 'react'
import { Html } from '@react-three/drei'
import { useConstellationManifests } from './useConstellationManifests'
import * as THREE from 'three'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { SpatialAssetManifest, memoryPrivacyState, memoryReplayReady, memorySourceType, memorySystemLabel, memoryTitle } from '../assets/manifestTypes'
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

const memoryGlyphs: Record<string, string> = {
  voice: '◌',
  ritual: '✦',
  person: '◇',
  place: '⌖',
  dream: '☾',
  milestone: '◆',
  recovery: '↺',
  mirror: '◈',
  shadow: '▾',
  memory: '•',
}

function clusterForManifest(manifest: SpatialAssetManifest): ClusterKey {
  const text = `${manifest.promptPreview || ''} ${manifest.assetType} ${manifest.spatialCompatibility?.type || ''} ${manifest.memoryKind || ''} ${manifest.emotionalWeather || ''}`.toLowerCase()

  if (text.includes('dream') || text.includes('memory') || text.includes('grief') || text.includes('soft')) return 'memory'
  if (text.includes('storm') || text.includes('battle') || text.includes('fire') || text.includes('launch') || text.includes('threshold') || text.includes('shadow')) return 'intense'
  if (text.includes('video') || text.includes('motion') || text.includes('animation') || text.includes('recovery')) return 'motion'
  if (text.includes('model') || text.includes('3d') || text.includes('spatial') || text.includes('glb') || text.includes('mirror')) return 'spatial'
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

  const averageStrength = useMemo(() => {
    if (!nodes.length) return 0.5
    const total = nodes.reduce((sum, node) => sum + (node.manifest.relationshipArcStrength ?? 0.5), 0)
    return total / nodes.length
  }, [nodes])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.06) * 0.012
    const material = ref.current.material
    if (material instanceof THREE.LineBasicMaterial) {
      material.opacity = selectedManifestId ? 0.14 : 0.22 + averageStrength * 0.18 + Math.sin(clock.elapsedTime * 0.75) * 0.04
      material.linewidth = 1 + averageStrength * 2
    }
  })

  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#8fdcff" transparent opacity={0.28} depthWrite={false} blending={THREE.AdditiveBlending} />
    </lineSegments>
  )
}

function Node({
  manifest,
  position,
  selected,
  dimmed,
  onSelect,
}: {
  manifest: SpatialAssetManifest
  position: ConstellationNodePosition
  selected: boolean
  dimmed: boolean
  onSelect: (position: ConstellationNodePosition) => void
}) {
  const ref = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const importance = Math.max(0.2, Math.min(1, manifest.importanceScore ?? 0.5))
  const opacity = dimmed ? 0.2 : 0.78 + importance * 0.22
  const baseScale = dimmed ? 0.72 : 0.9 + importance * 0.5
  const glyph = memoryGlyphs[manifest.memoryKind || 'memory'] || memoryGlyphs.memory
  const ariaLabel = `${memoryTitle(manifest)}. ${memorySystemLabel(manifest)}. ${manifest.emotionalTone || 'unlabeled emotional tone'}. ${memoryReplayReady(manifest) ? 'Replay ready.' : 'Replay not ready.'}`

  useFrame(({ clock }) => {
    if (!ref.current || dimmed) return
    ref.current.rotation.y = clock.elapsedTime * 0.2
    const selectedPulse = selected || hovered ? 1.52 + Math.sin(clock.elapsedTime * 3) * 0.08 : baseScale + Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.05
    ref.current.scale.setScalar(selectedPulse)
  })

  return (
    <group position={position}>
      <mesh
        ref={ref}
        scale={baseScale}
        onClick={(event) => {
          event.stopPropagation()
          onSelect(position)
        }}
        onPointerOver={(event) => {
          event.stopPropagation()
          setHovered(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          document.body.style.cursor = ''
        }}
      >
        <sphereGeometry args={[0.12, 20, 20]} />
        <meshStandardMaterial
          emissive={selected ? '#22d3ee' : hovered ? '#f0abfc' : '#8b5cf6'}
          emissiveIntensity={selected ? 2.6 : hovered ? 2.1 : dimmed ? 0.35 : 1.2 + importance}
          color="#1f1b2e"
          transparent
          opacity={opacity}
        />
      </mesh>
      <Html center distanceFactor={8} zIndexRange={[40, 20]}>
        <button
          type="button"
          className={`urai-life-map-node-button${selected ? ' urai-life-map-node-button--selected' : ''}`}
          aria-label={ariaLabel}
          data-testid="urai-life-map-node-button"
          data-manifest-id={manifest.manifestId}
          onClick={(event) => {
            event.stopPropagation()
            onSelect(position)
          }}
          onFocus={() => setHovered(true)}
          onBlur={() => setHovered(false)}
        >
          <span aria-hidden="true">{glyph}</span>
        </button>
        {hovered || selected ? (
          <aside className="urai-life-map-node-preview" data-testid="urai-life-map-node-preview">
            <strong>{memoryTitle(manifest)}</strong>
            <span>{memorySystemLabel(manifest)}</span>
            <small>{manifest.season || 'Unsorted season'} · {manifest.emotionalTone || 'signal pending'}</small>
            <small>{memoryPrivacyState(manifest)} · {memorySourceType(manifest)} · {memoryReplayReady(manifest) ? 'Replay ready' : 'Replay pending'}</small>
          </aside>
        ) : null}
      </Html>
    </group>
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
    <group data-testid="urai-constellation-layer">
      <ConstellationLinks nodes={positionedManifests} selectedManifestId={selectedManifestId} />

      {positionedManifests.map(({ manifest, position }) => (
        <Node
          key={manifest.manifestId}
          manifest={manifest}
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
