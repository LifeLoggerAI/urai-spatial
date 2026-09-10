'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type V3 = [number, number, number]
type WalkHandler = (event: ThreeEvent<MouseEvent>) => void

const rejectedNames = new Set([
  'home-v225-living-memory-grove',
  'home-v225-grown-winding-memory-path',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
  'home-v225-sculpted-sanctuary-floor',
])

function RetireRejectedPresentation() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      const rejected = rejectedNames.has(object.name)
        || /^home-v225-(?:port|starboard)-overhanging-strata-/.test(object.name)
        || object.name === 'home-v225-polish-production-composition'
      if (rejected && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 8) {
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal', .35),
    Math.max(48, points.length * 2),
    radius,
    radial,
    false,
  )
}

function sanctuaryFloorGeometry() {
  const nx = 112, nz = 152
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#11231f')
  const moss = new THREE.Color('#28483c')
  const earth = new THREE.Color('#6d5940')
  const cool = new THREE.Color('#3e6c60')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.2 - iz / nz * 25.5
    for (let ix = 0; ix <= nx; ix++) {
      const x = -8.8 + ix / nx * 17.6
      const depth = THREE.MathUtils.clamp((5.0 - z) / 22.5, 0, 1)
      const lane = Math.exp(-Math.pow(x / 2.55, 2))
      const broad = .034 * Math.sin(x * .72 + z * .31) + .024 * Math.cos(x * 1.36 - z * .47)
      const fine = .016 * Math.sin(x * 3.10 + z * 1.73) * Math.cos(z * 2.16 - x * .62)
      const sideFold = Math.pow(THREE.MathUtils.clamp((Math.abs(x) - 2.45) / 6.0, 0, 1), 1.35)
      const y = height(x, z) + broad * (1 - .72 * lane) + fine + .17 * sideFold * (.35 + depth) + .022
      positions.push(x, y, z)
      const edge = THREE.MathUtils.clamp(Math.abs(x) / 8.8, 0, 1)
      const mottled = .5 + .5 * Math.sin(x * 1.9 + z * 1.2) * Math.sin(z * .73 - x * .81)
      const c = deep.clone().lerp(moss, .32 + .30 * (1 - edge)).lerp(earth, .16 * lane + .07 * mottled).lerp(cool, .12 * depth)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nx + 1
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = iz * row + ix, b = a + 1, c = a + row, d = c + 1
    if ((ix + iz) & 1) indices.push(a, b, d, a, d, c)
    else indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function memoryPathGeometry() {
  const segments = 124, across = 14
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const ember = new THREE.Color('#ae8b61')
  const quiet = new THREE.Color('#365c4d')
  const pale = new THREE.Color('#c0b08c')
  const centers = Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    const z = 5.0 - t * 20.9
    const x = .28 * Math.sin(t * Math.PI * 2.05) + .10 * Math.sin(t * Math.PI * 5.1)
    return new THREE.Vector3(x, height(x, z) + .075, z)
  })
  for (let i = 0; i <= segments; i++) {
    const tangent = centers[Math.min(segments, i + 1)].clone().sub(centers[Math.max(0, i - 1)]).normalize()
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
    for (let j = 0; j < across; j++) {
      const u = j / (across - 1) - .5
      const width = 1.82 + .12 * Math.sin(i * .16)
      const p = centers[i].clone().addScaledVector(side, u * width)
      p.y += .030 * Math.cos(u * Math.PI * 2) + .010 * Math.sin(i * .27 + u * 5)
      positions.push(p.x, p.y, p.z)
      const c = quiet.clone().lerp(ember, .34 + .48 * (1 - Math.abs(u) * 2)).lerp(pale, .10 * Math.sin(i / segments * Math.PI))
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < segments; i++) for (let j = 0; j < across - 1; j++) {
    const a = i * across + j, b = a + 1, c = a + across, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ridgeGeometry(side: -1 | 1, band: number) {
  const nz = 72, nv = 30
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color(side < 0 ? '#18352b' : '#173a33')
  const stone = new THREE.Color(side < 0 ? '#4d624e' : '#41675c')
  const warm = new THREE.Color('#806447')
  const zStart = 5.2 - band * 7.1
  const zEnd = zStart - 8.8
  for (let iz = 0; iz <= nz; iz++) {
    const u = iz / nz
    const z = THREE.MathUtils.lerp(zStart, zEnd, u)
    const depth = THREE.MathUtils.clamp((5.0 - z) / 23, 0, 1)
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const baseX = side * (5.65 + .24 * Math.sin(z * .31 + band * 1.6) + .12 * Math.sin(z * .91 - band))
      const inward = Math.pow(Math.sin(v * Math.PI), 1.25) * (.92 + .16 * band)
      const shelf = .20 * Math.sin(v * Math.PI * 4.2 + u * 5.2 + band) + .08 * Math.sin(v * 17 - u * 4)
      const x = baseX - side * (inward + shelf * .18)
      const floor = height(x * .90, z)
      const total = 1.80 + 1.42 * depth + .30 * band
      const y = floor - .06 + v * total + .11 * Math.sin(v * Math.PI * 3.3 + u * 6.2 + band) + .045 * Math.sin(v * 19 + u * 11)
      const zz = z - .20 * v + .10 * Math.sin(v * 6.2 + u * 4.4 + band)
      positions.push(x, y, zz)
      const strata = .5 + .5 * Math.sin(v * 30 + u * 8 + band)
      const c = dark.clone().lerp(stone, .30 + .42 * v).lerp(warm, .10 * strata)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let iz = 0; iz < nz; iz++) for (let iv = 0; iv < nv; iv++) {
    const a = iz * row + iv, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function finGeometry(side: -1 | 1, index: number) {
  const n = 42
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const z0 = 3.2 - index * 4.25
  const green = new THREE.Color('#527460')
  const earth = new THREE.Color('#826749')
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const z = z0 - 3.35 * t
    const edgeX = side * (5.02 - .72 * Math.sin(t * Math.PI))
    const base = height(edgeX, z)
    const lift = .16 + .82 * Math.sin(t * Math.PI) + .14 * Math.sin(t * Math.PI * 2.4 + index)
    const thickness = .22 + .12 * Math.sin(t * Math.PI)
    for (let k = 0; k < 2; k++) {
      const x = edgeX + side * (k ? thickness : 0)
      const y = base + (k ? .04 : lift)
      positions.push(x, y, z + (k ? .10 : -.06))
      const c = green.clone().lerp(earth, .20 + .25 * t)
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function strataTrace(side: -1 | 1, band: number, line: number) {
  const points = Array.from({ length: 52 }, (_, i) => {
    const t = i / 51
    const z0 = 4.9 - band * 7.0
    const z = z0 - t * 8.2
    const depth = THREE.MathUtils.clamp((5.0 - z) / 23, 0, 1)
    const x = side * (5.30 - .18 * Math.sin(z * .36 + band) - .08 * line)
    const y = height(x * .92, z) + .34 + line * .31 + depth * (.44 + .06 * line) + .045 * Math.sin(t * 9 + line)
    return new THREE.Vector3(x, y, z - .10 * line)
  })
  return tube(points, .012 + line * .0015, 6)
}

function MemoryValley({ onWalk }: { onWalk: WalkHandler }) {
  const floor = useMemo(sanctuaryFloorGeometry, [])
  const path = useMemo(memoryPathGeometry, [])
  const ridges = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 3 }, (_, band) => ({ side, band, geometry: ridgeGeometry(side, band) }))), [])
  const fins = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 5 }, (_, index) => ({ side, index, geometry: finGeometry(side, index) }))), [])
  const traces = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 3 }, (_, band) => Array.from({ length: 5 }, (_, line) => ({ side, band, line, geometry: strataTrace(side, band, line) }))).flat()), [])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor">
      <meshStandardMaterial vertexColors roughness={.98} metalness={0}/>
    </mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk">
      <meshStandardMaterial vertexColors roughness={.92} emissive="#4a3422" emissiveIntensity={.16}/>
    </mesh>
    <group name="home-v225-v2-weathered-memory-walls">
      {ridges.map(({ side, band, geometry }) => <mesh key={`${side}-${band}`} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={.98}/>
      </mesh>)}
      {traces.map(({ side, band, line, geometry }) => <mesh key={`${side}-${band}-${line}`} geometry={geometry}>
        <meshStandardMaterial color={line % 2 ? '#708b70' : '#a3825b'} emissive={line % 2 ? '#274f40' : '#604425'} emissiveIntensity={.18} roughness={.80}/>
      </mesh>)}
    </group>
    <group name="home-v225-v2-cathedral-memory-ribs">
      {fins.map(({ side, index, geometry }) => <mesh key={`${side}-${index}`} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={.94}/>
      </mesh>)}
    </group>
  </group>
}

function groundCanopyGeometry() {
  const nu = 44, nv = 30
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const bark = new THREE.Color('#4d5a43')
  const moss = new THREE.Color('#7b7651')
  const amber = new THREE.Color('#ad7043')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu
    const x = -.20 + u * 4.55
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const z = -1.80 + v * 3.60
      const arch = Math.sin(v * Math.PI)
      const y = .15 + 1.78 * arch * (1 - .10 * u) + .28 * Math.sin(u * Math.PI) + .10 * Math.sin(v * 8 + u * 5)
      const xx = x + .18 * Math.sin(v * Math.PI * 2 + u * 3)
      const zz = z + .14 * Math.sin(u * Math.PI * 1.8 + v * 4)
      positions.push(xx, y, zz)
      const c = bark.clone().lerp(moss, .18 + .30 * arch).lerp(amber, .20 * u * arch)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
    const a = iu * row + iv, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function seatRibbon(radius: number, start: number, span: number) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const t = i / 47
    const a = start + span * t
    return new THREE.Vector3(Math.cos(a) * radius, .34 + .035 * Math.sin(t * Math.PI * 3), Math.sin(a) * radius * .76)
  })
  return tube(points, .085, 10)
}

function hearthHalo(index: number) {
  const points = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33
    const a = -.95 + t * 1.90
    const r = 1.10 + index * .16
    return new THREE.Vector3(2.95 + Math.cos(a) * r, .30 + .54 * Math.sin(t * Math.PI) + index * .09, Math.sin(a) * r * .72)
  })
  return tube(points, .025 + index * .004, 8)
}

function GroundHearth({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const canopy = useMemo(groundCanopyGeometry, [])
  const seatA = useMemo(() => seatRibbon(1.50, -.34, 1.45), [])
  const seatB = useMemo(() => seatRibbon(1.82, 2.03, 1.05), [])
  const halos = useMemo(() => Array.from({ length: 4 }, (_, i) => hearthHalo(i)), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} name="home-v225-v2-ground-memory-hearth" onClick={(e) => { e.stopPropagation(); onGround() }}>
    <mesh geometry={canopy} position={[.42,-.04,.05]} rotation={[0,.04,0]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={.94} side={THREE.DoubleSide}/>
    </mesh>
    <mesh position={[2.95,.24,-.05]} scale={[1.28,.24,1.06]} castShadow receiveShadow>
      <sphereGeometry args={[1,58,34,0,Math.PI*2,Math.PI*.53,Math.PI*.47]}/>
      <meshStandardMaterial color="#86563a" emissive="#8f3f22" emissiveIntensity={.58} roughness={.86}/>
    </mesh>
    {halos.map((geometry, i) => <mesh key={i} geometry={geometry} castShadow>
      <meshStandardMaterial color={i % 2 ? '#d7a26f' : '#8b7250'} emissive={i % 2 ? '#94552f' : '#47351f'} emissiveIntensity={.34} roughness={.75}/>
    </mesh>)}
    <mesh geometry={seatA} position={[2.72,.08,.18]} castShadow><meshStandardMaterial color="#967654" roughness={.90}/></mesh>
    <mesh geometry={seatB} position={[2.68,.06,.13]} castShadow><meshStandardMaterial color="#6d6047" roughness={.93}/></mesh>
    {Array.from({ length: 17 }, (_, i) => {
      const a = i * 2.399
      const r = .28 + .052 * (i % 4)
      return <mesh key={i} position={[2.95 + Math.cos(a)*r,.67 + .075*(i%3),-.05 + Math.sin(a)*r*.76]} scale={[.048,.15,.048]}>
        <sphereGeometry args={[1,16,12]}/>
        <meshStandardMaterial color="#f0b184" emissive="#d96d40" emissiveIntensity={1.75} roughness={.62}/>
      </mesh>
    })}
    <pointLight position={[2.95,1.10,-.02]} color="#ffad78" intensity={8.4} distance={9.0}/>
    <pointLight position={[1.45,1.88,-.80]} color="#91c0a7" intensity={1.55} distance={7.0}/>
  </group>
}

function lifeSpine(index: number) {
  const side = index % 2 ? -1 : 1
  const phase = index * .72
  const points = Array.from({ length: 46 }, (_, i) => {
    const t = i / 45
    return new THREE.Vector3(
      -2.65 + side * (.28 + .22 * index) * Math.sin(t * Math.PI) + .10 * Math.sin(t * 6 + phase),
      .08 + t * (2.20 + .17 * index) + .24 * Math.sin(t * Math.PI),
      .22 - t * (1.05 + .10 * index) + .12 * Math.sin(t * 5 + phase),
    )
  })
  return tube(points, .050 - Math.min(index, 4) * .003, 9)
}

function memoryBridge(index: number) {
  const tier = Math.floor(index / 2)
  const side = index % 2 ? -1 : 1
  const y0 = .54 + tier * .39
  const points = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33
    return new THREE.Vector3(
      -2.62 + side * t * (1.10 + tier * .16),
      y0 + .20 * Math.sin(t * Math.PI) + .04 * Math.sin(t * 7 + index),
      -.15 - t * (.44 + tier * .05) + .10 * Math.sin(t * 4 + index),
    )
  })
  return { geometry: tube(points, .027 + tier * .002, 8), end: points[points.length - 1] }
}

function rootRibbon(index: number) {
  const side = index % 2 ? -1 : 1
  const angle = -.95 + index * .31
  const points = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27
    return new THREE.Vector3(
      -2.62 + side * t * (1.10 + index * .06),
      .05 + .08 * Math.sin(t * Math.PI),
      .12 + Math.sin(angle) * t * 1.18 + .10 * Math.sin(t * 5 + index),
    )
  })
  return tube(points, .045, 8)
}

function LifeMapObservatory({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const spines = useMemo(() => Array.from({ length: 5 }, (_, i) => lifeSpine(i)), [])
  const bridges = useMemo(() => Array.from({ length: 14 }, (_, i) => memoryBridge(i)), [])
  const roots = useMemo(() => Array.from({ length: 8 }, (_, i) => rootRibbon(i)), [])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} name="home-v225-v2-life-map-lineage-observatory" onClick={(e) => { e.stopPropagation(); onLifeMap() }}>
    {roots.map((geometry, i) => <mesh key={`root-${i}`} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={i%2 ? '#456f62' : '#6f5f58'} roughness={.88} emissive="#183f35" emissiveIntensity={.16}/>
    </mesh>)}
    {spines.map((geometry, i) => <mesh key={`spine-${i}`} geometry={geometry} castShadow receiveShadow>
      <meshPhysicalMaterial color={i%2 ? '#4c8877' : '#756682'} emissive={i%2 ? '#245f50' : '#493654'} emissiveIntensity={.42} roughness={.48} clearcoat={.08}/>
    </mesh>)}
    {bridges.map(({ geometry, end }, i) => <group key={`bridge-${i}`}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={i%2 ? '#8bc2ad' : '#b394ba'} emissive={i%2 ? '#387864' : '#684e72'} emissiveIntensity={.55} roughness={.55}/>
      </mesh>
      <mesh position={end} scale={[.095 + (i%3)*.016,.095 + (i%2)*.015,.095]}>
        <sphereGeometry args={[1,24,18]}/>
        <meshPhysicalMaterial color={i%2 ? '#c0e3d3' : '#dec7e1'} emissive={i%2 ? '#63b697' : '#9a73a7'} emissiveIntensity={1.15} roughness={.34} clearcoat={.08}/>
      </mesh>
    </group>)}
    <pointLight position={[-2.35,1.85,-.35]} color="#7ad3b0" intensity={3.4} distance={7.2}/>
    <pointLight position={[-1.65,2.70,-.75]} color="#b99ac8" intensity={1.8} distance={6.2}/>
  </group>
}

function orbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 144, 108)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const deep = new THREE.Color('#0d3028')
  const green = new THREE.Color('#3f9277')
  const pale = new THREE.Color('#a8d1bf')
  const warm = new THREE.Color('#c48669')
  for (let i = 0; i < p.count; i++) {
    const bx = p.getX(i), by = p.getY(i), bz = p.getZ(i)
    const angle = Math.atan2(bz, bx)
    const upper = Math.max(0, by)
    const lower = Math.max(0, -by)
    const shoulder = 1 + .34 * upper
    const bottomPinch = Math.max(.16, 1 - .84 * Math.pow(lower, 1.12))
    const cleft = Math.exp(-Math.pow((bx + .02) / .18, 2) - Math.pow((by - .77) / .15, 2))
    const leftLobe = bx < -.05 ? 1.11 : .94
    const fold = 1 + .052 * Math.sin(angle * 3.15 + by * 7.4) + .022 * Math.sin(angle * 7.7 - by * 9.2)
    let x = bx * .86 * shoulder * bottomPinch * fold * leftLobe
    let z = bz * (.59 + .09 * upper) * bottomPinch * (1 + .030 * Math.sin(angle * 4.1 - by * 5.6))
    let y = by * .90 - .44 * cleft - .34 * Math.pow(lower, 1.25)
    x += .080 * (1 - by * by) + .030 * bz
    y += .028 * Math.sin(angle * 3.5 + by * 8.2) * (1 - Math.abs(by))
    z += .024 * Math.sin(angle * 2.7 - by * 5.8) * (1 - Math.abs(by))
    p.setXYZ(i, x, y, z)
    const sideLight = Math.max(0, Math.cos(angle - .35)) * (1 - Math.abs(by))
    const band = .5 + .5 * Math.sin(angle * 3.4 + by * 6.8)
    const c = deep.clone().lerp(green, .34 + .34 * band).lerp(pale, .16 * sideLight).lerp(warm, .20 * Math.max(0, Math.cos(angle + 1.05)) * (1 - Math.abs(by)))
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function orbVein(index: number) {
  const side = index % 2 ? -1 : 1
  const points = Array.from({ length: 38 }, (_, i) => {
    const t = i / 37
    const y = .60 - index * .052 - t * (.78 + index * .014)
    const width = .46 * (1 - .56 * Math.max(0, -y))
    return new THREE.Vector3(
      side * width * (.54 + .25 * Math.sin(t * Math.PI + index * .42)) + .035,
      y,
      .36 * Math.sin(t * Math.PI * 1.10 + index * .49) * (1 - .30 * t) + .03,
    )
  })
  return tube(points, .009 + index * .00036, 7)
}

function groundingFilament(index: number) {
  const side = index - 2
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29
    return new THREE.Vector3(
      side * .10 * (1 + .75 * t) + .025 * Math.sin(t * 7 + index),
      -.49 - .58 * t,
      .04 + .24 * t + .035 * Math.sin(t * 5 + index),
    )
  })
  return tube(points, .009, 7)
}

type Posture = { s: V3; r: V3; speed: number }
const posture: Record<OrbState, Posture> = {
  dormant:{s:[.92,.89,.91],r:[.04,-.06,-.03],speed:.10}, idle:{s:[1,.99,.98],r:[-.04,.05,-.02],speed:.30},
  attention:{s:[1.035,1.05,.96],r:[-.10,.12,.05],speed:.62}, listening:{s:[.98,1.04,.97],r:[.08,-.06,-.04],speed:.22},
  thinking:{s:[1.02,.99,1.01],r:[-.11,.14,.07],speed:.18}, speaking:{s:[1.045,1.03,.97],r:[.03,-.02,-.08],speed:.80},
  guiding:{s:[.99,1.055,.96],r:[-.12,.02,.08],speed:.42}, reflecting:{s:[.99,.98,1.025],r:[.10,.08,-.06],speed:.14},
  calming:{s:[1.01,.97,.99],r:[-.02,-.04,.02],speed:.12}, privacy:{s:[.91,.91,.90],r:[.12,.08,.10],speed:.08},
  warning:{s:[1.04,1.045,.95],r:[-.14,-.06,-.10],speed:.95}, transition:{s:[.95,1.06,.93],r:[-.14,.04,.10],speed:.65},
}

function LivingMemoryOrb({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(orbGeometry, [])
  const veins = useMemo(() => Array.from({ length: 13 }, (_, i) => orbVein(i)), [])
  const filaments = useMemo(() => Array.from({ length: 5 }, (_, i) => groundingFilament(i)), [])
  const p = posture[state]
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime * p.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .007
    group.current.scale.set(p.s[0] * breath, p.s[1] * breath, p.s[2] * breath)
    group.current.rotation.set(p.r[0], p.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .016), p.r[2])
  })
  const warning = state === 'warning'
  const activate = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onOrb() }
  return <group ref={group} position={ORB} name="home-v225-v2-intimate-veined-living-memory-orb" onClick={activate}>
    <mesh geometry={geometry} position={[0,-.22,0]} scale={[.80,.92,.72]} castShadow>
      <meshPhysicalMaterial vertexColors color="#d4e4dc" roughness={.58} clearcoat={.05} clearcoatRoughness={.86} sheen={.16} sheenColor="#659b86" emissive="#103b30" emissiveIntensity={.17}/>
    </mesh>
    <group position={[0,-.22,0]} scale={[.80,.92,.72]} name="home-v225-v2-orb-embedded-memory-veins">
      {veins.map((g,i) => <mesh key={i} geometry={g}>
        <meshStandardMaterial color={warning ? '#d77a68' : i%2 ? '#98cdb6' : '#d19a80'} emissive={warning ? '#8a392f' : i%2 ? '#397561' : '#865139'} emissiveIntensity={.60} roughness={.56}/>
      </mesh>)}
    </group>
    <group position={[0,-.22,0]} scale={[.80,.92,.72]}>
      {filaments.map((g,i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#5e846f" emissive="#2b5a49" emissiveIntensity={.28} roughness={.78}/></mesh>)}
    </group>
    <mesh position={[0,-.22,0]} scale={[.89,1.06,.82]} onClick={activate}>
      <sphereGeometry args={[1,28,20]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    <pointLight position={[.06,-.02,.30]} color={warning ? '#d56d5d' : '#7fd4b4'} intensity={state === 'dormant' ? .16 : .82} distance={3.6}/>
  </group>
}

function AtmosphericDepth() {
  const field = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 240; i++) {
      const a = i * 2.39996323
      const r = 2.2 + ((i * 37) % 100) / 100 * 9.2
      pts.push(Math.cos(a) * r, .42 + ((i * 29) % 100) / 100 * 4.2, 3.5 - ((i * 53) % 100) / 100 * 19.4)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return <group name="home-v225-v2-bounded-atmospheric-depth">
    <points geometry={field}><pointsMaterial color="#b9d6c7" size={.018} transparent opacity={.24} depthWrite={false}/></points>
    <pointLight position={[0,3.8,-12]} color="#79aa97" intensity={.88} distance={15}/>
    <pointLight position={[-3.0,2.0,-8]} color="#d69765" intensity={1.15} distance={10}/>
    <pointLight position={[3.2,2.4,-9]} color="#8fb0a8" intensity={.72} distance={10}/>
  </group>
}

export function HomeV225PolishV2({
  orbState,
  reducedMotion,
  onOrb,
  onGround,
  onLifeMap,
  onWalk,
}: {
  orbState: OrbState
  reducedMotion: boolean
  onOrb: () => void
  onGround: () => void
  onLifeMap: () => void
  onWalk: WalkHandler
}) {
  return <group name="home-v225-v2-production-memory-sanctuary">
    <RetireRejectedPresentation/>
    <MemoryValley onWalk={onWalk}/>
    <GroundHearth onGround={onGround}/>
    <LifeMapObservatory onLifeMap={onLifeMap}/>
    <LivingMemoryOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <AtmosphericDepth/>
  </group>
}
