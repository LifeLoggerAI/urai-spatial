'use client'

import { useMemo, useRef } from 'react'
import { Html, Stars } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Mesh } from 'three'
import { useConstellationManifests } from './useConstellationManifests'
import { SpatialAssetManifest } from '../assets/manifestTypes'
import ManifestRenderer from '../assets/ManifestRenderer'

export type ConstellationNodePosition = readonly [number, number, number]
type ClusterKey = 'memory' | 'intense' | 'visual' | 'spatial' | 'motion' | 'general'

type PositionedManifest = {
  manifest: SpatialAssetManifest
  clusterKey: ClusterKey
  position: ConstellationNodePosition
  tone: string
  label: string
}

const clusterOffsets: Record<ClusterKey, ConstellationNodePosition> = {
  memory: [-5.6, 2.05, -3.4],
  intense: [5.45, 1.65, -2.1],
  visual: [-3.25, 0.95, 2.85],
  spatial: [3.45, 1.15, 2.45],
  motion: [0.25, 2.8, -4.55],
  general: [0.2, 0.62, 0.3],
}

const fallbackLabels = ['Memory Bloom', 'Threshold', 'Mirror Focus', 'Ritual Echo', 'Dream Signal', 'Calm Return', 'Recovery Arc']
const toneColors = ['#ffd0c7', '#8fb6ff', '#78f0ff', '#a78bfa', '#ff74c7', '#67e8f9', '#d946ef']
const STARFIELD_SEED = 1947

function seededValue(index: number, salt = 0) {
  const value = Math.sin((index + 1) * 127.1 + salt * 311.7 + STARFIELD_SEED) * 43758.5453123
  return value - Math.floor(value)
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

function labelForManifest(manifest: SpatialAssetManifest, index: number) {
  const title = manifest.title ?? manifest.promptPreview ?? ''
  const trimmed = title.replace(/\s+/g, ' ').trim()
  if (trimmed) return trimmed.length > 22 ? `${trimmed.slice(0, 20)}...` : trimmed
  return fallbackLabels[index % fallbackLabels.length]
}

function toneForNode(clusterKey: ClusterKey, index: number) {
  const clusterIndex: Record<ClusterKey, number> = {
    memory: 0,
    intense: 4,
    visual: 3,
    spatial: 2,
    motion: 1,
    general: 5,
  }

  return toneColors[(clusterIndex[clusterKey] + index) % toneColors.length]
}

function nodePosition(clusterKey: ClusterKey, indexInCluster: number, clusterSize: number): ConstellationNodePosition {
  const base = clusterOffsets[clusterKey]
  const safeSize = Math.max(clusterSize, 1)
  const angle = (indexInCluster / safeSize) * Math.PI * 2 + seededValue(indexInCluster, safeSize) * 0.5
  const radius = 1.0 + Math.min(safeSize, 14) * 0.08 + seededValue(indexInCluster, safeSize + 3) * 0.34
  const depth = (seededValue(indexInCluster, safeSize + 7) - 0.5) * 1.2

  return [
    base[0] + Math.cos(angle) * radius,
    base[1] + Math.sin(indexInCluster * 0.47) * 0.42 + (seededValue(indexInCluster, 5) - 0.5) * 0.32,
    base[2] - Math.sin(angle) * radius + depth,
  ] as const
}

function curveGeometry(from: ConstellationNodePosition, to: ConstellationNodePosition, lift = 1.25) {
  const start = new THREE.Vector3(...from)
  const end = new THREE.Vector3(...to)
  const midpoint = start.clone().lerp(end, 0.5)
  midpoint.y += lift + start.distanceTo(end) * 0.08
  midpoint.z += Math.sin(start.x + end.z) * 0.55

  const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end)
  const points = curve.getPoints(32)
  return new THREE.BufferGeometry().setFromPoints(points)
}

function NebulaField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.025) * 0.045
    ref.current.rotation.x = Math.cos(clock.elapsedTime * 0.018) * 0.025
  })

  return (
    <group ref={ref} data-testid="lifemap-nebula-field">
      <mesh position={[-5.8, 2.4, -7.2]} rotation={[0.2, 0.08, -0.18]}>
        <planeGeometry args={[8.8, 4.2, 12, 12]} />
        <meshBasicMaterial color="#ff8bbd" transparent opacity={0.09} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[5.2, 1.55, -6.0]} rotation={[-0.1, -0.18, 0.24]}>
        <planeGeometry args={[7.4, 3.6, 12, 12]} />
        <meshBasicMaterial color="#9b5cff" transparent opacity={0.12} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0.2, -0.1, -5.4]} rotation={[-0.34, 0.04, 0.02]}>
        <planeGeometry args={[10.2, 3.8, 12, 12]} />
        <meshBasicMaterial color="#4cc9ff" transparent opacity={0.08} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}

function LifeMapStarfield3D({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.position.z = Math.sin(clock.elapsedTime * 0.11) * 0.18
    ref.current.rotation.y = clock.elapsedTime * 0.006
  })

  return (
    <group ref={ref} data-testid="lifemap-starfield-3d">
      <Stars radius={54} depth={34} count={1400} factor={4.8} saturation={0.45} fade speed={reducedMotion ? 0 : 0.38} />
      <Stars radius={26} depth={18} count={420} factor={7.5} saturation={0.75} fade speed={reducedMotion ? 0 : 0.18} />
    </group>
  )
}

function ConstellationArc({ from, to, tone, active, reducedMotion }: { from: ConstellationNodePosition; to: ConstellationNodePosition; tone: string; active: boolean; reducedMotion: boolean }) {
  const ref = useRef<THREE.Line>(null)
  const geometry = useMemo(() => curveGeometry(from, to, active ? 1.65 : 1.05), [active, from, to])

  useFrame(({ clock }) => {
    if (reducedMotion) return
    const material = ref.current?.material
    if (material instanceof THREE.LineBasicMaterial) {
      material.opacity = active ? 0.52 + Math.sin(clock.elapsedTime * 1.25) * 0.1 : 0.2
    }
  })

  return (
    <line ref={ref} geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={tone} transparent opacity={active ? 0.55 : 0.2} depthWrite={false} blending={THREE.AdditiveBlending} />
    </line>
  )
}

function ConstellationArcs({ nodes, selectedManifestId, reducedMotion }: { nodes: PositionedManifest[]; selectedManifestId: string | null; reducedMotion: boolean }) {
  const arcs = useMemo(() => {
    const ordered = [...nodes]
    return ordered.flatMap((node, index) => {
      const next = ordered[(index + 1) % ordered.length]
      const cross = ordered[(index + 3) % ordered.length]
      return [
        { id: `${node.manifest.manifestId}-next`, from: node, to: next },
        index % 2 === 0 ? { id: `${node.manifest.manifestId}-cross`, from: node, to: cross } : null,
      ].filter(Boolean) as Array<{ id: string; from: PositionedManifest; to: PositionedManifest }>
    })
  }, [nodes])

  return (
    <group data-testid="lifemap-constellation-arcs">
      {arcs.map((arc) => {
        const active = selectedManifestId === null || arc.from.manifest.manifestId === selectedManifestId || arc.to.manifest.manifestId === selectedManifestId
        return <ConstellationArc key={arc.id} from={arc.from.position} to={arc.to.position} tone={arc.from.tone} active={active} reducedMotion={reducedMotion} />
      })}
    </group>
  )
}

function Node({ node, selected, dimmed, reducedMotion, onSelect }: { node: PositionedManifest; selected: boolean; dimmed: boolean; reducedMotion: boolean; onSelect: (position: ConstellationNodePosition) => void }) {
  const ref = useRef<Mesh>(null)
  const haloRef = useRef<Mesh>(null)
  const opacity = dimmed ? 0.2 : 1
  const baseScale = dimmed ? 0.74 : 1

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = clock.elapsedTime * 0.2
    const scale = selected ? 1.85 + Math.sin(clock.elapsedTime * 3) * 0.08 : baseScale + Math.sin(clock.elapsedTime * 1.4 + node.position[0]) * 0.06
    ref.current.scale.setScalar(scale)
    if (haloRef.current) {
      const haloScale = selected ? 2.8 + Math.sin(clock.elapsedTime * 2) * 0.18 : 1.9 + Math.sin(clock.elapsedTime * 1.1 + node.position[2]) * 0.12
      haloRef.current.scale.setScalar(haloScale)
    }
  })

  return (
    <group position={node.position} data-testid={`lifemap-node-3d-${node.manifest.manifestId}`}>
      <mesh ref={haloRef} scale={1.8} frustumCulled={false}>
        <sphereGeometry args={[0.18, 20, 20]} />
        <meshBasicMaterial color={node.tone} transparent opacity={dimmed ? 0.08 : 0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ref} scale={baseScale} onClick={(event) => { event.stopPropagation(); onSelect(node.position) }}>
        <sphereGeometry args={[0.135, 24, 24]} />
        <meshStandardMaterial emissive={node.tone} emissiveIntensity={selected ? 4.2 : dimmed ? 0.55 : 2.35} color="#f7fbff" transparent opacity={opacity} />
      </mesh>
      <pointLight color={node.tone} intensity={dimmed ? 0.35 : selected ? 3.1 : 1.45} distance={selected ? 5.6 : 3.8} />
      <Html position={[0.24, 0.12, 0]} center distanceFactor={7.5} style={{ pointerEvents: 'none' }}>
        <span className="urai-life-map-3d-label">{node.label}</span>
      </Html>
    </group>
  )
}

export default function ConstellationLayer({ enabled, selectedManifestId, reducedMotion = false, onSelect }: { enabled: boolean; selectedManifestId: string | null; reducedMotion?: boolean; onSelect: (manifest: SpatialAssetManifest, position: ConstellationNodePosition) => void }) {
  const manifests = useConstellationManifests(enabled)
  const selected = manifests.find((manifest) => manifest.manifestId === selectedManifestId) ?? null
  const fieldRef = useRef<THREE.Group>(null)

  const positionedManifests = useMemo(() => {
    const clusterCounts = new Map<ClusterKey, number>()
    const clusterIndexes = new Map<ClusterKey, number>()

    manifests.forEach((manifest) => {
      const key = clusterForManifest(manifest)
      clusterCounts.set(key, (clusterCounts.get(key) || 0) + 1)
    })

    return manifests.map((manifest, index) => {
      const key = clusterForManifest(manifest)
      const indexInCluster = clusterIndexes.get(key) || 0
      clusterIndexes.set(key, indexInCluster + 1)

      return {
        manifest,
        clusterKey: key,
        position: nodePosition(key, indexInCluster, clusterCounts.get(key) || 1),
        tone: toneForNode(key, index),
        label: labelForManifest(manifest, index),
      }
    })
  }, [manifests])

  useFrame(({ clock }) => {
    if (!fieldRef.current || reducedMotion) return
    fieldRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.022
    fieldRef.current.position.y = Math.sin(clock.elapsedTime * 0.17) * 0.05
  })

  if (!enabled) return null

  return (
    <group ref={fieldRef} data-testid="lifemap-cosmic-constellation" position={[0, 0.08, -0.35]}>
      <LifeMapStarfield3D reducedMotion={reducedMotion} />
      <NebulaField reducedMotion={reducedMotion} />
      <ConstellationArcs nodes={positionedManifests} selectedManifestId={selectedManifestId} reducedMotion={reducedMotion} />

      {positionedManifests.map((node) => (
        <Node
          key={node.manifest.manifestId}
          node={node}
          selected={node.manifest.manifestId === selectedManifestId}
          dimmed={Boolean(selectedManifestId) && node.manifest.manifestId !== selectedManifestId}
          reducedMotion={reducedMotion}
          onSelect={(nodePosition) => onSelect(node.manifest, nodePosition)}
        />
      ))}

      {selected ? <ManifestRenderer manifest={selected} /> : null}
    </group>
  )
}
