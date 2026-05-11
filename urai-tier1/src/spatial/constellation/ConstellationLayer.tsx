'use client'

import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { Mesh } from 'three'
import { useFrame } from '@react-three/fiber'
import type { SpatialAssetManifest } from '../assets/manifestTypes'
import ManifestRenderer from '../assets/ManifestRenderer'
import type { LifeMapNavigationState } from '../interaction/LifeMapNavigationOverlay'
import { LIFE_MAP_UNIVERSE_EDGES, LIFE_MAP_UNIVERSE_NODES, lifeMapNodeToManifest, type LifeMapUniverseNode } from '../lifemap/lifeMapUniverseData'

export type ConstellationNodePosition = readonly [number, number, number]

type PositionedLifeMapNode = { node: LifeMapUniverseNode; manifest: SpatialAssetManifest; position: ConstellationNodePosition }

const seasonZones: Array<{ id: string; position: ConstellationNodePosition; scale: readonly [number, number, number]; color: string; opacity: number }> = [
  { id: 'recovery-zone', position: [0.8, 1.8, -0.4], scale: [6.8, 2.2, 4.8], color: '#2dd4bf', opacity: 0.05 },
  { id: 'shadow-zone', position: [-5.4, 0.6, -6.6], scale: [4.2, 1.6, 3.0], color: '#7c3aed', opacity: 0.055 },
  { id: 'threshold-zone', position: [3.4, 3.8, -7.1], scale: [4.0, 1.5, 2.8], color: '#f4d784', opacity: 0.06 },
  { id: 'legacy-zone', position: [8.2, 4.0, -10.2], scale: [3.8, 1.4, 2.4], color: '#bae6fd', opacity: 0.045 },
]

function selectedRelated(selectedManifestId: string | null, node: LifeMapUniverseNode) {
  return !selectedManifestId || node.id === selectedManifestId || node.relatedNodeIds.includes(selectedManifestId) || node.connectedTo.includes(selectedManifestId)
}

function UniverseAtmosphere() {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.rotation.y = Math.sin(clock.elapsedTime * 0.035) * 0.035
    group.current.rotation.x = Math.cos(clock.elapsedTime * 0.025) * 0.012
  })
  return (
    <group ref={group} name="lifemap-universe-atmosphere">
      {seasonZones.map((zone) => (
        <mesh key={zone.id} position={zone.position} scale={zone.scale} frustumCulled={false}>
          <sphereGeometry args={[1, 32, 16]} />
          <meshBasicMaterial color={zone.color} transparent opacity={zone.opacity} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {Array.from({ length: 70 }).map((_, index) => {
        const angle = index * 2.399963229728653
        const radius = 4.4 + (index % 11) * 0.48
        const z = -2.2 - (index % 17) * 0.58
        const y = 0.6 + Math.sin(index * 1.7) * 2.7
        return (
          <mesh key={index} position={[Math.cos(angle) * radius, y, z + Math.sin(angle) * 2.2]} scale={0.018 + (index % 5) * 0.006}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color={index % 4 === 0 ? '#c4b5fd' : '#dbeafe'} transparent opacity={0.42} />
          </mesh>
        )
      })}
    </group>
  )
}

function ConstellationCurves({ nodes, selectedManifestId }: { nodes: PositionedLifeMapNode[]; selectedManifestId: string | null }) {
  const groupRef = useRef<THREE.Group>(null)
  const nodeById = useMemo(() => new Map(nodes.map((entry) => [entry.node.id, entry])), [nodes])
  const curves = useMemo(() => LIFE_MAP_UNIVERSE_EDGES.map((edge) => {
    const from = nodeById.get(edge.from)
    const to = nodeById.get(edge.to)
    if (!from || !to) return null
    const p1 = new THREE.Vector3(...from.position)
    const p2 = new THREE.Vector3(...to.position)
    const mid = p1.clone().lerp(p2, 0.5)
    mid.y += 0.55 + edge.strength * 1.1
    mid.z -= 0.25 + edge.strength * 0.45
    const geometry = new THREE.BufferGeometry().setFromPoints(new THREE.QuadraticBezierCurve3(p1, mid, p2).getPoints(44))
    const active = !selectedManifestId || edge.from === selectedManifestId || edge.to === selectedManifestId
    return { edge, geometry, active }
  }).filter(Boolean) as Array<{ edge: (typeof LIFE_MAP_UNIVERSE_EDGES)[number]; geometry: THREE.BufferGeometry; active: boolean }>, [nodeById, selectedManifestId])

  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.04) * 0.018
  })

  return (
    <group ref={groupRef} name="lifemap-constellation-paths">
      {curves.map(({ edge, geometry, active }) => {
        const material = new THREE.LineBasicMaterial({ color: edge.glow, transparent: true, opacity: active ? 0.46 + edge.strength * 0.22 : 0.08, depthWrite: false, blending: THREE.AdditiveBlending })
        const line = new THREE.Line(geometry, material)
        line.frustumCulled = false
        return <primitive key={edge.id} object={line} />
      })}
    </group>
  )
}

function LifeMapUniverseStar({ entry, selected, dimmed, onSelect }: { entry: PositionedLifeMapNode; selected: boolean; dimmed: boolean; onSelect: (manifest: SpatialAssetManifest, position: ConstellationNodePosition) => void }) {
  const ref = useRef<Mesh>(null)
  const auraRef = useRef<Mesh>(null)
  const { node, manifest, position } = entry
  useFrame(({ clock }) => {
    const pulse = Math.sin(clock.elapsedTime * node.pulseSpeed * 2.2 + position[0])
    ref.current?.scale.setScalar((selected ? 1.65 : dimmed ? 0.72 : 1) * node.size * (1 + pulse * 0.055))
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.16
    auraRef.current?.scale.setScalar((selected ? 2.4 : dimmed ? 1.1 : 1.75) * node.size * (1 + pulse * 0.08))
  })
  return (
    <group position={position} name={`lifemap-node-${node.id}`} userData={{ lifemapNodeType: node.type, lifemapEmotionalTone: node.emotionalTone }}>
      <mesh ref={auraRef}>
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshBasicMaterial color={node.auraColor} transparent opacity={dimmed ? 0.045 : selected ? 0.28 : 0.13} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ref} onClick={(event) => { event.stopPropagation(); if (!node.locked) onSelect(manifest, position) }} onPointerOver={(event) => event.stopPropagation()} aria-label={`${node.title}: ${node.subtitle}`}>
        <sphereGeometry args={[0.14, 32, 32]} />
        <meshStandardMaterial emissive={node.color} emissiveIntensity={selected ? 4.2 : dimmed ? 0.45 : 1.8 + node.emotionalIntensity * 1.4} color={node.emotionalTone === 'shadow' ? '#090014' : '#10192b'} transparent opacity={dimmed ? 0.22 : 0.96} />
      </mesh>
    </group>
  )
}

function NavigationDepthRig({ children, navigation }: { children: ReactNode; navigation?: LifeMapNavigationState | null }) {
  const groupRef = useRef<THREE.Group>(null)
  const zoom = navigation?.zoom ?? 1
  const panX = navigation?.panX ?? 0
  const panY = navigation?.panY ?? 0
  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return
    const targetScale = THREE.MathUtils.clamp(zoom, 0.78, 2.15)
    const lerp = Math.min(1, delta * 3.8)
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), lerp)
    groupRef.current.position.lerp(new THREE.Vector3(panX, panY * 0.48, -(targetScale - 1) * 1.8), lerp)
    groupRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.045) * 0.035 + panX * 0.025
    groupRef.current.rotation.x = -panY * 0.018
  })
  return <group ref={groupRef}>{children}</group>
}

export default function ConstellationLayer({ enabled, selectedManifestId, navigation, onSelect }: { enabled: boolean; selectedManifestId: string | null; navigation?: LifeMapNavigationState | null; onSelect: (manifest: SpatialAssetManifest, position: ConstellationNodePosition) => void }) {
  const positionedNodes = useMemo<PositionedLifeMapNode[]>(() => LIFE_MAP_UNIVERSE_NODES.map((node) => ({ node, manifest: lifeMapNodeToManifest(node), position: node.position })), [])
  const selectedEntry = positionedNodes.find((entry) => entry.node.id === selectedManifestId) ?? null
  if (!enabled) return null
  return (
    <NavigationDepthRig navigation={navigation}>
      <UniverseAtmosphere />
      <ConstellationCurves nodes={positionedNodes} selectedManifestId={selectedManifestId} />
      <group name="lifemap-3d-node-surface" userData={{ lifemapNodeCount: positionedNodes.length }}>
        {positionedNodes.map((entry) => <LifeMapUniverseStar key={entry.node.id} entry={entry} selected={entry.node.id === selectedManifestId} dimmed={Boolean(selectedManifestId) && !selectedRelated(selectedManifestId, entry.node)} onSelect={onSelect} />)}
      </group>
      {selectedEntry ? <ManifestRenderer manifest={selectedEntry.manifest} /> : null}
    </NavigationDepthRig>
  )
}
