'use client'

import { Suspense, useEffect, useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

const ROCK_FACE = {
  '01': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf',
  '02': '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_02/asset.gltf',
} as const

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
    'home-v231-ground-weathered-threshold', 'home-v228-life-map-rooted-branching-threshold',
    'home-current-ground-geological-descent', 'home-current-life-map-rooted-ascent',
    'home-current-orb-surface-memory', 'home-current-foreground-geological-breakup',
    'home-current-atmospheric-depth-field', 'home-v226-ground-inhabited-hearth',
    'home-v226-life-map-lineage-observatory', 'home-v226-rooted-single-living-memory-presence',
  ]), [])
  const retainedFernIds = useMemo(() => new Set([1, 4, 9, 13, 18, 22, 27, 31, 34, 39, 42, 47, 51, 55, 59, 64]), [])

  useFrame(() => {
    scene.traverse((object) => {
      const fernMatch = /^home-scanned-fern-(\d+)$/.exec(object.name)
      const retireFern = fernMatch ? !retainedFernIds.has(Number(fernMatch[1])) : false
      if ((!exact.has(object.name) && !retireFern) || !object.visible) return
      object.visible = false
      suppressRaycast(object, raycasts.current)
      object.traverse((child) => suppressRaycast(child, raycasts.current))
      hidden.current.add(object)
    })
  })

  useEffect(() => () => {
    hidden.current.forEach((object) => { object.visible = true })
    raycasts.current.forEach((raycast, object) => { object.raycast = raycast })
    hidden.current.clear()
    raycasts.current.clear()
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
    hidden.current.clear()
    raycasts.current.clear()
  }, [])

  return null
}

function SuppressLegacyShadowArtifacts() {
  const { scene } = useThree()
  const changed = useRef(new Map<THREE.Mesh, boolean>())
  useFrame(() => {
    for (const groupName of ['home-v229-textured-inhabited-valley-and-distant-ridge', 'home-v226-weathered-memory-banks']) {
      const group = scene.getObjectByName(groupName)
      group?.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.castShadow) return
        if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
        object.castShadow = false
      })
    }
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh) || !object.castShadow) return
      if (object.name !== 'rock_face_01' && object.name !== 'rock_face_02') return
      if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
      object.castShadow = false
    })
  })
  useEffect(() => () => {
    changed.current.forEach((castShadow, object) => { object.castShadow = castShadow })
    changed.current.clear()
  }, [])
  return null
}

function ScannedRock({ variant, position, rotation, scale }: { variant: '01' | '02'; position: [number, number, number]; rotation: [number, number, number]; scale: [number, number, number] }) {
  const asset = useGLTF(ROCK_FACE[variant])
  const model = useMemo(() => {
    const clone = asset.scene.clone(true)
    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const normalization = 1 / Math.max(size.x, size.y, size.z, .001)
    clone.scale.setScalar(normalization)
    clone.position.set(-center.x * normalization, -box.min.y * normalization, -center.z * normalization)
    clone.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      object.castShadow = false
      object.receiveShadow = true
      const sources = Array.isArray(object.material) ? object.material : [object.material]
      const materials = sources.map((source) => {
        const material = source.clone()
        if (material instanceof THREE.MeshStandardMaterial) {
          material.roughness = Math.max(.95, material.roughness)
          material.metalness = 0
          material.color.offsetHSL(0, -.08, -.12)
          material.emissive = new THREE.Color('#0b1110')
          material.emissiveIntensity = .015
          material.envMapIntensity = .18
        }
        return material
      })
      object.material = Array.isArray(object.material) ? materials : materials[0]
    })
    return clone
  }, [asset.scene])
  useEffect(() => () => model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    materials.forEach((material) => material.dispose())
  }), [model])
  return <group position={position} rotation={rotation} scale={[scale[0] * .24, scale[1] * .24, scale[2] * .24]}><primitive object={model} /></group>
}

function wornPathGeometry(length = 3.4, startWidth = .46, endWidth = .22) {
  const segments = 36, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const soil = new THREE.Color('#302b26'), worn = new THREE.Color('#6f5b49')
  for (let index = 0; index <= segments; index++) {
    const t = index / segments
    const z = -.4 + t * length
    const center = .07 * Math.sin(t * 6.4) + .025 * Math.sin(t * 17)
    const width = THREE.MathUtils.lerp(startWidth, endWidth, t) * (1 + .06 * Math.sin(index * 1.51))
    for (const side of [-1, 1] as const) {
      positions.push(center + side * width, -.02 + .007 * Math.sin(index * 1.3), z)
      const color = soil.clone().lerp(worn, .34 + .12 * Math.sin(t * 9 + side))
      colors.push(color.r, color.g, color.b)
    }
    if (index < segments) {
      const a = index * 2, b = a + 1, c = a + 2, d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function lineageGeometry() {
  const points: THREE.Vector3[] = []
  for (let branch = 0; branch < 5; branch++) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 15; step++) {
      const t = step / 15
      const spread = (branch - 2) * (.08 + t * .06)
      const current = new THREE.Vector3(
        spread + Math.sin(t * 5 + branch) * .025,
        -.22 + t * 1.5,
        -.74 - t * .38 + Math.cos(t * 4 + branch) * .025,
      )
      if (previous) points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function GroundThresholdV234({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const path = useMemo(() => wornPathGeometry(2.75, .34, .12), [])
  useEffect(() => () => path.dispose(), [path])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onGround() }
  return <group position={[GROUND.x, y + .18, GROUND.z]} rotation={[0, -.10, 0]} name="home-v249-ground-geological-descent" onClick={activate} userData={{ artRevision: 'v249-integrated-ground-descent', visualIntent: 'low-lateral-eroded-cleft-descending-into-terrain', semanticOwner: 'home-current-ground-geological-descent', morphology: 'low-geological-descent-cleft' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.66, -.30, -.82]} rotation={[.14, 1.22, -.42]} scale={[1.44, .88, 1.20]} />
      <ScannedRock variant="02" position={[.56, -.36, -.94]} rotation={[-.10, -1.04, .30]} scale={[1.24, .76, 1.08]} />
    </Suspense>
    <mesh geometry={path} position={[0, -.12, .28]} rotation={[.14, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#645443" roughness={1} /></mesh>
    <pointLight position={[-.10, -.18, -1.06]} color="#c77954" intensity={.44} distance={2.4} decay={2} />
    <pointLight position={[.30, -.30, -1.34]} color="#755a45" intensity={.18} distance={1.7} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const path = useMemo(() => wornPathGeometry(2.45, .22, .08), [])
  const lineage = useMemo(lineageGeometry, [])
  const stars = useMemo(() => {
    const count = 120, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#cbb98f'), cool = new THREE.Color('#83b9b2')
    for (let index = 0; index < count; index++) {
      const t = (index + .5) / count
      const angle = index * 2.39996323
      const radius = .08 + Math.sqrt(t) * .54
      const yy = .14 + t * 1.7
      positions.set([Math.cos(angle) * radius, yy, -.86 - Math.sin(angle) * radius * .38], index * 3)
      const color = warm.clone().lerp(cool, .22 + .55 * ((index % 13) / 12))
      colors.set([color.r, color.g, color.b], index * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])
  useEffect(() => () => { path.dispose(); lineage.dispose(); stars.dispose() }, [path, lineage, stars])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onLifeMap() }
  return <group position={[LIFE_MAP.x, y + .10, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v249-life-map-rooted-celestial-ascent" onClick={activate} userData={{ artRevision: 'v249-rooted-celestial-ascent', visualIntent: 'asymmetric-rooted-ascent-opening-upward-into-lineage-and-constellation-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'vertical-rooted-celestial-ascent' }}>
    <Suspense fallback={null}>
      <ScannedRock variant="02" position={[-.48, -.74, -1.26]} rotation={[1.12, .72, -.58]} scale={[.72, .34, .80]} />
      <ScannedRock variant="01" position={[.42, -.78, -1.38]} rotation={[1.04, -.66, .50]} scale={[.64, .30, .72]} />
    </Suspense>
    <mesh geometry={path} position={[0, -.12, .12]} rotation={[-.09, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#565b4e" roughness={1} /></mesh>
    <lineSegments geometry={lineage} position={[0, .06, 0]}><lineBasicMaterial color="#a8cbc4" transparent opacity={.60} /></lineSegments>
    <points geometry={stars}><pointsMaterial vertexColors size={.021} sizeAttenuation transparent opacity={.70} depthWrite={false} /></points>
    <pointLight position={[0, .78, -1.12]} color="#8fc9c0" intensity={.38} distance={2.9} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 96, 64)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#26302f'), tissue = new THREE.Color('#617a76'), scarColor = new THREE.Color('#c0b4aa')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.08, .92)
    const lower = THREE.MathUtils.smoothstep(-ny, .10, .98)
    const cleftAxis = (nx + .13) * .92 + (nz - .05) * .40
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / .030) * upper
    const leftLobe = Math.exp(-(((nx + .33) / .54) ** 2 + ((nz - .18) / .70) ** 2)) * upper
    const rightRecess = Math.exp(-(((nx - .54) / .38) ** 2 + ((nz + .12) / .48) ** 2)) * (.35 + .65 * upper)
    const forwardFold = Math.exp(-(((nz - .48) / .26) ** 2 + ((nx + .07) / .62) ** 2)) * (.26 + .74 * upper)
    const skin = .030 * Math.sin(angle * 3.2 + ny * 6.3) + .012 * Math.sin(angle * 8.2 - ny * 9.1)
    const taper = THREE.MathUtils.lerp(.28, 1, THREE.MathUtils.smoothstep(ny, -.90, -.03))
    const radial = 1 + skin + .19 * leftLobe - .11 * rightRecess + .13 * forwardFold
    let x = nx * radial * .64 * taper + ny * .12 - .11 - upper * .045
    let z = nz * radial * .70 * taper + .10 * forwardFold - .035 * rightRecess
    const twist = (ny + .08) * .38
    const cos = Math.cos(twist), sin = Math.sin(twist)
    const tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx - lower * .08
    z = tz
    let yy = ny * 1.20 - .24 * cleft + .12 * leftLobe - .055 * rightRecess + .08 * forwardFold
    yy -= lower * (.18 + .16 * lower)
    position.setXYZ(index, x, yy, z)
    const h = THREE.MathUtils.clamp((yy + 1.3) / 2.55, 0, 1)
    const scar = THREE.MathUtils.clamp(cleft + forwardFold * .16 + rightRecess * .12, 0, 1)
    const color = deep.clone().lerp(tissue, .28 + .48 * h).lerp(scarColor, .018 + .22 * scar)
    colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function memoryFieldGeometry() {
  const count = 180, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#8fc7be'), warm = new THREE.Color('#d6c39e')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const y = -.72 + ((index * 23) % count) / (count - 1) * 1.45
    const angle = index * 2.39996323 + .15 * Math.sin(index * .37)
    const radius = .13 + Math.pow(t, .72) * .38
    const x = Math.cos(angle) * radius * (.78 - .15 * Math.abs(y)) - .04
    const z = .34 + Math.sin(angle) * radius * .34 + .03 * Math.sin(index * .51)
    positions.set([x, y, z], index * 3)
    const color = cool.clone().lerp(warm, .12 + .48 * ((index % 17) / 16))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function memoryScarGeometry() {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.07, .72, .48), new THREE.Vector3(-.15, .50, .49),
    new THREE.Vector3(-.04, .27, .48), new THREE.Vector3(-.12, .04, .46),
    new THREE.Vector3(-.03, -.18, .42), new THREE.Vector3(-.08, -.40, .36),
    new THREE.Vector3(-.04, -.60, .28),
  ])
}

function memoryFilamentGeometry() {
  const points: THREE.Vector3[] = []
  for (let trace = 0; trace < 7; trace++) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 24; step++) {
      const t = step / 24, y = -.68 + t * 1.36
      const angle = -1.0 + trace * .30 + t * (.70 + trace * .035) + .10 * Math.sin(t * 8 + trace)
      const envelope = .20 + .20 * Math.sin(t * Math.PI)
      const current = new THREE.Vector3(Math.cos(angle) * envelope + (trace - 3) * .013 - .04, y, .45 + Math.sin(angle) * .12)
      if (previous) points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

const stateIntensity: Record<OrbState, number> = { dormant: .03, idle: .09, attention: .18, listening: .14, thinking: .16, speaking: .22, guiding: .15, reflecting: .12, calming: .08, privacy: .13, warning: .24, transition: .16 }

function LivingMemoryHeartV234({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const y = height(ORB.x, ORB.z)
  const outer = useMemo(livingMemoryGeometry, [])
  const field = useMemo(memoryFieldGeometry, [])
  const scar = useMemo(memoryScarGeometry, [])
  const filaments = useMemo(memoryFilamentGeometry, [])
  const scarLine = useMemo(() => new THREE.Line(scar), [scar])
  useEffect(() => () => { outer.dispose(); field.dispose(); scar.dispose(); filaments.dispose() }, [field, filaments, outer, scar])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * .58) * .012
    root.current.position.y = y + .94 + Math.sin(t * .34) * .022
    root.current.rotation.y = -.25 + Math.sin(t * .16) * .045
    root.current.rotation.z = -.075 + Math.sin(t * .22) * .012
    root.current.scale.setScalar(breath)
    if (fieldRef.current) fieldRef.current.rotation.y = Math.sin(t * .18) * .055
  })
  const e = (reducedMotion ? .72 : 1) * stateIntensity[state]
  const warning = state === 'warning', privacy = state === 'privacy'
  const glow = warning ? '#d77d70' : privacy ? '#78a9a2' : '#93c2b9'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + .94, ORB.z]} rotation={[.04, -.25, -.075]} name="home-v249-organic-living-memory-presence" onClick={activate} userData={{ artRevision: 'v249-organic-living-memory-presence', visualIntent: 'single-matte-asymmetric-folded-history-bearing-presence-with-readable-interior-life', semanticOwner: 'home-current-orb-surface-memory', materialLanguage: 'matte-memory-tissue-scar-filaments-localized-field' }}>
    <mesh geometry={outer} scale={[1.04, 1.10, 1.02]} receiveShadow><meshStandardMaterial vertexColors color="#718d86" emissive={glow} emissiveIntensity={.06 + e * .18} roughness={.76} metalness={0} /></mesh>
    <lineSegments geometry={filaments} scale={[1.04, 1.10, 1.02]}><lineBasicMaterial color={glow} transparent opacity={.20 + e * .15} /></lineSegments>
    <primitive object={scarLine} scale={[1.04, 1.10, 1.02]}><lineBasicMaterial color="#d7e2d7" transparent opacity={.42 + e * .12} /></primitive>
    <points ref={fieldRef} geometry={field} scale={[1.04, 1.10, 1.02]}><pointsMaterial vertexColors size={.028} transparent opacity={.34 + e * .12} depthWrite={false} /></points>
    <pointLight color={glow} intensity={.18 + e * .28} distance={2.6} decay={2} />
    <pointLight position={[-.10, .10, .34]} color="#d8c6a2" intensity={.08 + e * .08} distance={1.5} decay={2} />
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 120, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#b99973'), cool = new THREE.Color('#7ca8a0')
    for (let index = 0; index < count; index++) {
      const t = index / count, angle = index * 2.39996323, radius = 2.8 + Math.sqrt(t) * 10
      const x = Math.cos(angle) * radius, z = 2.2 - t * 20 + Math.sin(index * .71) * .62
      const yy = height(x, z) + .46 + (index % 11) * .13
      positions.set([x, yy, z], index * 3)
      const color = warm.clone().lerp(cool, .35 + .48 * ((index % 9) / 8))
      colors.set([color.r, color.g, color.b], index * 3)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    result.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return result
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => { if (root.current && !reducedMotion) root.current.position.y = Math.sin(clock.elapsedTime * .10) * .014 })
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v249-subtle-atmospheric-depth"><pointsMaterial size={.017} sizeAttenuation transparent opacity={.20} vertexColors depthWrite={false} /></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-unified-visual-authority" userData={{ artRevision: 'v249-systemic-organic-convergence' }}><RetireSupersededShapes/><RetireNearMemoryBankSlabs/><SuppressLegacyShadowArtifacts/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}