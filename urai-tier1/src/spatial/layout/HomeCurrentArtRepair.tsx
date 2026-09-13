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
    'home-v226-root-cradle',
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
  const hiddenLegacyScanFaces = useRef(new Set<THREE.Mesh>())
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
    hiddenLegacyScanFaces.current.clear()
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
  for (let branch = 0; branch < 9; branch++) {
    let previous: THREE.Vector3 | null = null
    const lane = branch - 4
    for (let step = 0; step <= 26; step++) {
      const t = step / 26
      const spread = lane * (.025 + t * t * .105)
      const current = new THREE.Vector3(
        spread + Math.sin(t * 5.35 + branch * .87) * (.022 + t * .072) + Math.sign(lane) * t * .025,
        -.14 + t * 2.22 + .055 * Math.sin(t * Math.PI * 2 + branch * .61),
        -.76 - t * .76 + Math.cos(t * 4.65 + branch * .73) * (.038 + t * .058) - Math.abs(lane) * t * .012,
      )
      if (previous) points.push(previous, current)
      if (step === 11 || step === 17 || step === 22) {
        const direction = ((branch + step) % 2 ? 1 : -1)
        const fork = new THREE.Vector3(
          current.x + direction * (.10 + t * .17),
          current.y + .08 + t * .12,
          current.z - .055 - t * .07,
        )
        points.push(current, fork)
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
  const rows = 16, columns = 7
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#28261f'), weathered = new THREE.Color('#7a644b')
  for (let row = 0; row <= rows; row++) {
    const t = row / rows
    const z = -1.34 + t * 3.18
    const inner = .43 + .055 * Math.sin(t * 8.1 + (side < 0 ? .8 : 2.3))
    const outer = 1.42 + .14 * Math.sin(t * 4.7 + (side < 0 ? 1.2 : .35))
    const rimLift = (side < 0 ? .64 : .54) * (.72 + .28 * Math.sin(Math.PI * t))
    for (let column = 0; column <= columns; column++) {
      const u = column / columns
      const x = side * THREE.MathUtils.lerp(inner, outer, u)
      const erosion = .034 * Math.sin(row * 1.71 + column * 2.27 + (side < 0 ? .4 : 1.8))
      const y = groundTerrainLocalY(x, z) + .035 + THREE.MathUtils.lerp(rimLift, .025, u) + erosion
      positions.push(x, y, z)
      const color = deep.clone().lerp(weathered, .24 + .46 * (1 - u) + .08 * Math.sin(row * .9 + column))
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column
      const b = a + 1
      const c = a + columns + 1
      const d = c + 1
      if (side > 0) indices.push(a, c, b, b, c, d)
      else indices.push(a, b, c, b, d, c)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function groundCleftGeometry() {
  const segments = 38, columns = 8
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#211d18'), warm = new THREE.Color('#80583f')
  for (let row = 0; row <= segments; row++) {
    const t = row / segments
    const z = -1.28 + t * 3.08
    const center = .045 * Math.sin(t * 8.4) - .026 * Math.sin(t * 3.2)
    const width = .52 + .12 * Math.sin(Math.PI * t) + .024 * Math.sin(row * 1.11)
    for (let column = 0; column <= columns; column++) {
      const cross = column / columns * 2 - 1
      const x = center + cross * width
      const rim = Math.pow(Math.abs(cross), 1.45)
      const terrain = groundTerrainLocalY(x, z)
      const irregular = .014 * Math.sin(row * 1.43 + column * 1.87)
      const y = terrain + .018 + rim * (.31 + .09 * Math.sin(Math.PI * t)) + irregular
      positions.push(x, y, z)
      const color = deep.clone().lerp(warm, .08 + .58 * rim + .08 * (1 - t))
      colors.push(color.r, color.g, color.b)
    }
  }
  for (let row = 0; row < segments; row++) {
    for (let column = 0; column < columns; column++) {
      const a = row * (columns + 1) + column
      const b = a + 1
      const c = a + columns + 1
      const d = c + 1
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

function rootedBaseGeometry() {
  const points: THREE.Vector3[] = []
  for (let root = 0; root < 13; root++) {
    const angle = -.34 + root * .50
    let previous = new THREE.Vector3(0, -.13, -.70)
    for (let step = 1; step <= 11; step++) {
      const t = step / 11
      const radius = t * (.58 + .13 * Math.sin(root * 1.37))
      const current = new THREE.Vector3(
        Math.cos(angle + .17 * Math.sin(t * 4 + root)) * radius,
        -.15 + .025 * Math.sin(step * 1.23 + root) + .040 * t,
        -.70 + Math.sin(angle + .12 * Math.cos(t * 5 + root)) * radius * .58 + t * .14,
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
      <ScannedRock variant="01" position={[-1.18, -.50, -.88]} rotation={[1.39, .42, -.74]} scale={[.48, .16, .56]} />
      <ScannedRock variant="02" position={[1.06, -.52, -.46]} rotation={[1.44, -.47, .64]} scale={[.40, .15, .46]} />
    </Suspense>
    <pointLight position={[-.10, .12, -.70]} color="#bd7858" intensity={.48} distance={2.8} decay={2} />
    <pointLight position={[.36, .08, .40]} color="#735745" intensity={.18} distance={2.1} decay={2} />
  </group>
}

function LifeMapThresholdV234({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const path = useMemo(() => wornPathGeometry(2.70, .30, .08), [])
  const roots = useMemo(rootedBaseGeometry, [])
  const lineage = useMemo(lineageGeometry, [])
  const stars = useMemo(() => {
    const count = 240, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
    const warm = new THREE.Color('#d2c59b'), cool = new THREE.Color('#79aaa4')
    for (let index = 0; index < count; index++) {
      const t = (index + .5) / count
      const angle = index * 2.39996323
      const radius = .10 + Math.sqrt(t) * .98
      const yy = .10 + t * 2.54
      positions.set([
        Math.cos(angle) * radius * (.72 + .16 * Math.sin(index * .37)),
        yy,
        -1.00 - Math.sin(angle) * radius * .56 - t * .42,
      ], index * 3)
      const color = warm.clone().lerp(cool, .16 + .70 * ((index % 17) / 16))
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
    <mesh geometry={path} position={[0, -.12, .12]} rotation={[-.09, 0, 0]} receiveShadow><meshStandardMaterial vertexColors color="#3e4a40" roughness={1} /></mesh>
    <lineSegments geometry={roots}><lineBasicMaterial color="#4b6257" transparent opacity={.34} /></lineSegments>
    <lineSegments geometry={lineage} position={[0, .05, 0]}><lineBasicMaterial color="#769d95" transparent opacity={.20} /></lineSegments>
    <points geometry={lineage} position={[0, .05, 0]}><pointsMaterial color="#d7cfaa" size={.015} sizeAttenuation transparent opacity={.46} depthWrite={false} /></points>
    <points geometry={stars}><pointsMaterial vertexColors size={.026} sizeAttenuation transparent opacity={.80} depthWrite={false} /></points>
    <pointLight position={[0, 1.28, -1.34]} color="#83b5ae" intensity={.38} distance={3.8} decay={2} />
  </group>
}

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 96, 64)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors: number[] = []
  const deep = new THREE.Color('#273432'), tissue = new THREE.Color('#789089'), scarColor = new THREE.Color('#c9bcab')
  for (let index = 0; index < position.count; index++) {
    const nx = position.getX(index), ny = position.getY(index), nz = position.getZ(index)
    const angle = Math.atan2(nz, nx)
    const upper = THREE.MathUtils.smoothstep(ny, -.08, .92)
    const lower = THREE.MathUtils.smoothstep(-ny, .10, .98)
    const cleftAxis = (nx + .13) * .92 + (nz - .05) * .40
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / .021) * upper
    const leftLobe = Math.exp(-(((nx + .33) / .54) ** 2 + ((nz - .18) / .70) ** 2)) * upper
    const rightRecess = Math.exp(-(((nx - .54) / .38) ** 2 + ((nz + .12) / .48) ** 2)) * (.35 + .65 * upper)
    const forwardFold = Math.exp(-(((nz - .48) / .26) ** 2 + ((nx + .07) / .62) ** 2)) * (.26 + .74 * upper)
    const skin = .038 * Math.sin(angle * 3.2 + ny * 6.3) + .016 * Math.sin(angle * 8.2 - ny * 9.1)
    const taper = THREE.MathUtils.lerp(.22, 1, THREE.MathUtils.smoothstep(ny, -.90, -.03))
    const radial = 1 + skin + .24 * leftLobe - .14 * rightRecess + .16 * forwardFold
    let x = nx * radial * .66 * taper + ny * .13 - .12 - upper * .052
    let z = nz * radial * .72 * taper + .12 * forwardFold - .045 * rightRecess
    const twist = (ny + .08) * .42
    const cos = Math.cos(twist), sin = Math.sin(twist)
    const tx = x * cos - z * sin, tz = x * sin + z * cos
    x = tx - lower * .09
    z = tz
    let yy = ny * 1.22 - .31 * cleft + .15 * leftLobe - .07 * rightRecess + .10 * forwardFold
    yy -= lower * (.20 + .17 * lower)
    position.setXYZ(index, x, yy, z)
    const h = THREE.MathUtils.clamp((yy + 1.3) / 2.55, 0, 1)
    const scar = THREE.MathUtils.clamp(cleft + forwardFold * .16 + rightRecess * .12, 0, 1)
    const striation = .5 + .5 * Math.sin(angle * 5.1 + yy * 8.3)
    const color = deep.clone().lerp(tissue, .26 + .50 * h + .05 * striation).lerp(scarColor, .014 + .18 * scar)
    colors.push(color.r, color.g, color.b)
  }
  position.needsUpdate = true
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function memoryFieldGeometry() {
  const count = 200, positions = new Float32Array(count * 3), colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#7fb5ad'), warm = new THREE.Color('#d2bf9a')
  for (let index = 0; index < count; index++) {
    const t = (index + .5) / count
    const y = -.74 + ((index * 23) % count) / (count - 1) * 1.50
    const angle = index * 2.39996323 + .15 * Math.sin(index * .37)
    const radius = .11 + Math.pow(t, .72) * .34
    const x = Math.cos(angle) * radius * (.78 - .15 * Math.abs(y)) - .04
    const z = .24 + Math.sin(angle) * radius * .28 + .025 * Math.sin(index * .51)
    positions.set([x, y, z], index * 3)
    const color = cool.clone().lerp(warm, .10 + .50 * ((index % 17) / 16))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function memoryScarGeometry() {
  return new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-.07, .72, .39), new THREE.Vector3(-.15, .50, .40),
    new THREE.Vector3(-.04, .27, .39), new THREE.Vector3(-.12, .04, .37),
    new THREE.Vector3(-.03, -.18, .34), new THREE.Vector3(-.08, -.40, .29),
    new THREE.Vector3(-.04, -.60, .22),
  ])
}

function memoryFilamentGeometry() {
  const points: THREE.Vector3[] = [], colors: number[] = []
  const cool = new THREE.Color('#83b8af'), warm = new THREE.Color('#d7c49e')
  for (let trace = 0; trace < 9; trace++) {
    let previous: THREE.Vector3 | null = null
    for (let step = 0; step <= 26; step++) {
      const t = step / 26, y = -.70 + t * 1.40
      const angle = -1.05 + trace * .25 + t * (.62 + trace * .025) + .085 * Math.sin(t * 8 + trace)
      const envelope = .12 + .17 * Math.sin(t * Math.PI)
      const current = new THREE.Vector3(Math.cos(angle) * envelope + (trace - 4) * .010 - .04, y, .20 + Math.sin(angle) * .09)
      if (previous) {
        points.push(previous, current)
        const color = cool.clone().lerp(warm, .16 + .56 * ((trace + step) % 9) / 8)
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
  const scarLine = useMemo(() => new THREE.Line(scar), [scar])
  useEffect(() => () => { outer.dispose(); field.dispose(); scar.dispose(); filaments.dispose() }, [field, filaments, outer, scar])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    const t = clock.elapsedTime
    const breath = 1 + Math.sin(t * .58) * .010
    root.current.position.y = y + .94 + Math.sin(t * .34) * .018
    root.current.rotation.y = -.25 + Math.sin(t * .16) * .040
    root.current.rotation.z = -.075 + Math.sin(t * .22) * .010
    root.current.scale.setScalar(breath)
    if (fieldRef.current) fieldRef.current.rotation.y = Math.sin(t * .18) * .045
  })
  const e = (reducedMotion ? .72 : 1) * stateIntensity[state]
  const warning = state === 'warning', privacy = state === 'privacy'
  const glow = warning ? '#d77d70' : privacy ? '#78a9a2' : '#8db8af'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + .94, ORB.z]} rotation={[.04, -.25, -.075]} name="home-v249-organic-living-memory-presence" onClick={activate} userData={{ artRevision: 'v249-organic-living-memory-presence', visualIntent: 'single-matte-asymmetric-folded-history-bearing-presence-with-readable-interior-life', semanticOwner: 'home-current-orb-surface-memory', materialLanguage: 'matte-memory-tissue-scar-filaments-localized-field' }}>
    <mesh geometry={outer} scale={[1.10, 1.16, 1.08]} receiveShadow><meshStandardMaterial vertexColors color="#a5b8b1" emissive={glow} emissiveIntensity={.035 + e * .12} roughness={.76} metalness={0} /></mesh>
    <lineSegments geometry={filaments} scale={[1.10, 1.16, 1.08]}><lineBasicMaterial vertexColors transparent opacity={.14 + e * .10} /></lineSegments>
    <primitive object={scarLine} scale={[1.10, 1.16, 1.08]}><lineBasicMaterial color="#d3c7b2" transparent opacity={.26 + e * .10} /></primitive>
    <points ref={fieldRef} geometry={field} scale={[1.10, 1.16, 1.08]}><pointsMaterial vertexColors size={.026} transparent opacity={.28 + e * .10} depthWrite={false} /></points>
    <pointLight color={glow} intensity={.14 + e * .22} distance={2.5} decay={2} />
    <pointLight position={[-.10, .10, .30]} color="#d2c09f" intensity={.06 + e * .06} distance={1.4} decay={2} />
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
