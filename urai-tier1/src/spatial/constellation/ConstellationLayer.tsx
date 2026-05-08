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

type LifeMapMotif = {
  id: string
  tone: string
  opacity: number
  position: ConstellationNodePosition
  scale: number
  points: ConstellationNodePosition[]
}

type NebulaCloud = {
  id: string
  color: string
  opacity: number
  position: ConstellationNodePosition
  scale: [number, number, number]
  rotation: [number, number, number]
}

type AnchorStar = {
  id: string
  tone: string
  position: ConstellationNodePosition
  scale: number
  intensity: number
}

type EdgeConstellation = {
  id: string
  tone: string
  opacity: number
  position: ConstellationNodePosition
  scale: number
  points: ConstellationNodePosition[]
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

const nebulaClouds: NebulaCloud[] = [
  { id: 'ember-left', color: '#ff9a3d', opacity: 0.13, position: [-6.8, -0.2, -8.9], scale: [7.8, 3.4, 1], rotation: [0.04, 0.24, -0.44] },
  { id: 'rose-left', color: '#ff62c7', opacity: 0.12, position: [-4.9, 1.9, -9.4], scale: [8.4, 3.1, 1], rotation: [0.18, 0.08, -0.2] },
  { id: 'blue-core', color: '#40d6ff', opacity: 0.15, position: [0.1, 1.2, -9.7], scale: [8.8, 3.6, 1], rotation: [-0.22, -0.02, 0.08] },
  { id: 'violet-crown', color: '#a855f7', opacity: 0.13, position: [3.8, 2.4, -9.1], scale: [7.6, 3.3, 1], rotation: [0.16, -0.26, 0.3] },
  { id: 'gold-right', color: '#ffbf68', opacity: 0.12, position: [6.2, -0.7, -8.7], scale: [6.5, 2.9, 1], rotation: [-0.08, -0.18, 0.42] },
  { id: 'ice-veil', color: '#c7f7ff', opacity: 0.07, position: [1.2, -1.4, -7.4], scale: [10.8, 4.1, 1], rotation: [-0.38, 0.04, -0.04] },
]

const anchorStars: AnchorStar[] = [
  { id: 'blue-center', tone: '#7dd3fc', position: [0.1, 1.05, -5.35], scale: 1.55, intensity: 2.2 },
  { id: 'gold-memory', tone: '#ffd38a', position: [-4.75, 1.45, -5.85], scale: 1.25, intensity: 1.75 },
  { id: 'magenta-dream', tone: '#ff7adf', position: [4.55, 2.0, -5.7], scale: 1.32, intensity: 1.85 },
  { id: 'orange-return', tone: '#ff9f5f', position: [5.9, -1.05, -5.25], scale: 1.18, intensity: 1.65 },
]

const edgeConstellations: EdgeConstellation[] = [
  { id: 'upper-left-frame', tone: '#95b8ff', opacity: 0.22, position: [-6.8, 2.9, -4.8], scale: 0.72, points: [[-1.4, 0.6, 0], [-0.42, 0.2, 0], [0.38, 0.52, 0], [1.25, -0.12, 0], [1.7, 0.54, 0]] },
  { id: 'upper-right-frame', tone: '#8fb6ff', opacity: 0.2, position: [6.7, 2.75, -5.05], scale: 0.78, points: [[-1.3, 0.52, 0], [-0.45, 0.0, 0], [0.24, 0.42, 0], [0.95, -0.08, 0], [1.36, -0.84, 0]] },
  { id: 'lower-left-frame', tone: '#b48cff', opacity: 0.17, position: [-7.1, -1.7, -4.65], scale: 0.8, points: [[-0.95, 0.62, 0], [-0.18, 0.04, 0], [0.62, 0.2, 0], [1.15, -0.72, 0], [1.75, -0.2, 0]] },
  { id: 'lower-right-frame', tone: '#ff9edb', opacity: 0.18, position: [6.9, -1.75, -4.75], scale: 0.76, points: [[-1.65, -0.08, 0], [-0.88, 0.46, 0], [-0.12, 0.12, 0], [0.54, 0.74, 0], [1.34, 0.36, 0]] },
]

const lifeMapMotifs: LifeMapMotif[] = [
  {
    id: 'inner-profile',
    tone: '#5cc8ff',
    opacity: 0.2,
    position: [-1.15, 1.2, -7.4],
    scale: 1.15,
    points: [
      [-3.3, 1.7, 0], [-2.55, 2.75, 0], [-1.28, 3.35, 0], [0.12, 3.05, 0], [0.9, 2.18, 0], [1.05, 1.15, 0], [1.7, 0.72, 0], [1.28, 0.08, 0], [0.78, -0.42, 0], [0.48, -1.08, 0], [-0.15, -1.72, 0], [-1.04, -1.36, 0], [-1.8, -0.78, 0], [-2.74, -0.3, 0], [-3.1, 0.72, 0], [-3.3, 1.7, 0],
    ],
  },
  {
    id: 'guardian-wolf',
    tone: '#7de7ff',
    opacity: 0.15,
    position: [1.65, 0.7, -9.25],
    scale: 0.9,
    points: [
      [-3.7, -0.8, 0], [-2.95, -0.15, 0], [-2.1, 0.02, 0], [-1.15, 0.65, 0], [0.1, 0.88, 0], [1.0, 1.52, 0], [1.65, 2.35, 0], [2.08, 1.42, 0], [2.7, 0.9, 0], [2.0, 0.42, 0], [1.2, 0.18, 0], [0.72, -0.52, 0], [0.35, -1.7, 0], [-0.22, -0.66, 0], [-1.05, -1.45, 0], [-1.42, -0.48, 0], [-2.15, -0.72, 0], [-3.1, -1.2, 0], [-3.7, -0.8, 0],
    ],
  },
]

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

function lineGeometry(points: ConstellationNodePosition[]) {
  return new THREE.BufferGeometry().setFromPoints(points.map((point) => new THREE.Vector3(...point)))
}

function NebulaCloudMesh({ cloud }: { cloud: NebulaCloud }) {
  return (
    <group position={cloud.position} rotation={cloud.rotation} scale={cloud.scale}>
      <mesh>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color={cloud.color} transparent opacity={cloud.opacity} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
      <mesh scale={[0.58, 0.42, 1]} position={[0.22, 0.08, 0.02]}>
        <circleGeometry args={[1, 64]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={cloud.opacity * 0.18} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
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
      {nebulaClouds.map((cloud) => <NebulaCloudMesh key={cloud.id} cloud={cloud} />)}
      <mesh position={[0.1, 0.2, -10.25]} rotation={[-0.22, 0.02, -0.08]}>
        <planeGeometry args={[15.5, 5.4, 12, 12]} />
        <meshBasicMaterial color="#6bdcff" transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} />
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
      <Stars radius={68} depth={44} count={2200} factor={5.2} saturation={0.5} fade speed={reducedMotion ? 0 : 0.34} />
      <Stars radius={28} depth={20} count={620} factor={8.6} saturation={0.8} fade speed={reducedMotion ? 0 : 0.16} />
    </group>
  )
}

function MotifLine({ motif }: { motif: LifeMapMotif }) {
  const geometry = useMemo(() => lineGeometry(motif.points), [motif.points])

  return (
    <line geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={motif.tone} transparent opacity={motif.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </line>
  )
}

function EdgeConstellationLine({ constellation }: { constellation: EdgeConstellation }) {
  const geometry = useMemo(() => lineGeometry(constellation.points), [constellation.points])

  return (
    <line geometry={geometry} frustumCulled={false}>
      <lineBasicMaterial color={constellation.tone} transparent opacity={constellation.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
    </line>
  )
}

function LifeMapEdgeConstellations({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.z = Math.sin(clock.elapsedTime * 0.025) * 0.015
  })

  return (
    <group ref={ref} data-testid="lifemap-edge-constellations">
      {edgeConstellations.map((constellation) => (
        <group key={constellation.id} position={constellation.position} scale={constellation.scale} data-testid={`lifemap-edge-constellation-${constellation.id}`}>
          <EdgeConstellationLine constellation={constellation} />
          {constellation.points.map((point, index) => (
            <mesh key={`${constellation.id}-${index}`} position={point} scale={index % 2 === 0 ? 1.05 : 0.72}>
              <sphereGeometry args={[0.045, 10, 10]} />
              <meshBasicMaterial color={constellation.tone} transparent opacity={0.66} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

function LifeMapAnchorStars({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.018
  })

  return (
    <group ref={ref} data-testid="lifemap-anchor-stars">
      {anchorStars.map((star) => (
        <group key={star.id} position={star.position} scale={star.scale}>
          <mesh>
            <sphereGeometry args={[0.12, 24, 24]} />
            <meshBasicMaterial color={star.tone} transparent opacity={0.95} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh scale={2.4}>
            <sphereGeometry args={[0.18, 24, 24]} />
            <meshBasicMaterial color={star.tone} transparent opacity={0.18} depthWrite={false} blending={THREE.AdditiveBlending} />
          </mesh>
          <pointLight color={star.tone} intensity={star.intensity} distance={6.5} />
        </group>
      ))}
    </group>
  )
}

function LifeMapMythicMotifs({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.025
    ref.current.position.z = Math.sin(clock.elapsedTime * 0.07) * 0.12
  })

  return (
    <group ref={ref} data-testid="lifemap-mythic-constellation-motifs">
      {lifeMapMotifs.map((motif) => (
        <group key={motif.id} position={motif.position} scale={motif.scale} data-testid={`lifemap-motif-${motif.id}`}>
          <MotifLine motif={motif} />
          {motif.points.map((point, index) => (
            <mesh key={`${motif.id}-${index}`} position={point} scale={index % 3 === 0 ? 1.15 : 0.78}>
              <sphereGeometry args={[0.035, 10, 10]} />
              <meshBasicMaterial color={motif.tone} transparent opacity={0.72} depthWrite={false} blending={THREE.AdditiveBlending} />
            </mesh>
          ))}
        </group>
      ))}
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
    if (nodes.length < 2) return []
    const ordered = [...nodes]
    return ordered.flatMap((node, index) => {
      const next = ordered[(index + 1) % ordered.length]
      const cross = ordered[(index + 3) % ordered.length]
      const crossArc = ordered.length > 4 && index % 2 === 0 ? { id: `${node.manifest.manifestId}-cross`, from: node, to: cross } : null
      return [
        { id: `${node.manifest.manifestId}-next`, from: node, to: next },
        crossArc,
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
      <color attach="background" args={['#02030a']} />
      <fog attach="fog" args={['#02030a', 7.5, 29]} />
      <LifeMapStarfield3D reducedMotion={reducedMotion} />
      <NebulaField reducedMotion={reducedMotion} />
      <LifeMapAnchorStars reducedMotion={reducedMotion} />
      <LifeMapEdgeConstellations reducedMotion={reducedMotion} />
      <LifeMapMythicMotifs reducedMotion={reducedMotion} />
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
