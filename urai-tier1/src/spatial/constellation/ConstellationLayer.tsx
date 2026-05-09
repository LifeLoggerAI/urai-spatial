'use client'

import { useMemo, useRef } from 'react'
import { useConstellationManifests } from './useConstellationManifests'
import * as THREE from 'three'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import { SpatialAssetManifest } from '../assets/manifestTypes'
import ManifestRenderer from '../assets/ManifestRenderer'
import type { LifeMapNavigationState } from '../interaction/LifeMapNavigationOverlay'

export type ConstellationNodePosition = readonly [number, number, number]
type ClusterKey = 'memory' | 'intense' | 'visual' | 'spatial' | 'motion' | 'general'

const clusterOffsets: Record<ClusterKey, ConstellationNodePosition> = {
  memory: [-5.2, 1.85, -3.6],
  intense: [4.9, 2.55, -3.9],
  visual: [-3.6, 1.35, 3.6],
  spatial: [4.4, 1.72, 3.2],
  motion: [0.5, 3.0, -5.6],
  general: [0, 1.7, 0],
}

const syntheticLifeArcNodes: Array<{ id: string; clusterKey: ClusterKey; position: ConstellationNodePosition }> = [
  { id: 'arc-root', clusterKey: 'general', position: [-6.6, 0.95, 0.4] },
  { id: 'arc-threshold', clusterKey: 'intense', position: [-3.2, 2.62, -4.7] },
  { id: 'arc-recovery', clusterKey: 'memory', position: [0.8, 1.24, 4.6] },
  { id: 'arc-becoming', clusterKey: 'spatial', position: [4.8, 2.18, -1.2] },
  { id: 'arc-mirror', clusterKey: 'visual', position: [6.4, 1.62, 3.9] },
]

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
  const radius = 0.95 + Math.min(safeSize, 12) * 0.085 + Math.sin(indexInCluster + safeSize) * 0.18

  return [
    base[0] + Math.cos(angle) * radius,
    base[1] + Math.sin(indexInCluster * 0.47) * 0.46,
    base[2] - Math.sin(angle) * radius,
  ] as const
}

function ConstellationLinks({
  nodes,
  selectedManifestId,
}: {
  nodes: Array<{ manifest?: SpatialAssetManifest; id?: string; clusterKey: ClusterKey; position: ConstellationNodePosition }>
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

    syntheticLifeArcNodes.forEach((node, index) => {
      const next = syntheticLifeArcNodes[index + 1]
      if (next) positions.push(...node.position, ...next.position)
    })

    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return g
  }, [nodes])

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.06) * 0.018
    const material = ref.current.material
    if (material instanceof THREE.LineBasicMaterial) {
      material.opacity = selectedManifestId ? 0.18 : 0.36 + Math.sin(clock.elapsedTime * 0.75) * 0.07
    }
  })

  return (
    <lineSegments ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color="#8fdcff" transparent opacity={0.36} depthWrite={false} blending={THREE.AdditiveBlending} />
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
    const scale = selected ? 2.25 + Math.sin(clock.elapsedTime * 3) * 0.12 : baseScale + Math.sin(clock.elapsedTime * 1.4 + position[0]) * 0.08
    ref.current.scale.setScalar(scale)
  })

  return (
    <mesh ref={ref} position={position} scale={baseScale} onClick={(event) => { event.stopPropagation(); onSelect(position) }}>
      <sphereGeometry args={[0.145, 24, 24]} />
      <meshStandardMaterial
        emissive={selected ? '#22d3ee' : '#8b5cf6'}
        emissiveIntensity={selected ? 3.2 : dimmed ? 0.35 : 1.7}
        color="#1f1b2e"
        transparent
        opacity={opacity}
      />
    </mesh>
  )
}

function LifeArcGhostStar({ node }: { node: { id: string; position: ConstellationNodePosition; clusterKey: ClusterKey } }) {
  const ref = useRef<Mesh>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    ref.current.scale.setScalar(0.72 + Math.sin(clock.elapsedTime * 1.1 + node.position[0]) * 0.08)
    ref.current.rotation.y = clock.elapsedTime * 0.08
  })

  return (
    <mesh ref={ref} position={node.position}>
      <sphereGeometry args={[0.075, 16, 16]} />
      <meshStandardMaterial color="#08111f" emissive="#67e8f9" emissiveIntensity={0.72} transparent opacity={0.54} />
    </mesh>
  )
}

function NavigationDepthRig({ children, navigation }: { children: React.ReactNode; navigation?: LifeMapNavigationState | null }) {
  const groupRef = useRef<THREE.Group>(null)
  const zoom = navigation?.zoom ?? 1
  const panX = navigation?.panX ?? 0
  const panY = navigation?.panY ?? 0

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const targetScale = THREE.MathUtils.clamp(zoom, 0.82, 2.25)
    const targetX = panX
    const targetY = panY * 0.48
    const targetZ = -(targetScale - 1) * 1.55
    const lerp = Math.min(1, delta * 4.8)
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerp)
    groupRef.current.position.lerp(new THREE.Vector3(targetX, targetY, targetZ), lerp)
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.055) * 0.035 + panX * 0.025
    groupRef.current.rotation.x = -panY * 0.018
  })

  return <group ref={groupRef}>{children}</group>
}

export default function ConstellationLayer({ enabled, selectedManifestId, navigation, onSelect }: { enabled: boolean; selectedManifestId: string | null; navigation?: LifeMapNavigationState | null; onSelect: (manifest: SpatialAssetManifest, position: ConstellationNodePosition) => void }) {
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
    <NavigationDepthRig navigation={navigation}>
      <ConstellationLinks nodes={[...positionedManifests, ...syntheticLifeArcNodes]} selectedManifestId={selectedManifestId} />

      {syntheticLifeArcNodes.map((node) => <LifeArcGhostStar key={node.id} node={node} />)}

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
    </NavigationDepthRig>
  )
}
