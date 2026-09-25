'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'
import { LifeMapGoldMasterOverlay as LegacyLifeMapGoldMasterOverlay } from './LifeMapGoldMasterOverlayV249'
import { LifeMapStellarField } from './LifeMapStellarField'

type Props = { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }
type Point3 = [number, number, number]

function connectionGeometry(nodes: LifeMapNode[], selected: LifeMapNode | null) {
  const positions: number[] = [], colors: number[] = []
  const byId = new Map(nodes.map((node, index) => [node.id, { node, index }] as const)), seen = new Set<string>()
  const contextualTypes = new Set<LifeMapNode['type']>(['threshold', 'relationship', 'recovery', 'legacy'])
  const candidates: { source: LifeMapNode; sourceIndex: number; target: LifeMapNode; targetIndex: number }[] = []
  nodes.forEach((source, sourceIndex) => {
    source.connectedTo.forEach(targetId => {
      const target = byId.get(targetId); if (!target) return
      const key = [source.id, targetId].sort().join(':'); if (seen.has(key)) return; seen.add(key)
      const incident = Boolean(selected && (selected.id === source.id || selected.id === target.node.id))
      const overviewContext = !selected && source.eraId !== target.node.eraId && (contextualTypes.has(source.type) || contextualTypes.has(target.node.type))
      if (incident || overviewContext) candidates.push({ source, sourceIndex, target: target.node, targetIndex: target.index })
    })
  })
  // Relationships are context, never the Life Map's primary visual language. Overview
  // carries no explicit graph edges; arrival may reveal one local relationship only.
  const visible = selected ? candidates.slice(0, 1) : []
  visible.forEach(({ source, sourceIndex, target, targetIndex }) => {
    const start = new THREE.Vector3(...lifeMapLocalPoint(source, sourceIndex)), end = new THREE.Vector3(...lifeMapLocalPoint(target, targetIndex)), mid = start.clone().lerp(end, .5)
    const separation = start.distanceTo(end)
    mid.y += .32 + Math.min(1.15, separation * .035)
    mid.z -= Math.min(1.2, separation * .025)
    const samples = new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(14), aColor = new THREE.Color(source.aura), bColor = new THREE.Color(target.aura)
    for (let index = 0; index < samples.length - 1; index += 1) {
      const a = samples[index], b = samples[index + 1], color = aColor.clone().lerp(bColor, index / (samples.length - 1)), boost = .10
      positions.push(a.x, a.y + .055, a.z, b.x, b.y + .055, b.z)
      colors.push(color.r * boost, color.g * boost, color.b * boost, color.r * boost, color.g * boost, color.b * boost)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geometry
}

function beaconGeometry(nodes: LifeMapNode[]) {
  const positions: number[] = [], colors: number[] = []
  nodes.forEach((node, index) => {
    const point = lifeMapLocalPoint(node, index), base = new THREE.Color(node.aura)
    for (let mote = 0; mote < 2; mote += 1) {
      const angle = index * 1.77 + mote * Math.PI, radius = .12 + mote * .10
      positions.push(point[0] + Math.cos(angle) * radius, point[1] + .24 + mote * .22, point[2] + Math.sin(angle) * radius * .62)
      const color = base.clone().lerp(new THREE.Color('#f0dfb7'), .12 + mote * .08); colors.push(color.r, color.g, color.b)
    }
  })
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); return geometry
}

function selectedHistoryGeometry() {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < 2; branch += 1) {
    let previous: THREE.Vector3 | null = null
    const side = branch ? -1 : 1
    for (let step = 0; step <= 14; step += 1) {
      const t = step / 14, current = new THREE.Vector3(side * (.36 + t * .42), -.34 + t * .78, -.18 - Math.sin(t * Math.PI) * .24)
      if (previous) points.push(previous, current); previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function historyParticles(node: LifeMapNode, index: number) {
  const count = 18, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), warm = new THREE.Color('#ecd7ac'), aura = new THREE.Color(node.aura)
  for (let i = 0; i < count; i += 1) {
    const angle = i * 2.39996323 + index * .37, radius = .34 + Math.sqrt((i + .5) / count) * .72
    positions.set([Math.cos(angle) * radius, -.02 + ((i * 13) % count) / count * .66, Math.sin(angle) * radius * .55], i * 3)
    const color = aura.clone().lerp(warm, .18 + (i % 4) * .05); colors.set([color.r, color.g, color.b], i * 3)
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
}

function HistoryConstellation({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null), links = useMemo(() => connectionGeometry(nodes, selected), [nodes, selected]), beacons = useMemo(() => beaconGeometry(nodes), [nodes])
  useEffect(() => () => { links.dispose(); beacons.dispose() }, [links, beacons])
  useFrame(({ clock }) => { if (root.current && !reducedMotion) root.current.position.y = Math.sin(clock.elapsedTime * .09) * .008 })
  return <group ref={root} name="life-map-v255-contextual-history-constellation" userData={{ visualOnly: true, interactionOwner: false, relationshipPolicy: selected ? 'selected-memory-only-max-one-subtle' : 'overview-no-explicit-graph-edges' }}>
    <lineSegments geometry={links} raycast={() => null}><lineBasicMaterial vertexColors transparent opacity={selected ? .025 : 0} depthWrite={false} /></lineSegments>
    <points geometry={beacons} raycast={() => null}><pointsMaterial vertexColors size={.030} transparent opacity={.30} depthWrite={false} sizeAttenuation /></points>
  </group>
}

function SelectedHistory({ node, index, reducedMotion }: { node: LifeMapNode; index: number; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null), point = useMemo(() => lifeMapLocalPoint(node, index), [node, index]), history = useMemo(selectedHistoryGeometry, []), particles = useMemo(() => historyParticles(node, index), [node, index])
  useEffect(() => () => { history.dispose(); particles.dispose() }, [history, particles])
  useFrame(({ clock }) => { if (root.current && !reducedMotion) root.current.rotation.y = Math.sin(clock.elapsedTime * .08) * .010 })
  return <group ref={root} position={point} name="life-map-v255-selected-history-sanctuary" userData={{ visualOnly: true, interactionOwner: false, presentationRevision: 'v255-arrival-inside-history', visualRepair: 'restrained-local-history-only' }}>
    <lineSegments geometry={history} raycast={() => null}><lineBasicMaterial color={node.aura} transparent opacity={.06} depthWrite={false} /></lineSegments>
    <points geometry={particles} raycast={() => null}><pointsMaterial vertexColors size={.021} transparent opacity={reducedMotion ? .13 : .18} depthWrite={false} sizeAttenuation /></points>
    <pointLight position={[-.7, .50, .48]} color={node.aura} intensity={.12} distance={3.2} decay={2} />
  </group>
}

export function LifeMapGoldMasterOverlay(props: Props) {
  const { nodes, selected, phase, reducedMotion } = props, { size } = useThree(), portrait = size.height > size.width, stage = lifeMapStage(Boolean(selected), portrait), selectedIndex = selected ? Math.max(0, nodes.findIndex(node => node.id === selected.id)) : -1
  return <>
    <color attach="background" args={['#01020a']} />
    <fog attach="fog" args={['#050714', 42, 128]} />
    <LegacyLifeMapGoldMasterOverlay {...props} />
    <group name="life-map-v323-stellar-personal-universe" scale={stage.scale} position={stage.position} userData={{ presentationRevision: 'v323-layered-living-galaxy', visualRepair: 'dense-clustered-stellar-depth-memory-star-identity' }}>
      <LifeMapStellarField nodes={nodes} selected={selected} reducedMotion={reducedMotion} onSelect={props.onSelect} />
      <HistoryConstellation nodes={nodes} selected={selected} reducedMotion={reducedMotion} />
      <group name="life-map-v249-grounded-memory-places" userData={{ visualRepair: 'all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context' }}>{nodes.map((node, index) => <group key={node.id} name={`life-map-v255-history-anchor-${node.id}`} position={lifeMapLocalPoint(node, index)} raycast={() => null} />)}</group>
      {selected && phase === 'arrival' ? <SelectedHistory node={selected} index={selectedIndex} reducedMotion={reducedMotion} /> : null}
    </group>
  </>
}
