'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { LifeMapNode } from './lifeMapData'
import { lifeMapLocalPoint, lifeMapStage, lifeMapTerrainHeight } from './lifeMapSpatialLayout'
import type { LifeMapJourneyPhase } from './LifeMapProductionWorld'

type Props = { nodes: LifeMapNode[]; selected: LifeMapNode | null; phase: LifeMapJourneyPhase; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void }
type Point3 = [number, number, number]
type RaycastFn = THREE.Object3D['raycast']
type FamilyPart = { geometry: THREE.BufferGeometry; position: Point3; rotation: Point3; scale: Point3; opacity?: number }

const RETIRED_VISUAL_GROUPS = new Set([
  'life-map-v237-weathered-valley-floor',
  'life-map-v237-worn-lineage-path',
  'life-map-memory-artifact-families',
  'life-map-curved-semantic-paths',
  'life-map-authored-chapter-regions',
  'life-map-selected-arrival-sanctuary',
  'life-map-foreground-observatory',
  'life-map-relationship-observatory',
  'life-map-goal-horizon',
  'life-map-achievement-monument',
])

const FAMILY_BASE: Record<LifeMapNode['type'], string> = {
  memory: '#7f9588', season: '#789289', ritual: '#958777', forecast: '#69868e', threshold: '#957984', relationship: '#879294', recovery: '#789087', legacy: '#80766d',
}

function seeded(seed: number, salt: number) { const value = Math.sin(seed * 91.317 + salt * 17.731) * 43758.5453123; return value - Math.floor(value) }
function nodeSeed(node: LifeMapNode, index: number) { return node.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0) + index * 37 }

function stoneGeometry(seed: number) {
  const geometry = new THREE.IcosahedronGeometry(1, 3)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const point = new THREE.Vector3()
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index)
    const direction = point.clone().normalize()
    const grain = 1 + .075 * Math.sin(direction.x * 5.7 + direction.z * 4.1 + seed * .013) + .035 * Math.sin(direction.y * 11.2 - direction.x * 7.4 + seed * .021)
    point.multiplyScalar(grain); position.setXYZ(index, point.x, point.y, point.z)
  }
  position.needsUpdate = true; geometry.computeVertexNormals(); return geometry
}

function memoryBody(seed: number, aura: string, active: boolean) {
  const geometry = new THREE.SphereGeometry(1, 48, 36)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color('#2e4641'), mid = new THREE.Color('#86a39a'), warm = new THREE.Color('#e4c39e'), accent = new THREE.Color(aura)
  const asymmetry = (seeded(seed, 33) - .5) * .18
  for (let index = 0; index < position.count; index += 1) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index), angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.05, .92), lower = THREE.MathUtils.smoothstep(-ny, .10, .98)
    const cleft = Math.exp(-(((nx + asymmetry) / .30) ** 2)) * THREE.MathUtils.smoothstep(ny, .24, .96)
    const lobeA = Math.exp(-(((nx + .38 + asymmetry) / .48) ** 2 + ((ny - .40) / .56) ** 2)), lobeB = Math.exp(-(((nx - .34 + asymmetry) / .50) ** 2 + ((ny - .34) / .58) ** 2))
    const skin = .026 * Math.sin(angle * 4.6 + ny * 7.1 + seed * .017) + .012 * Math.sin(angle * 9.3 - ny * 11.0)
    const taper = THREE.MathUtils.lerp(.42, 1, THREE.MathUtils.smoothstep(ny, -.96, .12))
    let x = nx * (.70 + .04 * (seed % 4)) * taper * (1 + skin + .04 * lobeA + .025 * lobeB)
    let z = nz * (.57 + .025 * ((seed + 2) % 4)) * taper * (1 + skin * .55)
    let y = ny * (active ? .86 : .82) + .035 * lobeA + .022 * lobeB - .10 * cleft - lower * .14
    x += upper * (.05 + asymmetry * .10)
    const twist = (ny + .12) * (.11 + (seeded(seed, 12) - .5) * .16), cos = Math.cos(twist), sin = Math.sin(twist)
    const tx = x * cos - z * sin, tz = x * sin + z * cos
    position.setXYZ(index, tx, y, tz)
    const altitude = THREE.MathUtils.clamp((y + 1.05) / 2.1, 0, 1), fissure = THREE.MathUtils.clamp(cleft * .58 + Math.abs(skin) * 4.6, 0, 1)
    const color = deep.clone().lerp(mid, .34 + .44 * altitude).lerp(warm, .12 + .18 * upper).lerp(accent, (active ? .10 : .075) + fissure * (active ? .13 : .10))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  position.needsUpdate = true; geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geometry.computeVertexNormals(); return geometry
}

function tube(points: Point3[], radius: number) { return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(point => new THREE.Vector3(...point))), 24, radius, 7, false) }

function semanticFamilyParts(node: LifeMapNode, seed: number, active: boolean): FamilyPart[] {
  const stone = () => stoneGeometry(seed + Math.floor(seeded(seed, 91) * 997))
  if (node.type === 'memory') return [{ geometry: memoryBody(seed, node.aura, active), position: [0, 0, 0], rotation: [0, -.16, 0], scale: [.82, .95, .72] }]
  if (node.type === 'season') {
    const arc = Array.from({ length: 9 }, (_, index) => { const t = index / 8, angle = THREE.MathUtils.lerp(-1.25, 1.05, t); return [Math.sin(angle) * .72, -.18 + Math.sin(t * Math.PI) * .42, Math.cos(angle) * .52 - .20] as Point3 })
    return [{ geometry: tube(arc, .055), position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, { geometry: stone(), position: [-.46, -.34, .05], rotation: [0, .4, -.08], scale: [.34, .24, .48] }]
  }
  if (node.type === 'ritual') return [
    { geometry: stoneGeometry(seed + 1), position: [0, -.34, 0], rotation: [0, .2, 0], scale: [.58, .24, .48] },
    { geometry: stoneGeometry(seed + 2), position: [.04, -.05, -.03], rotation: [.04, -.38, .08], scale: [.43, .20, .34] },
    { geometry: stoneGeometry(seed + 3), position: [-.03, .19, -.02], rotation: [-.05, .31, -.04], scale: [.28, .17, .25] },
  ]
  if (node.type === 'forecast') {
    const left = tube([[-.34, -.34, .20], [-.18, -.02, -.05], [-.05, .25, -.36], [.06, .45, -.72]], .035)
    const right = tube([[.10, -.30, .18], [.22, -.04, -.10], [.34, .20, -.42], [.46, .37, -.78]], .027)
    return [
      { geometry: stone(), position: [-.12, -.37, .18], rotation: [0, .2, 0], scale: [.38, .20, .50], opacity: node.locked ? .62 : .92 },
      { geometry: left, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: node.locked ? .56 : .86 },
      { geometry: right, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: node.locked ? .45 : .74 },
    ]
  }
  if (node.type === 'threshold') return [
    { geometry: stoneGeometry(seed + 11), position: [-.25, -.03, 0], rotation: [.02, -.12, -.16], scale: [.25, .78, .30] },
    { geometry: stoneGeometry(seed + 12), position: [.28, -.10, -.05], rotation: [-.02, .16, .14], scale: [.27, .70, .32] },
  ]
  if (node.type === 'relationship') {
    const bridge = tube([[-.42, -.05, 0], [-.18, .20, -.08], [.18, .18, -.10], [.44, -.02, -.02]], .035)
    return [
      { geometry: stoneGeometry(seed + 21), position: [-.42, -.22, .02], rotation: [0, -.3, .05], scale: [.42, .38, .38] },
      { geometry: stoneGeometry(seed + 22), position: [.46, -.20, -.03], rotation: [.02, .32, -.04], scale: [.34, .32, .42] },
      { geometry: bridge, position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1], opacity: .76 },
    ]
  }
  if (node.type === 'recovery') {
    const branches = [-1, 0, 1].map((side, branch) => ({ geometry: tube([[0, -.34, 0], [side * .10, -.06, -.03], [side * (.24 + branch * .025), .20, -.10 - branch * .05], [side * (.34 + branch * .035), .42 + branch * .05, -.16 - branch * .08]], .032 - branch * .004), position: [0, 0, 0] as Point3, rotation: [0, 0, 0] as Point3, scale: [1, 1, 1] as Point3 }))
    return [{ geometry: stone(), position: [0, -.34, 0], rotation: [0, .2, 0], scale: [.52, .24, .54] }, ...branches]
  }
  const spiralPoints = Array.from({ length: 15 }, (_, index) => { const t = index / 14, angle = t * Math.PI * 3.15, radius = .12 + t * .48; return [Math.cos(angle) * radius, -.32 + t * .62, Math.sin(angle) * radius * .58] as Point3 })
  return [{ geometry: tube(spiralPoints, .038), position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, { geometry: stone(), position: [0, -.38, .02], rotation: [0, -.2, 0], scale: [.64, .20, .62] }]
}

function motesGeometry(seed: number, active: boolean) {
  const count = active ? 10 : 5, positions = new Float32Array(count * 3)
  for (let index = 0; index < count; index += 1) { const angle = index * 2.39996323 + seeded(seed, index) * .5, radius = .24 + Math.sqrt((index + .5) / count) * (active ? .68 : .42); positions.set([Math.cos(angle) * radius, -.08 + seeded(seed + index, 17) * (active ? .70 : .42), Math.sin(angle) * radius * .62], index * 3) }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); return geometry
}

function authoredTerrainGeometry() {
  const columns = 112, rows = 156, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const shadow = new THREE.Color('#34433f'), earth = new THREE.Color('#66776d'), moss = new THREE.Color('#88998d'), history = new THREE.Color('#927f70'), highlight = new THREE.Color('#b9c3ae')
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows, z = 7 - v * 47
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns, x = -15 + u * 30, y = lifeMapTerrainHeight(x, z)
      positions.push(x, y + .035, z)
      const age = THREE.MathUtils.clamp((-z + 4) / 45, 0, 1), exposed = THREE.MathUtils.clamp((y + 4.4) / 2.4, 0, 1), stain = .5 + .5 * Math.sin(x * .43 - z * .31) * Math.cos(x * .79 + z * .17), micro = .5 + .5 * Math.sin(x * 1.73 + z * .97) * Math.sin(z * .61 - x * .47), relief = THREE.MathUtils.clamp((y + 4.9) / 3.2, 0, 1)
      const color = shadow.clone().lerp(earth, .42 + exposed * .34).lerp(moss, .10 + stain * .18).lerp(history, .05 + age * .14).lerp(highlight, micro * .06 + relief * .08); colors.push(color.r, color.g, color.b)
    }
  }
  const stride = columns + 1
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) { const a = row * stride + column, b = a + 1, c = a + stride, d = c + 1; if ((row + column) % 2) indices.push(a, c, b, b, c, d); else indices.push(a, c, d, a, d, b) }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}

function trailGeometry() {
  const rows = 130, positions: number[] = [], colors: number[] = [], indices: number[] = [], earth = new THREE.Color('#625f50'), worn = new THREE.Color('#c6a981')
  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows, z = 6 - t * 44, center = .46 * Math.sin((z + 4) * .14), width = .26 + .06 * Math.sin(t * Math.PI * 4.4)
    for (const side of [-1, 1] as const) { const x = center + side * width, y = lifeMapTerrainHeight(x, z) + .07; positions.push(x, y, z); const color = earth.clone().lerp(worn, .46 + .24 * (1 - t)); colors.push(color.r, color.g, color.b) }
  }
  for (let row = 0; row < rows; row += 1) { const a = row * 2, b = a + 1, c = a + 2, d = c + 1; indices.push(a, c, b, b, c, d) }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}

function RetireRejectedLifeMapVisuals() {
  const { scene } = useThree(), hidden = useRef(new Set<THREE.Object3D>()), raycasts = useRef(new Map<THREE.Object3D, RaycastFn>())
  useFrame(() => { scene.traverse(object => { if (!RETIRED_VISUAL_GROUPS.has(object.name) || !object.visible) return; object.visible = false; if (!raycasts.current.has(object)) raycasts.current.set(object, object.raycast); object.raycast = () => undefined; object.traverse(child => { if (!raycasts.current.has(child)) raycasts.current.set(child, child.raycast); child.raycast = () => undefined }); hidden.current.add(object) }) })
  useEffect(() => () => { hidden.current.forEach(object => { object.visible = true }); raycasts.current.forEach((raycast, object) => { object.raycast = raycast }); hidden.current.clear(); raycasts.current.clear() }, [])
  return null
}

function MemoryPlace({ node, index, active, reducedMotion, onSelect, arrival }: { node: LifeMapNode; index: number; active: boolean; reducedMotion: boolean; onSelect: (node: LifeMapNode) => void; arrival: boolean }) {
  const root = useRef<THREE.Group>(null), seed = nodeSeed(node, index), point = useMemo<Point3>(() => lifeMapLocalPoint(node, index), [index, node])
  const parts = useMemo(() => semanticFamilyParts(node, seed, active), [active, node, seed]), motes = useMemo(() => motesGeometry(seed, active), [active, seed])
  useEffect(() => () => { parts.forEach(part => part.geometry.dispose()); motes.dispose() }, [motes, parts])
  useFrame(({ clock }) => { if (!root.current || reducedMotion) return; root.current.rotation.y = (seeded(seed, 22) - .5) * .34 + Math.sin(clock.elapsedTime * .12 + seed) * .010 })
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(node) }
  const scale = active ? (arrival ? .84 : .78) : .68, lift = active ? (arrival ? .50 : .40) : .26
  return <group position={point} name={`life-map-v256-memory-place-${node.id}`} userData={{ artRevision: 'v256-semantic-memory-families', semanticFamily: node.type, semanticNode: node.id }} onClick={activate}>
    <group ref={root} position={[0, lift, 0]} scale={scale}>
      {parts.map((part, partIndex) => <mesh key={partIndex} geometry={part.geometry} position={part.position} rotation={part.rotation} scale={part.scale} castShadow receiveShadow><meshStandardMaterial vertexColors={node.type === 'memory'} color={node.type === 'memory' ? '#ffffff' : FAMILY_BASE[node.type]} emissive={node.aura} emissiveIntensity={active ? .09 : .035} roughness={.82} metalness={0} transparent={(part.opacity ?? 1) < 1} opacity={part.opacity ?? 1} /></mesh>)}
      <points geometry={motes} raycast={() => null}><pointsMaterial color={node.aura} size={active ? .028 : .021} transparent opacity={active ? .30 : .18} depthWrite={false} sizeAttenuation /></points>
      <pointLight position={[0, .32, .24]} color={node.aura} intensity={active ? .32 : .10} distance={active ? 4.4 : 2.8} decay={2} />
    </group>
  </group>
}

function TerritoryMarker({ node, index }: { node: LifeMapNode; index: number }) {
  const point = useMemo<Point3>(() => lifeMapLocalPoint(node, index), [index, node]), geometry = useMemo(() => stoneGeometry(nodeSeed(node, index) + 701), [index, node])
  useEffect(() => () => geometry.dispose(), [geometry]); const variation = .86 + seeded(nodeSeed(node, index), 703) * .32
  return <mesh geometry={geometry} position={[point[0], point[1] - .78, point[2] - .18]} scale={[1.02 * variation, .42, 1.18 * variation]} rotation={[0, seeded(nodeSeed(node, index), 704) * Math.PI, 0]} raycast={() => null} receiveShadow name={`life-map-v256-chapter-landmark-${node.eraId || node.id}`} userData={{ visualOnly: true, interactionOwner: false, chapterLandmark: true }}><meshStandardMaterial color="#607067" emissive={node.aura} emissiveIntensity={.028} roughness={.94} metalness={0} /></mesh>
}

function SelectedSanctuary({ node, index, reducedMotion }: { node: LifeMapNode; index: number; reducedMotion: boolean }) {
  const point = useMemo<Point3>(() => lifeMapLocalPoint(node, index), [index, node])
  const branches = useMemo(() => Array.from({ length: 3 }, (_, branch) => { const side = branch % 2 ? -1 : 1, offset = Math.floor(branch / 2); return tube([[side * (1.48 + offset * .16), -.40, -1.12 - offset * .18], [side * (1.10 + offset * .10), -.18, -.72], [side * (.72 + offset * .06), .12, -.24], [side * (.46 + offset * .04), .44, .08]], .010 + (branch % 2) * .0015) }), [])
  useEffect(() => () => branches.forEach(geometry => geometry.dispose()), [branches])
  return <group position={[point[0], point[1] - .02, point[2]]} name="life-map-v256-contextual-memory-sanctuary" userData={{ visualOnly: true, interactionOwner: false, scaleMode: 'intimate-with-context', arrivalMeaning: 'inside-history-not-node-zoom' }}>
    {branches.map((geometry, branch) => <mesh key={branch} geometry={geometry} raycast={() => null}><meshStandardMaterial color={branch % 2 ? node.aura : '#c8b38e'} emissive={node.aura} emissiveIntensity={.07} roughness={.82} transparent opacity={reducedMotion ? .20 : .26} /></mesh>)}
    <pointLight position={[-.76, .52, .54]} color={node.aura} intensity={.30} distance={4.6} decay={2} /><pointLight position={[.92, .34, -.58]} color="#ddb184" intensity={.12} distance={3.6} decay={2} />
  </group>
}

export function LifeMapGoldMasterOverlay({ nodes, selected, phase, reducedMotion, onSelect }: Props) {
  const { size } = useThree(), portrait = size.height > size.width, stage = lifeMapStage(Boolean(selected), portrait)
  const terrain = useMemo(authoredTerrainGeometry, []), trail = useMemo(trailGeometry, [])
  useEffect(() => () => { terrain.dispose(); trail.dispose() }, [terrain, trail])
  const selectedIndex = selected ? Math.max(0, nodes.findIndex(node => node.id === selected.id)) : -1, arrival = Boolean(selected && phase === 'arrival')
  const territories = useMemo(() => { const seen = new Set<string>(), result: { node: LifeMapNode; index: number }[] = []; nodes.forEach((node, index) => { const key = node.eraId || node.id; if (!seen.has(key)) { seen.add(key); result.push({ node, index }) } }); return result }, [nodes])
  return <><RetireRejectedLifeMapVisuals /><group name="life-map-v249-personal-universe-geography" scale={stage.scale} position={stage.position} userData={{ artRevision: 'v256-authored-personal-universe', visualRepair: 'semantic-families-authored-geology-deliberate-portrait-composition' }}>
    <mesh geometry={terrain} receiveShadow castShadow name="life-map-v256-authored-memory-terrain" userData={{ visualAuthority: 'authored-chapter-geography', topology: 'continuous-explorable-world' }}><meshStandardMaterial vertexColors color="#c7d0c2" emissive="#273a33" emissiveIntensity={.16} roughness={.92} metalness={0} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={trail} receiveShadow name="life-map-v256-worn-lineage-footpath"><meshStandardMaterial vertexColors color="#d1ba96" emissive="#6c513b" emissiveIntensity={.07} roughness={.90} /></mesh>
    <group name="life-map-v256-authored-chapter-territories" userData={{ visualOnly: true, interactionOwner: false }}>{territories.map(({ node, index }) => <TerritoryMarker key={node.eraId || node.id} node={node} index={index} />)}</group>
    <group name="life-map-v249-grounded-memory-places" userData={{ visualRepair: 'all-sites-remain-grounded-geography-selected-site-rises-without-isolating-context', semanticFamilies: 'memory-season-ritual-forecast-threshold-relationship-recovery-legacy' }}>{nodes.map((node, index) => <MemoryPlace key={node.id} node={node} index={index} active={selected?.id === node.id} arrival={arrival} reducedMotion={reducedMotion} onSelect={onSelect} />)}</group>
    {arrival && selected ? <SelectedSanctuary node={selected} index={selectedIndex} reducedMotion={reducedMotion} /> : null}
  </group></>
}
