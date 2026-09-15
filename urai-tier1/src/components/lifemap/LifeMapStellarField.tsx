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

function nodeSeed(node: LifeMapNode, index: number) {
  return node.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 37
}

function depthGeometry() {
  const deepCount = 1200
  const nearCount = 760
  const count = deepCount + nearCount
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#d7f2ff')
  const warm = new THREE.Color('#ffe5b5')
  const violet = new THREE.Color('#ddd4ff')
  const jade = new THREE.Color('#b7eadf')

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
    const base = index % 13 === 0 ? warm : index % 8 === 0 ? violet : index % 11 === 0 ? jade : cool
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

function memoryMotes(node: LifeMapNode, index: number, active: boolean) {
  const seed = nodeSeed(node, index)
  const count = active ? 72 : 30
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const aura = new THREE.Color(node.aura)
  const white = new THREE.Color('#fffaf0')
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

function memoryRayGeometry(seed: number) {
  const points: THREE.Vector3[] = []
  for (let ray = 0; ray < 6; ray += 1) {
    const angle = ray / 6 * Math.PI * 2 + seed * .13
    const start = new THREE.Vector3(Math.cos(angle) * .22, Math.sin(angle * .7) * .11, Math.sin(angle) * .22)
    const end = new THREE.Vector3(Math.cos(angle) * (1.05 + (ray % 2) * .22), Math.sin(angle * 1.3) * .52, Math.sin(angle) * (1.05 + (ray % 3) * .14))
    points.push(start, end)
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function StellarMemory({ node, index, active, reducedMotion }: { node: LifeMapNode; index: number; active: boolean; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const point = useMemo(() => lifeMapLocalPoint(node, index), [node, index])
  const motes = useMemo(() => memoryMotes(node, index, active), [node, index, active])
  const rays = useMemo(() => memoryRayGeometry(nodeSeed(node, index)), [node, index])
  useEffect(() => () => { motes.dispose(); rays.dispose() }, [motes, rays])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const pulse = 1 + Math.sin(clock.elapsedTime * .54 + index * .83) * (active ? .032 : .015)
    root.current.scale.setScalar(pulse)
    if (active) root.current.rotation.z = Math.sin(clock.elapsedTime * .12) * .018
  })
  const core = active ? .31 : .145
  return <group ref={root} position={point} renderOrder={120} name={`life-map-v259-stellar-memory-${node.id}`} userData={{ visualOnly: true, interactionOwner: false, presentation: 'white-hot-memory-star-over-semantic-hit-target', goldMasterRevision: 'v280-depth-bearing-memory-star' }} raycast={() => null}>
    <mesh renderOrder={123} raycast={() => null}>
      <sphereGeometry args={[core, 28, 20]} />
      <meshBasicMaterial color="#fffdf7" depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={122} scale={active ? 3.4 : 3.05} raycast={() => null}>
      <sphereGeometry args={[core, 22, 16]} />
      <meshBasicMaterial color={node.aura} transparent opacity={active ? .38 : .25} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh renderOrder={121} scale={active ? 6.8 : 5.9} raycast={() => null}>
      <sphereGeometry args={[core, 18, 12]} />
      <meshBasicMaterial color={node.aura} transparent opacity={active ? .12 : .065} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
    <lineSegments renderOrder={124} geometry={rays} raycast={() => null}>
      <lineBasicMaterial color={node.aura} transparent opacity={active ? .24 : .10} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} />
    </lineSegments>
    <points renderOrder={125} geometry={motes} raycast={() => null}>
      <pointsMaterial vertexColors size={active ? .060 : .036} transparent opacity={active ? .90 : .61} depthTest={false} depthWrite={false} sizeAttenuation />
    </points>
    {active ? <>
      <mesh rotation={[Math.PI / 2.8, .35, .12]} renderOrder={120} raycast={() => null}>
        <torusGeometry args={[.88,.012,8,96]} />
        <meshBasicMaterial color={node.aura} transparent opacity={.30} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false}/>
      </mesh>
      <mesh rotation={[Math.PI / 2.2,-.48,-.18]} scale={1.32} renderOrder={120} raycast={() => null}>
        <torusGeometry args={[.88,.008,8,96]} />
        <meshBasicMaterial color="#fff1d6" transparent opacity={.16} blending={THREE.AdditiveBlending} depthTest={false} depthWrite={false} toneMapped={false}/>
      </mesh>
    </> : null}
    <pointLight color={node.aura} intensity={active ? 4.6 : 1.18} distance={active ? 11.5 : 5.8} decay={2} />
  </group>
}

export function LifeMapStellarField({ nodes, selected, reducedMotion }: { nodes: LifeMapNode[]; selected: LifeMapNode | null; reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(depthGeometry, [])
  const continuity = useMemo(homeSkyContinuityGeometry, [])
  const threads = useMemo(galaxyThreadsGeometry, [])
  useEffect(() => () => { geometry.dispose(); continuity.dispose(); threads.dispose() }, [continuity, geometry, threads])
  useFrame(({ clock }) => {
    if (root.current && !reducedMotion) {
      root.current.rotation.z = Math.sin(clock.elapsedTime * .010) * .004
      root.current.rotation.y = Math.sin(clock.elapsedTime * .006) * .006
    }
  })
  return <group name="life-map-v259-stellar-visual-authority" userData={{ visualOnly: true, interactionOwner: false, visualRepair: 'memory-stars-visually-authoritative-over-semantic-geology', goldMasterRevision: 'v280-layered-personal-galaxy-depth' }} raycast={() => null}>
    <points geometry={continuity} name="life-map-home-sky-continuity-anchors" raycast={() => null} renderOrder={116} userData={{ continuitySeed: HOME_SKY_CONTINUITY_SEED, precursorCount: HOME_SKY_PRECURSOR_COUNT, revealedFromHome: true }}>
      <pointsMaterial vertexColors size={.066} transparent opacity={.62} depthWrite={false} sizeAttenuation />
    </points>
    <points ref={root} geometry={geometry} name="life-map-v259-deep-personal-galaxy" raycast={() => null}>
      <pointsMaterial vertexColors size={.060} transparent opacity={.80} depthWrite={false} sizeAttenuation />
    </points>
    <lineSegments geometry={threads} name="life-map-v280-memory-constellation-currents" raycast={() => null}>
      <lineBasicMaterial color="#afcfd5" transparent opacity={.055} blending={THREE.AdditiveBlending} depthWrite={false} />
    </lineSegments>
    {nodes.map((node, index) => <StellarMemory key={node.id} node={node} index={index} active={selected?.id === node.id} reducedMotion={reducedMotion} />)}
  </group>
}
