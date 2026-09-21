'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  HOME_SKY_CONTINUITY_SEED,
  HOME_SKY_PRECURSOR_COUNT,
  homeSkyContinuityIds,
  homeSkyContinuitySample,
} from '@/spatial/visual/homeSkyContinuity'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint } from './lifeMapSpatialLayout'

function seeded(seed: number, salt: number) {
  const value = Math.sin(seed * 91.317 + salt * 17.731) * 43758.5453123
  return value - Math.floor(value)
}

function nodeSeed(node: LifeMapNode) {
  const key = `${node.id}:${node.eraId || 'unassigned-era'}:${node.clusterId || 'unassigned-cluster'}`
  let hash = 2166136261
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function depthGeometry() {
  const deepCount = 4200
  const nearCount = 2200
  const count = deepCount + nearCount
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#d7edf5')
  const warm = new THREE.Color('#ead8b7')
  const pearl = new THREE.Color('#d7d4dc')
  const mutedCyan = new THREE.Color('#aecfd0')

  for (let index = 0; index < count; index += 1) {
    const near = index >= deepCount
    const local = near ? index - deepCount : index
    const radius = near
      ? .8 + Math.pow(seeded(local + 7041, 2), .62) * 13.8
      : 3.2 + Math.pow(seeded(local + 41, 2), .58) * 27.5
    const angle = seeded(local + (near ? 7041 : 41), 3) * Math.PI * 2
    const depth = near
      ? 2.5 - seeded(local + 7041, 4) * 31
      : 7 - seeded(local + 41, 4) * 72
    const vertical = near ? 8.8 : 25
    const seedBase = local + (near ? 7041 : 41)
    positions.set([
      Math.cos(angle) * radius,
      (seeded(seedBase, 5) - .5) * vertical * 2,
      depth,
    ], index * 3)
    const base = index % 13 === 0 ? warm : index % 8 === 0 ? pearl : index % 11 === 0 ? mutedCyan : cool
    const brightness = near ? .62 + seeded(seedBase, 6) * .38 : .38 + seeded(seedBase, 6) * .62
    const color = base.clone().multiplyScalar(brightness)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

/**
 * The 31 Home precursor lights reappear here with the same deterministic IDs
 * and angular ordering. The surrounding Life Map field grows around them, so
 * Home -> Life Map reads as disclosure of pre-existing depth rather than a
 * replacement starfield.
 */
function homeSkyContinuityGeometry() {
  const positions = new Float32Array(HOME_SKY_PRECURSOR_COUNT * 3)
  const colors = new Float32Array(HOME_SKY_PRECURSOR_COUNT * 3)
  const pearl = new THREE.Color('#e9e3cf')
  const paleTeal = new THREE.Color('#a9c8c2')

  for (let index = 0; index < HOME_SKY_PRECURSOR_COUNT; index += 1) {
    const sample = homeSkyContinuitySample(index)
    const radial = 4.8 + sample.radialBias * 10.8
    const x = Math.cos(sample.azimuth) * radial
    const y = (Math.sin(sample.elevation) - .50) * 11.5
    const z = -7.5 - sample.depth * 27 - radial * .74
    positions.set([x, y, z], index * 3)
    const color = paleTeal.clone().lerp(pearl, .38 + sample.temperature * .48)
    colors.set([color.r, color.g, color.b], index * 3)
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.userData = {
    source: 'home-sky-memory-precursors',
    continuitySeed: HOME_SKY_CONTINUITY_SEED,
    continuityIds: homeSkyContinuityIds(),
  }
  return geometry
}


function chapterCloudGeometry(nodes: LifeMapNode[]) {
  const groups = new Map<string, Array<{ node: LifeMapNode; index: number }>>()
  nodes.forEach((node, index) => {
    const key = node.eraId || node.clusterId || 'unassigned'
    const group = groups.get(key) || []
    group.push({ node, index })
    groups.set(key, group)
  })
  const positions: number[] = []
  const colors: number[] = []
  const cool = new THREE.Color('#74c8dc')
  const violet = new THREE.Color('#9b7fd1')
  const warm = new THREE.Color('#e7c78f')
  Array.from(groups.values()).forEach((members, groupIndex) => {
    const center = members.reduce((sum, member) => {
      const point = lifeMapLocalPoint(member.node, member.index)
      sum.x += point[0]; sum.y += point[1]; sum.z += point[2]
      return sum
    }, new THREE.Vector3()).multiplyScalar(1 / Math.max(1, members.length))
    const seed = members.reduce((value, member) => value ^ nodeSeed(member.node), 0) + groupIndex * 977
    const count = 420
    for (let index = 0; index < count; index += 1) {
      const radial = Math.pow(seeded(seed + index, 51), .62) * (4.6 + (groupIndex % 3) * 1.15)
      const angle = seeded(seed + index, 52) * Math.PI * 2 + radial * .19 + groupIndex * .76
      const vertical = (seeded(seed + index, 53) - .5) * (2.6 + radial * .18)
      const depth = (seeded(seed + index, 54) - .5) * (3.8 + radial * .34)
      positions.push(
        center.x + Math.cos(angle) * radial,
        center.y + vertical + Math.sin(angle * 2.1) * .22,
        center.z + Math.sin(angle) * radial * .72 + depth,
      )
      const aura = new THREE.Color(members[index % members.length]?.node.aura || '#9fcdda')
      const base = groupIndex % 3 === 0 ? cool : groupIndex % 3 === 1 ? violet : warm
      const color = base.clone().lerp(aura, .36 + seeded(seed + index, 55) * .34).multiplyScalar(.55 + seeded(seed + index, 56) * .72)
      colors.push(color.r, color.g, color.b)
    }
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
}

function galaxyThreadsGeometry() {
  const points: THREE.Vector3[] = []
  for (let arm = 0; arm < 9; arm += 1) {
    let previous: THREE.Vector3 | null = null
    const phase = arm / 9 * Math.PI * 2
    for (let step = 0; step <= 34; step += 1) {
      const t = step / 34
      const radius = 2.2 + t * (8.6 + (arm % 3) * 1.4)
      const angle = phase + t * (1.22 + (arm % 2) * .18) + .08 * Math.sin(t * 9 + arm)
      const current = new THREE.Vector3(
        Math.cos(angle) * radius,
        Math.sin(t * Math.PI * 2 + arm) * (1.1 + t * 2.3),
        -4.8 - t * (15 + (arm % 4) * 1.8),
      )
      if (previous) points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function memoryMotes(node: LifeMapNode, active: boolean) {
  const seed = nodeSeed(node)
  const count = active ? 120 : 56
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const aura = new THREE.Color(node.aura)
  const white = new THREE.Color('#f7f2e8')
  for (let mote = 0; mote < count; mote += 1) {
    const angle = mote * 2.39996323 + seeded(seed, mote) * .9
    const radius = .13 + Math.sqrt((mote + .5) / count) * (active ? 1.48 : .84)
    positions.set([
      Math.cos(angle) * radius,
      (seeded(seed + mote, 11) - .5) * (active ? 1.82 : 1.02),
      Math.sin(angle) * radius,
    ], mote * 3)
    const color = aura.clone().lerp(white, .30 + seeded(seed + mote, 12) * .52)
    colors.set([color.r, color.g, color.b], mote * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function memoryFilamentGeometry(seed: number) {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < 5; branch += 1) {
    const side = branch % 2 ? -1 : 1
    let previous = new THREE.Vector3((seeded(seed, 20 + branch) - .5) * .12, -.18 + branch * .08, (seeded(seed, 40 + branch) - .5) * .10)
    for (let step = 1; step <= 5; step += 1) {
      const t = step / 5
      const current = new THREE.Vector3(
        side * (.08 + t * (.34 + branch * .025)) + Math.sin(t * 4.7 + branch) * .045,
        -.18 + t * (.48 + branch * .035),
        Math.cos(t * 3.8 + branch * .9) * (.08 + t * .20),
      )
      points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function StellarMemory({ node, index, active, reducedMotion, onSelect }: { node: LifeMapNode; index: number; active: boolean; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const root = useRef<THREE.Group>(null)
  const point = useMemo(() => lifeMapLocalPoint(node, index), [node, index])
  const seed = useMemo(() => nodeSeed(node), [node])
  const motes = useMemo(() => memoryMotes(node, active), [node, active])
  const filaments = useMemo(() => memoryFilamentGeometry(seed), [seed])
  useEffect(() => () => { motes.dispose(); filaments.dispose() }, [motes, filaments])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const pulse = 1 + Math.sin(clock.elapsedTime * .46 + (seed % 1000) * .013) * (active ? .026 : .011)
    root.current.scale.setScalar(pulse)
    root.current.rotation.y = Math.sin(clock.elapsedTime * .07 + (seed % 29)) * .035
  })
  const core = active ? 2.0 : .23
  const aura = new THREE.Color(node.aura)
  const warmCore = aura.clone().lerp(new THREE.Color('#f3e5c9'), .52).getStyle()
  return <group ref={root} position={point} renderOrder={120} name={`life-map-v323-memory-star-${node.id}`} userData={{ visualOnly: false, interactionOwner: true, presentation: 'stellar-point-photosphere-layered-corona', goldMasterRevision: 'v323-life-map-to-focus-memory-star-continuity' }}>
    <mesh
      name={`life-map-v323-memory-star-hit-${node.id}`}
      onClick={(event) => { event.stopPropagation(); onSelect(node) }}
      onPointerOver={(event) => { event.stopPropagation(); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { document.body.style.cursor = '' }}
    >
      <sphereGeometry args={[active ? 2.55 : .52, 24, 18]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
    <mesh renderOrder={124} raycast={() => null}>
      <sphereGeometry args={[core * 1.02, 32, 24]} />
      <meshBasicMaterial color={warmCore} transparent opacity={active ? .96 : .84} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <group rotation={[.22 + seeded(seed, 2) * .30, -.35 + seeded(seed, 3) * .70, .15 + seeded(seed, 4) * .40]}>
      <mesh position={[-core * .42, core * .18, 0]} scale={[1.28, .78, .58]} renderOrder={123} raycast={() => null}>
        <sphereGeometry args={[core, 24, 16]} />
        <meshBasicMaterial color={warmCore} transparent opacity={active ? .98 : .90} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[core * .40, -core * .10, core * .08]} scale={[.82, 1.20, .54]} renderOrder={123} raycast={() => null}>
        <sphereGeometry args={[core * .88, 24, 16]} />
        <meshBasicMaterial color={node.aura} transparent opacity={active ? .88 : .76} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh position={[0, -core * .42, -core * .08]} scale={[.54, 1.38, .46]} renderOrder={122} raycast={() => null}>
        <sphereGeometry args={[core * .72, 20, 14]} />
        <meshBasicMaterial color={warmCore} transparent opacity={active ? .62 : .42} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
    <mesh renderOrder={121} scale={active ? [3.4,3.0,2.6] : [4.6,3.6,3.0]} rotation={[.35,-.2,.4]} raycast={() => null}>
      <sphereGeometry args={[core, 18, 12]} />
      <meshBasicMaterial color={node.aura} transparent opacity={active ? .075 : .038} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <lineSegments renderOrder={124} geometry={filaments} raycast={() => null}>
      <lineBasicMaterial color={warmCore} transparent opacity={active ? .34 : .12} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} />
    </lineSegments>
    <points renderOrder={125} geometry={motes} raycast={() => null}>
      <pointsMaterial vertexColors size={active ? .085 : .030} transparent opacity={active ? .78 : .50} depthTest={false} depthWrite={false} sizeAttenuation />
    </points>
    <pointLight color={node.aura} intensity={active ? 4.6 : .72} distance={active ? 14 : 4.5} decay={2} />
  </group>
}

export function LifeMapStellarField({ nodes, selected, reducedMotion, onSelect }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(depthGeometry, [])
  const continuity = useMemo(homeSkyContinuityGeometry, [])
  const chapterClouds = useMemo(() => chapterCloudGeometry(nodes), [nodes])
  const threads = useMemo(galaxyThreadsGeometry, [])
  useEffect(() => () => { geometry.dispose(); continuity.dispose(); chapterClouds.dispose(); threads.dispose() }, [chapterClouds, continuity, geometry, threads])
  useFrame(({ clock }) => {
    if (root.current && !reducedMotion) {
      root.current.rotation.z = Math.sin(clock.elapsedTime * .010) * .004
      root.current.rotation.y = Math.sin(clock.elapsedTime * .006) * .006
    }
  })
  return <group name="life-map-v323-stellar-visual-authority" userData={{ visualOnly: false, interactionOwner: true, visualRepair: 'dense-layered-clustered-living-galaxy-memory-star-owner', goldMasterRevision: 'v323-layered-personal-galaxy-no-planets-no-rings' }}>
    <points geometry={continuity} name="life-map-home-sky-continuity-anchors" raycast={() => null} renderOrder={116} userData={{ continuitySeed: HOME_SKY_CONTINUITY_SEED, precursorCount: HOME_SKY_PRECURSOR_COUNT, revealedFromHome: true }}>
      <pointsMaterial vertexColors size={.075} transparent opacity={.62} depthWrite={false} sizeAttenuation />
    </points>
    <points ref={root} geometry={geometry} name="life-map-v323-deep-personal-galaxy" raycast={() => null}>
      <pointsMaterial vertexColors size={.070} transparent opacity={.78} depthWrite={false} sizeAttenuation />
    </points>
    <points geometry={chapterClouds} name="life-map-v323-memory-cluster-nebulae" raycast={() => null} renderOrder={118}>
      <pointsMaterial vertexColors size={.095} transparent opacity={.54} blending={THREE.AdditiveBlending} depthWrite={false} sizeAttenuation />
    </points>
    <lineSegments geometry={threads} name="life-map-v3-memory-atmospheric-currents" raycast={() => null}>
      <lineBasicMaterial color="#b8cad9" transparent opacity={.055} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
    {nodes.map((node, index) => <StellarMemory key={node.id} node={node} index={index} active={selected?.id === node.id} reducedMotion={reducedMotion} onSelect={onSelect} />)}
  </group>
}
