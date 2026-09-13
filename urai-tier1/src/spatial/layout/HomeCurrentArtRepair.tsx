'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type RaycastFn = THREE.Object3D['raycast']

function suppressRaycast(object: THREE.Object3D, store: Map<THREE.Object3D, RaycastFn>) {
  if (!store.has(object)) store.set(object, object.raycast)
  object.raycast = () => undefined
}

function RetireSupersededShapes() {
  const { scene } = useThree()
  const hidden = useRef(new Set<THREE.Object3D>())
  const raycasts = useRef(new Map<THREE.Object3D, RaycastFn>())
  const exact = useMemo(() => new Set([
    'home-v231-ground-weathered-threshold','home-v228-life-map-rooted-branching-threshold',
    'home-current-ground-geological-descent','home-current-life-map-rooted-ascent',
    'home-current-orb-surface-memory','home-current-foreground-geological-breakup',
    'home-current-atmospheric-depth-field','home-v226-ground-inhabited-hearth',
    'home-v226-life-map-lineage-observatory','home-v226-rooted-single-living-memory-presence',
  ]), [])
  useFrame(() => {
    scene.traverse((object) => {
      if (!exact.has(object.name) || !object.visible) return
      object.visible = false
      suppressRaycast(object, raycasts.current)
      object.traverse((child) => suppressRaycast(child, raycasts.current))
      hidden.current.add(object)
    })
  })
  useEffect(() => () => {
    hidden.current.forEach((object) => { object.visible = true })
    raycasts.current.forEach((raycast, object) => { object.raycast = raycast })
    hidden.current.clear(); raycasts.current.clear()
  }, [])
  return null
}

function RetireNearMemoryBankSlabs() {
  const { scene } = useThree()
  const hidden = useRef(new Set<THREE.Object3D>())
  const raycasts = useRef(new Map<THREE.Object3D, RaycastFn>())
  useFrame(() => {
    const group = scene.getObjectByName('home-v226-weathered-memory-banks')
    group?.children.slice(0, 2).forEach((object) => {
      if (!object.visible) return
      object.visible = false
      suppressRaycast(object, raycasts.current)
      object.traverse((child) => suppressRaycast(child, raycasts.current))
      hidden.current.add(object)
    })
  })
  useEffect(() => () => {
    hidden.current.forEach((object) => { object.visible = true })
    raycasts.current.forEach((raycast, object) => { object.raycast = raycast })
    hidden.current.clear(); raycasts.current.clear()
  }, [])
  return null
}

function SuppressLegacyShadowArtifacts() {
  const { scene } = useThree()
  const changed = useRef(new Map<THREE.Mesh, boolean>())
  useFrame(() => {
    for (const groupName of ['home-v229-textured-inhabited-valley-and-distant-ridge','home-v226-weathered-memory-banks']) {
      scene.getObjectByName(groupName)?.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.castShadow) return
        if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
        object.castShadow = false
      })
    }
  })
  useEffect(() => () => { changed.current.forEach((value, object) => { object.castShadow = value }); changed.current.clear() }, [])
  return null
}

function moundGeometry(seed: number, width = 1, depth = 1, heightScale = .24) {
  const geometry = new THREE.SphereGeometry(1, 40, 24)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#332d27'), mineral = new THREE.Color('#746352'), moss = new THREE.Color('#4e6156')
  for (let i = 0; i < position.count; i++) {
    const nx = position.getX(i), ny = position.getY(i), nz = position.getZ(i)
    const radial = Math.sqrt(nx * nx + nz * nz)
    const rough = .06 * Math.sin(nx * 9 + nz * 7 + seed) + .03 * Math.sin(nx * 17 - nz * 11 + seed * .7)
    position.setXYZ(i, nx * width * (1 + rough), -.72 + ny * heightScale - radial * .08, nz * depth * (1 + rough * .7))
    const h = THREE.MathUtils.clamp((ny + 1) * .5, 0, 1)
    const color = deep.clone().lerp(mineral, .24 + .48 * h).lerp(moss, .08 + .10 * (1 - h))
    colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function ScannedRock({ seed, position, scale }: { seed: number; position: [number, number, number]; scale: [number, number, number] }) {
  const geometry = useMemo(() => moundGeometry(seed, scale[0], scale[2], scale[1]), [seed, scale])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position} receiveShadow><meshStandardMaterial vertexColors color="#756452" roughness={1} metalness={0} /></mesh>
}

function wornPathGeometry(length = 3.4, startWidth = .46, endWidth = .22) {
  const segments = 40, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const soil = new THREE.Color('#4d382b'), worn = new THREE.Color('#b58660')
  for (let index = 0; index <= segments; index++) {
    const t = index / segments, z = -.3 + t * length
    const center = .08 * Math.sin(t * 6.2) + .025 * Math.sin(t * 17)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, t) * (1 + .06 * Math.sin(index * 1.51))
    for (const side of [-1, 1] as const) {
      positions.push(center + side * width, -.01 + .006 * Math.sin(index * 1.3), z)
      const color = soil.clone().lerp(worn, .50 + .20 * Math.sin(t * 8 + side))
      colors.push(color.r, color.g, color.b)
    }
    if (index < segments) { const a = index * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, c, b, b, c, d) }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals()
  return geometry
}

function lineageGeometry() {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < 6; branch++) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 18; step++) {
      const t = step / 18, spread = (branch - 2.5) * (.06 + t * .08)
      const current = new THREE.Vector3(spread + Math.sin(t * 5 + branch) * .03, -.18 + t * 1.6, -.72 - t * .44 + Math.cos(t * 4 + branch) * .03)
      if (previous) points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function ascentGeometry() {
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const earth = new THREE.Color('#5c675d'), cool = new THREE.Color('#9ed6cb'), warm = new THREE.Color('#d4b783')
  let base = 0
  for (let branch = 0; branch < 5; branch++) {
    const segments = 18
    for (let step = 0; step <= segments; step++) {
      const t = step / segments, bias = (branch - 2) * (.04 + t * .15), bend = bias + Math.sin(t * 4.1 + branch) * .05
      const centerY = -.14 + t * (1.2 + Math.abs(branch - 2) * .1), centerZ = -.72 - t * .44, width = .13 - t * .075
      for (const side of [-1, 1] as const) {
        positions.push(bend + side * width, centerY, centerZ + side * width * .16)
        const color = earth.clone().lerp(cool, .22 + t * .58).lerp(warm, .07 + .14 * (branch % 2)); colors.push(color.r, color.g, color.b)
      }
    }
    for (let step = 0; step < segments; step++) { const a = base + step * 2, b = a + 1, c = a + 2, d = a + 3; indices.push(a, c, b, b, c, d) }
    base += (segments + 1) * 2
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); return geometry
}

function GroundThresholdV234({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z), path = useMemo(() => wornPathGeometry(3.6, .56, .18), [])
  useEffect(() => () => path.dispose(), [path])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onGround() }
  return <group position={[GROUND.x, y + .10, GROUND.z]} rotation={[0, -.10, 0]} name="home-v249-ground-geological-descent" onClick={activate} userData={{ artRevision: 'v250-integrated-ground-descent', visualIntent: 'low-lateral-eroded-cleft-descending-into-terrain', semanticOwner: 'home-current-ground-geological-descent', morphology: 'low-geological-descent-cleft' }}>
    <ScannedRock seed={1} position={[-.66, -.02, -.82]} scale={[1.45,.26,1.12]} />
    <ScannedRock seed={2} position={[.62, -.04, -.98]} scale={[1.24,.22,1.02]} />
    <mesh geometry={path} position={[0, -.03, .30]} rotation={[.07, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#a27d5c" emissive="#543224" emissiveIntensity={.24} roughness={1} metalness={0} /></mesh>
    <pointLight position={[-.08, .02, -.64]} color="#e09a68" intensity={.78} distance={3.2} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z), path = useMemo(() => wornPathGeometry(3.0, .30, .10), []), lineage = useMemo(lineageGeometry, []), ascent = useMemo(ascentGeometry, [])
  const stars = useMemo(() => {
    const count = 180, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), warm = new THREE.Color('#e0c59a'), cool = new THREE.Color('#9ed8cc')
    for (let index = 0; index < count; index++) {
      const t = (index + .5) / count, angle = index * 2.39996323, radius = .10 + Math.sqrt(t) * .68, yy = .10 + t * 1.92
      positions.set([Math.cos(angle) * radius, yy, -.86 - Math.sin(angle) * radius * .38], index * 3)
      const color = warm.clone().lerp(cool, .18 + .66 * ((index % 13) / 12)); colors.set([color.r, color.g, color.b], index * 3)
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
  }, [])
  useEffect(() => () => { path.dispose(); lineage.dispose(); ascent.dispose(); stars.dispose() }, [path, lineage, ascent, stars])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onLifeMap() }
  return <group position={[LIFE_MAP.x, y + .10, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v249-life-map-rooted-celestial-ascent" onClick={activate} userData={{ artRevision: 'v250-rooted-celestial-ascent', visualIntent: 'asymmetric-rooted-ascent-opening-upward-into-lineage-and-constellation-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'vertical-rooted-celestial-ascent' }}>
    <mesh geometry={path} position={[0, -.06, .14]} rotation={[-.06, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#74806c" emissive="#263b35" emissiveIntensity={.16} roughness={1} metalness={0} /></mesh>
    <mesh geometry={ascent}><meshStandardMaterial vertexColors color="#8aafa5" emissive="#4f8178" emissiveIntensity={.21} roughness={.82} metalness={0} /></mesh>
    <lineSegments geometry={lineage} position={[0, .04, 0]}><lineBasicMaterial color="#c6eee4" transparent opacity={.68} /></lineSegments>
    <points geometry={stars}><pointsMaterial vertexColors size={.034} sizeAttenuation transparent opacity={.88} depthWrite={false} /></points>
    <pointLight position={[0, .90, -1.08]} color="#9ed8cc" intensity={.92} distance={4.0} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 96, 64)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#26302f'), tissue = new THREE.Color('#64867d'), scarColor = new THREE.Color('#d8c7b4')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index), angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.24, .86), lower = THREE.MathUtils.smoothstep(-ny, .04, .98)
    const leftLobe = Math.exp(-(((nx + .42) / .42) ** 2 + ((ny - .34) / .44) ** 2 + ((nz - .06) / .82) ** 2))
    const rightLobe = Math.exp(-(((nx - .30) / .48) ** 2 + ((ny - .28) / .46) ** 2 + ((nz + .02) / .86) ** 2))
    const cleft = Math.exp(-((nx / .17) ** 2 + ((ny - .46) / .38) ** 2 + ((nz - .18) / .58) ** 2))
    const recess = Math.exp(-(((nx - .54) / .28) ** 2 + ((ny + .02) / .48) ** 2 + ((nz + .10) / .44) ** 2))
    const fold = Math.exp(-(((nz - .56) / .24) ** 2 + ((nx + .10) / .58) ** 2)) * (.24 + .76 * upper)
    const skin = .060 * Math.sin(angle * 3 + ny * 5.4) + .026 * Math.sin(angle * 7 - ny * 8.6), taper = THREE.MathUtils.lerp(.30, 1, THREE.MathUtils.smoothstep(ny, -.92, .08))
    const radial = 1 + skin + .22 * leftLobe + .12 * rightLobe - .18 * recess + .12 * fold
    let x = nx * radial * .82 * taper - .16 * cleft * Math.sign(nx || 1) + .13 * leftLobe - .05 * rightLobe + ny * .08
    let z = nz * radial * .72 * taper + .14 * fold - .05 * recess
    const twist = (ny + .10) * .31, cos = Math.cos(twist), sin = Math.sin(twist), tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx - lower * .08; z = tz
    let yy = ny * 1.04 + .18 * leftLobe + .14 * rightLobe - .52 * cleft + .07 * fold - .10 * recess; yy -= lower * (.24 + .22 * lower)
    position.setXYZ(index, x, yy, z)
    const h = THREE.MathUtils.clamp((yy + 1.25) / 2.35, 0, 1), scar = THREE.MathUtils.clamp(cleft + fold * .20 + recess * .22, 0, 1)
    const color = deep.clone().lerp(tissue, .22 + .54 * h).lerp(scarColor, .03 + .30 * scar); colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true; geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); geometry.computeBoundingSphere(); return geometry
}

function memoryFieldGeometry() {
  const count = 210, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), cool = new THREE.Color('#9fd8cc'), warm = new THREE.Color('#e0c49a')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count, y = -.72 + ((index * 23) % count) / (count - 1) * 1.44, angle = index * 2.39996323 + .15 * Math.sin(index * .37), radius = .14 + Math.pow(t, .72) * .46
    positions.set([Math.cos(angle) * radius * (.86 - .12 * Math.abs(y)) - .02, y, .36 + Math.sin(angle) * radius * .42 + .03 * Math.sin(index * .51)], index * 3)
    const color = cool.clone().lerp(warm, .12 + .48 * ((index % 17) / 16)); colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3)); return geometry
}

function memoryScarGeometry() { return new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-.02,.64,.55),new THREE.Vector3(-.12,.46,.57),new THREE.Vector3(0,.24,.56),new THREE.Vector3(-.10,.02,.52),new THREE.Vector3(.02,-.18,.46),new THREE.Vector3(-.06,-.38,.39),new THREE.Vector3(-.01,-.56,.30)]) }
function memoryFilamentGeometry() {
  const points: THREE.Vector3[] = []
  for (let trace = 0; trace < 9; trace++) { let previous: THREE.Vector3 | null = null; for (let step = 0; step <= 26; step++) { const t = step / 26, y = -.66 + t * 1.34, angle = -1.12 + trace * .26 + t * (.74 + trace * .03) + .11 * Math.sin(t * 8 + trace), envelope = .21 + .23 * Math.sin(t * Math.PI), current = new THREE.Vector3(Math.cos(angle) * envelope + (trace - 4) * .012 - .02, y, .46 + Math.sin(angle) * .14); if (previous) points.push(previous, current); previous = current } }
  return new THREE.BufferGeometry().setFromPoints(points)
}

const stateIntensity: Record<OrbState, number> = { dormant:.03,idle:.09,attention:.18,listening:.14,thinking:.16,speaking:.22,guiding:.15,reflecting:.12,calming:.08,privacy:.13,warning:.24,transition:.16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null), fieldRef = useRef<THREE.Points>(null), y = height(ORB.x, ORB.z)
  const outer = useMemo(livingMemoryGeometry, []), field = useMemo(memoryFieldGeometry, []), scar = useMemo(memoryScarGeometry, []), filaments = useMemo(memoryFilamentGeometry, []), scarLine = useMemo(() => new THREE.Line(scar), [scar])
  useEffect(() => () => { outer.dispose(); field.dispose(); scar.dispose(); filaments.dispose() }, [field, filaments, outer, scar])
  useFrame(({ clock }) => { if (!root.current || reducedMotion) return; const t = clock.elapsedTime, breath = 1 + Math.sin(t * .58) * .010; root.current.position.y = y + .90 + Math.sin(t * .34) * .018; root.current.rotation.y = -.24 + Math.sin(t * .16) * .04; root.current.rotation.z = -.055 + Math.sin(t * .22) * .010; root.current.scale.setScalar(breath); if (fieldRef.current) fieldRef.current.rotation.y = Math.sin(t * .18) * .05 })
  const e = (reducedMotion ? .72 : 1) * stateIntensity[state], warning = state === 'warning', privacy = state === 'privacy', glow = warning ? '#d77d70' : privacy ? '#78a9a2' : '#9acfc3'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + .90, ORB.z]} rotation={[.03, -.24, -.055]} name="home-v249-organic-living-memory-presence" onClick={activate} userData={{ artRevision:'v250-sculpted-living-memory-presence', visualIntent:'single-matte-asymmetric-folded-history-bearing-presence-with-readable-interior-life', semanticOwner:'home-current-orb-surface-memory', materialLanguage:'matte-memory-tissue-scar-filaments-localized-field' }}>
    <mesh geometry={outer} scale={[1.18,1.02,1.08]} receiveShadow><meshStandardMaterial vertexColors color="#6f9188" emissive={glow} emissiveIntensity={.08 + e * .30} roughness={.72} metalness={0} /></mesh>
    <lineSegments geometry={filaments} scale={[1.18,1.02,1.08]}><lineBasicMaterial color={glow} transparent opacity={.58 + e * .24} /></lineSegments>
    <primitive object={scarLine} scale={[1.18,1.02,1.08]}><lineBasicMaterial color="#e3d9ca" transparent opacity={.72 + e * .16} /></primitive>
    <points ref={fieldRef} geometry={field} scale={[1.18,1.02,1.08]}><pointsMaterial vertexColors size={.036} transparent opacity={.62 + e * .18} depthWrite={false} /></points>
    <pointLight color={glow} intensity={.28 + e * .50} distance={3.2} decay={2} /><pointLight position={[-.12,.12,.38]} color="#e2cda5" intensity={.15 + e * .16} distance={1.8} decay={2} />
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null), geometry = useMemo(() => { const count = 120, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3), warm = new THREE.Color('#b99973'), cool = new THREE.Color('#7ca8a0'); for (let index = 0; index < count; index++) { const t = index / count, angle = index * 2.39996323, radius = 2.8 + Math.sqrt(t) * 10, x = Math.cos(angle) * radius, z = 2.2 - t * 20 + Math.sin(index * .71) * .62, yy = height(x, z) + .46 + (index % 11) * .13; positions.set([x,yy,z],index*3); const color = warm.clone().lerp(cool,.35+.48*((index%9)/8)); colors.set([color.r,color.g,color.b],index*3) } const result = new THREE.BufferGeometry(); result.setAttribute('position',new THREE.BufferAttribute(positions,3)); result.setAttribute('color',new THREE.BufferAttribute(colors,3)); return result }, [])
  useEffect(() => () => geometry.dispose(), [geometry]); useFrame(({ clock }) => { if (root.current && !reducedMotion) root.current.position.y = Math.sin(clock.elapsedTime * .10) * .014 })
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v249-subtle-atmospheric-depth"><pointsMaterial size={.017} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} /></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-unified-visual-authority" userData={{ artRevision:'v249-systemic-organic-convergence', pixelRevision:'v250-sculpted-convergence' }}><RetireSupersededShapes/><RetireNearMemoryBankSlabs/><SuppressLegacyShadowArtifacts/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}
