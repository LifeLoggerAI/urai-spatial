'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage, lifeMapTerrainHeight } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'

type Point3 = [number, number, number]

type Props = {
  nodes: LifeMapNode[]
  selected: LifeMapNode | null
  phase: LifeMapJourneyPhase
  reducedMotion: boolean
  onSelect: (node: LifeMapNode) => void
}

const RETIRED_VISUAL_GROUPS = new Set([
  'life-map-v237-worn-lineage-path',
  'life-map-memory-artifact-families',
  'life-map-curved-semantic-paths',
  'life-map-authored-chapter-regions',
  'life-map-selected-arrival-sanctuary',
])

function seeded(seed: number, salt: number) {
  const value = Math.sin(seed * 91.317 + salt * 17.731) * 43758.5453123
  return value - Math.floor(value)
}

function nodeSeed(node: LifeMapNode, index: number) {
  return node.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 37
}

function weatheredOutcropGeometry(seed: number, accent: string, active: boolean) {
  const columns = 34
  const rows = 26
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const deep = new THREE.Color('#172824')
  const mineral = new THREE.Color('#64766c')
  const memory = new THREE.Color(accent)
  const family = seed % 5
  const skew = (seeded(seed, 4) - .5) * .42
  const lobeAX = -.34 + (seeded(seed, 5) - .5) * .22
  const lobeAZ = -.10 + (seeded(seed, 6) - .5) * .22
  const lobeBX = .34 + (seeded(seed, 7) - .5) * .24
  const lobeBZ = .14 + (seeded(seed, 8) - .5) * .26

  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    const z0 = -1.02 + v * 2.04
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x0 = -1.42 + u * 2.84
      const edge = Math.pow(Math.sin(Math.PI * u) * Math.sin(Math.PI * v), .72)
      const x = x0 + .09 * Math.sin(z0 * 3.1 + seed * .13) * edge + skew * z0 * .15
      const z = z0 + .07 * Math.sin(x0 * 4.7 - seed * .09) * edge
      const a = Math.exp(-(((x - lobeAX) / (.68 + family * .035)) ** 2 + ((z - lobeAZ) / (.50 + (4 - family) * .028)) ** 2))
      const b = Math.exp(-(((x - lobeBX) / (.62 + (4 - family) * .032)) ** 2 + ((z - lobeBZ) / (.58 + family * .024)) ** 2))
      const ridge = .5 + .5 * Math.sin(x * (2.2 + family * .27) + z * (3.5 - family * .18) + seed * .17)
      const cleft = Math.exp(-((x * .95 + z * (.22 + family * .045) - .05) ** 2) / .055) * Math.exp(-(x * x + z * z) / 1.65)
      const weather = .055 * Math.sin(x * 8.3 + z * 5.6 + seed) + .028 * Math.cos(x * 13.1 - z * 9.4)
      const relief = edge * ((active ? .16 : .11) + .47 * a + .35 * b + .12 * ridge - .18 * cleft) + weather * edge
      const y = -.61 + relief
      positions.push(x, y, z)
      const peak = THREE.MathUtils.clamp((relief + .08) / .78, 0, 1)
      const scar = THREE.MathUtils.clamp(cleft * .55 + ridge * .14, 0, 1)
      const color = deep.clone().lerp(mineral, .22 + .48 * peak).lerp(memory, (active ? .24 : .09) + scar * (active ? .18 : .08))
      colors.push(color.r, color.g, color.b)
    }
  }

  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column
    const b = a + 1
    const c = a + stride
    const d = c + 1
    if ((row + column + seed) % 2) indices.push(a, c, b, b, c, d)
    else indices.push(a, c, d, a, d, b)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function wornLineageTrailGeometry() {
  const rows = 150
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const earth = new THREE.Color('#303a34')
  const worn = new THREE.Color('#665a49')
  const lichen = new THREE.Color('#55645b')
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows
    const z = 6.2 - t * 44.9
    const center = .58 * Math.sin((z + 5.5) * .17) + .18 * Math.sin(z * .51)
    const irregular = .035 * Math.sin(row * 1.91) + .025 * Math.sin(row * .47)
    const width = .31 + .12 * (1 - t) + .07 * Math.sin(t * Math.PI * 7.2) + irregular
    for (const side of [-1, 1] as const) {
      const edgeNoise = .055 * Math.sin(row * 2.37 + side * 1.4)
      const x = center + side * Math.max(.20, width + edgeNoise)
      const y = lifeMapTerrainHeight(x, z) + .032 + .012 * Math.sin(row * 1.7 + side)
      positions.push(x, y, z)
      const age = .5 + .5 * Math.sin(t * 17.3 + side * .8)
      const color = earth.clone().lerp(worn, .28 + age * .18).lerp(lichen, .10 + .10 * (1 - t))
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < rows; row += 1) {
    const a = row * 2
    const b = a + 1
    const c = a + 2
    const d = a + 3
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function selectedSanctuaryGround(point: Point3, accent: string) {
  const columns = 42
  const rows = 36
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const shadow = new THREE.Color('#172620')
  const stone = new THREE.Color('#53645a')
  const history = new THREE.Color(accent)
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    const z = -4.3 + v * 8.6
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x = -5.1 + u * 10.2
      const radius = Math.hypot(x / 5.1, z / 4.3)
      const edge = THREE.MathUtils.smoothstep(radius, .42, 1.04)
      const bank = edge * (.38 + .72 * Math.pow(Math.max(0, radius - .42), 1.4))
      const weather = .08 * Math.sin(x * 1.5 + z * .84) + .035 * Math.cos(x * 4.6 - z * 2.7)
      const worldY = lifeMapTerrainHeight(point[0] + x, point[2] + z)
      const y = worldY - point[1] + .055 + bank + weather * edge
      positions.push(x, y, z)
      const color = shadow.clone().lerp(stone, .32 + edge * .42).lerp(history, .035 + .055 * (1 - edge))
      colors.push(color.r, color.g, color.b)
    }
  }
  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column
    const b = a + 1
    const c = a + stride
    const d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function sanctuaryParticles(seed: number) {
  const count = 96
  const positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.39996323 + seeded(seed, index) * .42
    const radius = .9 + Math.sqrt((index + .5) / count) * 3.4
    positions.set([
      Math.cos(angle) * radius,
      -.14 + seeded(seed + index, 18) * 1.35,
      Math.sin(angle) * radius * .72,
    ], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  return geometry
}

function RetireRejectedLifeMapVisuals() {
  const { scene } = useThree()
  useEffect(() => {
    const hidden: THREE.Object3D[] = []
    scene.traverse((object) => {
      if (!RETIRED_VISUAL_GROUPS.has(object.name) || !object.visible) return
      object.visible = false
      hidden.push(object)
    })
    return () => hidden.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function MemoryOutcrop({ node, index, active, reducedMotion, onSelect }: { node: LifeMapNode; index: number; active: boolean; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }) {
  const root = useRef<THREE.Group>(null)
  const seed = nodeSeed(node, index)
  const point = useMemo<Point3>(() => lifeMapLocalPoint(node, index), [index, node])
  const geometry = useMemo(() => weatheredOutcropGeometry(seed, node.aura, active), [active, node.aura, seed])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion || !active) return
    root.current.rotation.y = Math.sin(clock.elapsedTime * .16 + seed) * .018
    const breath = 1 + Math.sin(clock.elapsedTime * .52 + seed * .07) * .008
    root.current.scale.setScalar(breath)
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(node)
  }
  return <group ref={root} position={point} rotation={[0, seeded(seed, 22) * Math.PI * 2, 0]} name={`life-map-v238-memory-site-${node.id}`} userData={{ artRevision: 'v238-ground-integrated-weathered-memory-site', semanticNode: node.id }} onClick={activate}>
    <mesh geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial vertexColors color="#91a297" emissive={node.aura} emissiveIntensity={active ? .10 : .018} roughness={.93} metalness={0} side={THREE.DoubleSide} />
    </mesh>
    <pointLight position={[0,.15,0]} color={node.aura} intensity={active ? 1.65 : .16} distance={active ? 5.8 : 2.4} decay={2} />
  </group>
}

function SelectedSanctuary({ node, index, reducedMotion }: { node: LifeMapNode; index: number; reducedMotion: boolean }) {
  const point = useMemo<Point3>(() => lifeMapLocalPoint(node, index), [index, node])
  const floor = useMemo(() => selectedSanctuaryGround(point, node.aura), [node.aura, point])
  const particles = useMemo(() => sanctuaryParticles(nodeSeed(node, index)), [index, node])
  useEffect(() => () => { floor.dispose(); particles.dispose() }, [floor, particles])
  const glow = reducedMotion ? .34 : .46
  return <group position={point} name="life-map-v238-intimate-memory-sanctuary" userData={{ scaleMode: 'intimate', visualIntent: 'grounded-weathered-memory-place-no-tubes-no-rings' }}>
    <mesh geometry={floor} castShadow receiveShadow>
      <meshStandardMaterial vertexColors color="#7b8b80" emissive="#172a25" emissiveIntensity={.18} roughness={.96} metalness={0} side={THREE.DoubleSide} />
    </mesh>
    <points geometry={particles}>
      <pointsMaterial color={node.aura} size={.032} transparent opacity={glow} depthWrite={false} sizeAttenuation />
    </points>
    <pointLight position={[-1.8,1.2,.8]} color={node.aura} intensity={1.8} distance={7.4} decay={2} />
    <pointLight position={[2.2,.7,-1.5]} color="#d6d0b7" intensity={.72} distance={6.2} decay={2} />
  </group>
}

export function LifeMapGoldMasterOverlay({ nodes, selected, phase, reducedMotion, onSelect }: Props) {
  const { size } = useThree()
  const portrait = size.height > size.width
  const stage = lifeMapStage(Boolean(selected), portrait)
  const trail = useMemo(wornLineageTrailGeometry, [])
  useEffect(() => () => trail.dispose(), [trail])
  const selectedIndex = selected ? Math.max(0, nodes.findIndex((node) => node.id === selected.id)) : -1
  const arrival = Boolean(selected && phase === 'arrival')
  return <>
    <RetireRejectedLifeMapVisuals />
    <group name="life-map-v238-gold-master-world" scale={stage.scale} position={stage.position} userData={{ artRevision: 'v238-weathered-memory-geography-gold-master-candidate' }}>
      <mesh geometry={trail} receiveShadow name="life-map-v238-eroded-lineage-footpath">
        <meshStandardMaterial vertexColors color="#6a6657" roughness={.99} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <group name="life-map-v238-grounded-memory-sites">
        {nodes.map((node, index) => <MemoryOutcrop key={node.id} node={node} index={index} active={selected?.id === node.id} reducedMotion={reducedMotion} onSelect={onSelect} />)}
      </group>
      {arrival && selected ? <SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion} /> : null}
    </group>
  </>
}
