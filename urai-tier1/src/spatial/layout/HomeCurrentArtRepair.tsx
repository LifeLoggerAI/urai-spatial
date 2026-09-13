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
    'home-v231-ground-weathered-threshold',
    'home-v228-life-map-rooted-branching-threshold',
    'home-current-ground-geological-descent',
    'home-current-life-map-rooted-ascent',
    'home-current-orb-surface-memory',
    'home-current-foreground-geological-breakup',
    'home-current-atmospheric-depth-field',
    'home-v226-ground-inhabited-hearth',
    'home-v226-life-map-lineage-observatory',
    'home-v226-rooted-single-living-memory-presence',
    'home-v226-root-cradle',
  ]), [])
  const retiredName = (name: string) => exact.has(name)
    || /^home-v227-branching-memory-nervature/.test(name)
    || /^home-v229-matter-anchored-branching-nervature/.test(name)
    || /^home-v227-split-asymmetric-memory-bloom/.test(name)
    || /^home-v226-physically-integrated-surface-nervature/.test(name)
    || /^home-orb-.*-static-signature/.test(name)
  const retainedFernIds = useMemo(() => new Set([1, 4, 9, 13, 18, 22, 27, 31, 34, 39, 42, 47, 51, 55, 59, 64]), [])

  useFrame(() => {
    scene.traverse((object) => {
      const fernMatch = /^home-scanned-fern-(\d+)$/.exec(object.name)
      const retireFern = fernMatch ? !retainedFernIds.has(Number(fernMatch[1])) : false
      if ((!retiredName(object.name) && !retireFern) || !object.visible) return
      let ancestor: THREE.Object3D | null = object.parent
      let belongsToCurrentAuthority = false
      while (ancestor) {
        if (ancestor.name === 'home-current-unified-visual-authority') { belongsToCurrentAuthority = true; break }
        ancestor = ancestor.parent
      }
      if (belongsToCurrentAuthority) return
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
  }, [])
  return null
}

function SuppressLegacyShadowArtifacts() {
  const { scene } = useThree()
  const changed = useRef(new Map<THREE.Mesh, boolean>())
  const hiddenLegacyScanFaces = useRef(new Set<THREE.Mesh>())
  useFrame(() => {
    for (const groupName of ['home-v229-textured-inhabited-valley-and-distant-ridge', 'home-v226-weathered-memory-banks']) {
      scene.getObjectByName(groupName)?.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.castShadow) return
        if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
        object.castShadow = false
      })
    }
    scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      if (object.name !== 'rock_face_01' && object.name !== 'rock_face_02') return
      let ancestor: THREE.Object3D | null = object.parent
      let currentAuthority = false
      while (ancestor) {
        if (ancestor.name === 'home-current-unified-visual-authority') { currentAuthority = true; break }
        ancestor = ancestor.parent
      }
      if (!currentAuthority) {
        if (object.visible) {
          object.visible = false
          hiddenLegacyScanFaces.current.add(object)
        }
        return
      }
      if (!object.castShadow) return
      if (!changed.current.has(object)) changed.current.set(object, object.castShadow)
      object.castShadow = false
    })
  })
  useEffect(() => () => {
    hiddenLegacyScanFaces.current.forEach((object) => { object.visible = true })
    changed.current.forEach((castShadow, object) => { object.castShadow = castShadow })
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
          material.roughness = Math.max(.97, material.roughness)
          material.metalness = 0
          material.color.offsetHSL(0, -.14, -.24)
          material.emissive = new THREE.Color('#080d0c')
          material.emissiveIntensity = .008
          material.envMapIntensity = .10
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
  return <group position={position} rotation={rotation} scale={[scale[0] * .18, scale[1] * .18, scale[2] * .18]}><primitive object={model} /></group>
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
  for (let branch = 0; branch < 11; branch++) {
    let previous: THREE.Vector3 | null = null
    const lane = branch - 5
    for (let step = 0; step <= 28; step++) {
      const t = step / 28
      const fan = lane * (.014 + t * t * .082)
      const current = new THREE.Vector3(
        fan + Math.sin(t * 5.7 + branch * .71) * (.018 + t * .058),
        -.16 + t * 2.28 + .042 * Math.sin(t * Math.PI * 2.4 + branch * .42),
        -.78 - t * .88 + Math.cos(t * 4.1 + branch * .63) * (.026 + t * .052),
      )
      if (previous) points.push(previous, current)
      if (step === 13 || step === 20 || step === 24) {
        const forkSign = (branch + step) % 2 ? 1 : -1
        points.push(current, current.clone().add(new THREE.Vector3(forkSign * (.075 + t * .13), .09 + t * .10, -.05 - t * .06)))
      }
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function groundTerrainLocalY(x: number, z: number) {
  const yaw = -.10
  const cos = Math.cos(yaw), sin = Math.sin(yaw)
  const worldX = GROUND.x + x * cos + z * sin
  const worldZ = GROUND.z - x * sin + z * cos
  return height(worldX, worldZ) - (height(GROUND.x, GROUND.z) + .12)
}

function groundShoulderGeometry(side: -1 | 1) {
  const rows = 20, columns = 8
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#24241f'), weathered = new THREE.Color('#5c5547'), moss = new THREE.Color('#39483f')
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    const z = -1.26 + t * 3.05
    const inner = .30 + .045 * Math.sin(t * 8.6 + (side < 0 ? .8 : 2.3))
    const outer = .92 + .10 * Math.sin(t * 4.3 + (side < 0 ? 1.2 : .35))
    const rimLift = (side < 0 ? .34 : .29) * (.70 + .30 * Math.sin(Math.PI * t))
    for (let column = 0; column <= columns; column++) {
      const u = column / columns
      const x = side * THREE.MathUtils.lerp(inner, outer, u)
      const erosion = .026 * Math.sin(row * 1.71 + column * 2.27 + (side < 0 ? .4 : 1.8))
      const y = groundTerrainLocalY(x, z) + .02 + THREE.MathUtils.lerp(rimLift, .008, u) + erosion
      positions.push(x, y, z)
      const color = deep.clone().lerp(weathered, .16 + .34 * (1 - u)).lerp(moss, .11 + .08 * Math.sin(row * .57 + column))
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1
    if (side > 0) indices.push(a, c, b, b, c, d)
    else indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function groundCleftGeometry() {
  const segments = 42, columns = 10
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#101511'), ember = new THREE.Color('#5d4030')
  for (let row = 0; row <= segments; row++) {
    const t = row / segments
    const z = -1.22 + t * 3.0
    const center = .035 * Math.sin(t * 8.2) - .020 * Math.sin(t * 3.1)
    const width = .34 + .075 * Math.sin(Math.PI * t) + .015 * Math.sin(row * 1.13)
    for (let column = 0; column <= columns; column++) {
      const cross = column / columns * 2 - 1
      const x = center + cross * width
      const rim = Math.pow(Math.abs(cross), 1.55)
      const terrain = groundTerrainLocalY(x, z)
      const centerDepth = (1 - rim) * (.26 + .18 * Math.sin(Math.PI * t))
      const irregular = .011 * Math.sin(row * 1.43 + column * 1.87)
      const y = terrain - centerDepth + rim * .08 + irregular
      positions.push(x, y, z)
      const color = deep.clone().lerp(ember, .06 + .30 * rim + .05 * (1 - t))
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < segments; row++) for (let column = 0; column < columns; column++) {
    const a = row * (columns + 1) + column, b = a + 1, c = a + columns + 1, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function rootedBaseGeometry() {
  const points: THREE.Vector3[] = []
  for (let root = 0; root < 15; root++) {
    const angle = -.46 + root * .43
    let previous = new THREE.Vector3(0, -.13, -.70)
    for (let step = 1; step <= 12; step++) {
      const t = step / 12
      const radius = t * (.48 + .12 * Math.sin(root * 1.37))
      const current = new THREE.Vector3(
        Math.cos(angle + .17 * Math.sin(t * 4 + root)) * radius,
        -.16 + .020 * Math.sin(step * 1.23 + root) + .030 * t,
        -.70 + Math.sin(angle + .12 * Math.cos(t * 5 + root)) * radius * .52 + t * .12,
      )
      points.push(previous, current)
      previous = current
    }
  }
  return new THREE.BufferGeometry().setFromPoints(points)
}

function GroundThresholdV234({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const leftShoulder = useMemo(() => groundShoulderGeometry(-1), [])
  const rightShoulder = useMemo(() => groundShoulderGeometry(1), [])
  const cleft = useMemo(groundCleftGeometry, [])
  useEffect(() => () => { leftShoulder.dispose(); rightShoulder.dispose(); cleft.dispose() }, [cleft, leftShoulder, rightShoulder])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onGround() }
  return <group position={[GROUND.x, y + .12, GROUND.z]} rotation={[0, -.10, 0]} name="home-v249-ground-geological-descent" onClick={activate} userData={{ artRevision: 'v249-integrated-ground-descent', visualIntent: 'low-lateral-eroded-cleft-descending-into-terrain', semanticOwner: 'home-current-ground-geological-descent', morphology: 'low-geological-descent-cleft' }}>
    <mesh geometry={leftShoulder} receiveShadow><meshStandardMaterial vertexColors roughness={1} metalness={0} /></mesh>
    <mesh geometry={rightShoulder} receiveShadow><meshStandardMaterial vertexColors roughness={1} metalness={0} /></mesh>
    <mesh geometry={cleft} receiveShadow><meshStandardMaterial vertexColors roughness={1} metalness={0} /></mesh>
    <Suspense fallback={null}>
      <ScannedRock variant="01" position={[-.74, -.20, -.78]} rotation={[.04, .48, -.08]} scale={[.18, .17, .20]} />
      <ScannedRock variant="02" position={[.72, -.22, -.42]} rotation={[-.03, -.42, .06]} scale={[.15, .16, .17]} />
    </Suspense>
    <pointLight position={[-.05, -.08, -.58]} color="#a9684d" intensity={.28} distance={2.35} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const path = useMemo(() => wornPathGeometry(2.70, .30, .08), [])
  const roots = useMemo(rootedBaseGeometry, [])
  const lineage = useMemo(lineageGeometry, [])
  const stars = useMemo(() => {
    const count = 310, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#c6bc91'), cool = new THREE.Color('#688f88')
    for (let index = 0; index < count; index++) {
      const t = (index + .5) / count
      const angle = index * 2.39996323
      const radius = .08 + Math.sqrt(t) * 1.02
      const yy = .08 + t * 2.60
      positions.set([
        Math.cos(angle) * radius * (.68 + .15 * Math.sin(index * .37)),
        yy,
        -1.04 - Math.sin(angle) * radius * .52 - t * .48,
      ], index * 3)
      const color = warm.clone().lerp(cool, .20 + .64 * ((index % 19) / 18))
      colors.set([color.r, color.g, color.b], index * 3)
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geometry
  }, [])
  useEffect(() => () => { path.dispose(); roots.dispose(); lineage.dispose(); stars.dispose() }, [lineage, path, roots, stars])
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onLifeMap() }
  return <group position={[LIFE_MAP.x, y + .10, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v249-life-map-rooted-celestial-ascent" onClick={activate} userData={{ artRevision: 'v249-rooted-celestial-ascent', visualIntent: 'asymmetric-rooted-ascent-opening-upward-into-lineage-and-constellation-depth', semanticOwner: 'home-current-life-map-rooted-ascent', morphology: 'vertical-rooted-celestial-ascent' }}>
    <mesh geometry={path} position={[0, -.12, .12]} rotation={[-.09, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#354038" roughness={1} /></mesh>
    <lineSegments geometry={roots}><lineBasicMaterial color="#33483f" transparent opacity={.22} /></lineSegments>
    <lineSegments geometry={lineage} position={[0, .05, 0]}><lineBasicMaterial color="#52726b" transparent opacity={.075} /></lineSegments>
    <points geometry={lineage} position={[0, .05, 0]}><pointsMaterial color="#9ca48c" size={.011} sizeAttenuation transparent opacity={.30} depthWrite={false} /></points>
    <points geometry={stars}><pointsMaterial vertexColors size={.018} sizeAttenuation transparent opacity={.62} depthWrite={false} /></points>
    <pointLight position={[0, 1.42, -1.42]} color="#749c92" intensity={.20} distance={3.4} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 96, 64)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#24322e'), tissue = new THREE.Color('#617a70'), lichen = new THREE.Color('#858978'), scarColor = new THREE.Color('#aaa690')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.12, .92)
    const lower = THREE.MathUtils.smoothstep(-ny, .08, .98)
    const leftFold = Math.exp(-(((nx + .38) / .48) ** 2 + ((nz - .12) / .62) ** 2)) * upper
    const rightHollow = Math.exp(-(((nx - .46) / .32) ** 2 + ((nz + .16) / .42) ** 2)) * (.30 + .70 * upper)
    const dorsalFold = Math.exp(-(((nz - .46) / .25) ** 2 + ((nx + .05) / .56) ** 2)) * (.18 + .82 * upper)
    const cleftAxis = (nx + .17) * .78 + (nz - .03) * .62
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / .018) * upper
    const coarse = .055 * Math.sin(angle * 3.1 + ny * 5.4) + .025 * Math.sin(angle * 6.8 - ny * 8.6) + .014 * Math.sin(nx * 13 + nz * 11)
    const taper = THREE.MathUtils.lerp(.18, 1, THREE.MathUtils.smoothstep(ny, -.92, -.05))
    const radial = 1 + coarse + .28 * leftFold - .18 * rightHollow + .13 * dorsalFold
    let x = nx * radial * .69 * taper + ny * .18 - .14 - upper * .08
    let z = nz * radial * .66 * taper + .09 * dorsalFold - .06 * rightHollow
    const twist = (ny + .05) * .50 + .08
    const cos = Math.cos(twist), sin = Math.sin(twist)
    const tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx - lower * .14
    z = tz
    let yy = ny * 1.12 - .36 * cleft + .17 * leftFold - .08 * rightHollow + .05 * dorsalFold
    yy -= lower * (.20 + .20 * lower)
    position.setXYZ(index, x, yy, z)
    const h = THREE.MathUtils.clamp((yy + 1.25) / 2.45, 0, 1)
    const scar = THREE.MathUtils.clamp(cleft + dorsalFold * .12 + rightHollow * .10, 0, 1)
    const mineral = .5 + .5 * Math.sin(angle * 4.4 + yy * 7.2)
    const color = deep.clone().lerp(tissue, .22 + .45 * h + .06 * mineral).lerp(lichen, .08 + .12 * Math.max(0, -nz)).lerp(scarColor, .012 + .13 * scar)
    colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function memoryFieldGeometry() {
  const count = 150, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#6d9b8f'), warm = new THREE.Color('#aaa07e')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const y = -.68 + ((index * 23) % count) / (count - 1) * 1.36
    const angle = index * 2.39996323 + .15 * Math.sin(index * .37)
    const radius = .10 + Math.pow(t, .72) * .29
    positions.set([Math.cos(angle) * radius * .74 - .05, y, .20 + Math.sin(angle) * radius * .24], index * 3)
    const color = cool.clone().lerp(warm, .10 + .38 * ((index % 17) / 16))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function memoryScarGeometry() {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.10, .66, .34), new THREE.Vector3(-.18, .44, .35),
    new THREE.Vector3(-.08, .22, .34), new THREE.Vector3(-.14, .00, .31),
    new THREE.Vector3(-.06, -.20, .28), new THREE.Vector3(-.12, -.40, .23),
    new THREE.Vector3(-.08, -.57, .17),
  ])
}

function memoryFilamentGeometry() {
  const points: THREE.Vector3[] = [], colors: number[] = []
  const cool = new THREE.Color('#6f9d91'), warm = new THREE.Color('#aaa07c')
  for (let trace = 0; trace < 7; trace++) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 24; step++) {
      const t = step / 24, y = -.62 + t * 1.24
      const angle = -.98 + trace * .28 + t * (.52 + trace * .021) + .06 * Math.sin(t * 8 + trace)
      const envelope = .10 + .14 * Math.sin(t * Math.PI)
      const current = new THREE.Vector3(Math.cos(angle) * envelope - .05, y, .16 + Math.sin(angle) * .07)
      if (previous) {
        points.push(previous, current)
        const color = cool.clone().lerp(warm, .12 + .42 * ((trace + step) % 9) / 8)
        colors.push(color.r, color.g, color.b, color.r, color.g, color.b)
      }
      previous = current
    }
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points)
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  return geometry
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
  useEffect(() => () => { outer.dispose(); field.dispose(); scar.dispose(); filaments.dispose() }, [field, filaments, outer, scar])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * .52) * .007
    root.current.position.y = y + .92 + Math.sin(t * .28) * .010
    root.current.rotation.y = -.46 + Math.sin(t * .14) * .025
    root.current.rotation.z = -.11 + Math.sin(t * .18) * .007
    root.current.scale.setScalar(breath)
    if (fieldRef.current) fieldRef.current.rotation.y = Math.sin(t * .14) * .030
  })
  const e = (reducedMotion ? .72 : 1) * stateIntensity[state]
  const warning = state === 'warning', privacy = state === 'privacy'
  const glow = warning ? '#9d6557' : privacy ? '#668e8a' : '#6f9187'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + .92, ORB.z]} rotation={[.06, -.46, -.11]} name="home-v249-organic-living-memory-presence" onClick={activate} userData={{ artRevision: 'v249-organic-living-memory-presence', visualIntent: 'single-matte-asymmetric-folded-history-bearing-presence-with-readable-interior-life', semanticOwner: 'home-current-orb-surface-memory', materialLanguage: 'matte-memory-tissue-scar-filaments-localized-field' }}>
    <mesh geometry={outer} scale={[.92, 1.04, .94]} receiveShadow><meshStandardMaterial vertexColors color="#7b8d83" emissive={glow} emissiveIntensity={.010 + e * .05} roughness={.76} metalness={0} /></mesh>
    <lineSegments geometry={filaments} scale={[.92, 1.04, .94]}><lineBasicMaterial vertexColors transparent opacity={.10 + e * .07} /></lineSegments>
    <lineSegments geometry={scar} scale={[.92, 1.04, .94]}><lineBasicMaterial color="#aaa58f" transparent opacity={.18 + e * .06} /></lineSegments>
    <points ref={fieldRef} geometry={field} scale={[.92, 1.04, .94]}><pointsMaterial vertexColors size={.019} transparent opacity={.20 + e * .08} depthWrite={false} /></points>
    <pointLight color={glow} intensity={.055 + e * .10} distance={2.0} decay={2} />
  </group>
}

function SubtleAtmosphereV234({ reducedMotion }: { reducedMotion: boolean }) {
  const root = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 140, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
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
  useFrame(({ clock }) => { if (root.current && !reducedMotion) root.current.position.y = Math.sin(clock.elapsedTime * .10) * .012 })
  return <points ref={root} geometry={geometry} frustumCulled={false} name="home-v249-subtle-atmospheric-depth"><pointsMaterial size={.016} sizeAttenuation transparent opacity={.18} vertexColors depthWrite={false} /></points>
}

export function HomeCurrentArtRepair({ orbState, reducedMotion, onOrb, onGround, onLifeMap }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  return <group name="home-current-unified-visual-authority" userData={{ artRevision: 'v249-systemic-organic-convergence' }}><RetireSupersededShapes/><RetireNearMemoryBankSlabs/><SuppressLegacyShadowArtifacts/><GroundThresholdV234 onGround={onGround}/><LifeMapThresholdV234 onLifeMap={onLifeMap}/><LivingMemoryHeartV234 state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/><SubtleAtmosphereV234 reducedMotion={reducedMotion}/></group>
}
