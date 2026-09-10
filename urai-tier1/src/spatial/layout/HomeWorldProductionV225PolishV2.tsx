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
  const nx = 120, nz = 164
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#10231f')
  const moss = new THREE.Color('#285044')
  const earth = new THREE.Color('#71563c')
  const cool = new THREE.Color('#3d7165')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.2 - iz / nz * 25.5
    for (let ix = 0; ix <= nx; ix++) {
      const x = -8.8 + ix / nx * 17.6
      const depth = THREE.MathUtils.clamp((5.0 - z) / 22.5, 0, 1)
      const lane = Math.exp(-Math.pow(x / 2.45, 2))
      const broad = .048 * Math.sin(x * .67 + z * .29) + .032 * Math.cos(x * 1.17 - z * .53)
      const fine = .022 * Math.sin(x * 3.3 + z * 1.67) * Math.cos(z * 2.31 - x * .58)
      const sideFold = Math.pow(THREE.MathUtils.clamp((Math.abs(x) - 2.2) / 6.4, 0, 1), 1.26)
      const channel = -.045 * lane * Math.exp(-Math.pow((z + 6.0) / 9.8, 2))
      const y = height(x, z) + broad * (1 - .64 * lane) + fine + .25 * sideFold * (.32 + depth) + channel + .025
      positions.push(x, y, z)
      const edge = THREE.MathUtils.clamp(Math.abs(x) / 8.8, 0, 1)
      const mottled = .5 + .5 * Math.sin(x * 2.2 + z * 1.05) * Math.sin(z * .81 - x * .94)
      const c = deep.clone().lerp(moss, .34 + .30 * (1 - edge)).lerp(earth, .19 * lane + .09 * mottled).lerp(cool, .13 * depth)
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
  const segments = 128, across = 16
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const ember = new THREE.Color('#b88f60')
  const quiet = new THREE.Color('#326151')
  const pale = new THREE.Color('#cab78e')
  const centers = Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    const z = 5.0 - t * 21.0
    const x = .24 * Math.sin(t * Math.PI * 2.05) + .08 * Math.sin(t * Math.PI * 5.1)
    return new THREE.Vector3(x, height(x, z) + .085, z)
  })
  for (let i = 0; i <= segments; i++) {
    const tangent = centers[Math.min(segments, i + 1)].clone().sub(centers[Math.max(0, i - 1)]).normalize()
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
    for (let j = 0; j < across; j++) {
      const u = j / (across - 1) - .5
      const width = 2.02 + .13 * Math.sin(i * .16)
      const p = centers[i].clone().addScaledVector(side, u * width)
      p.y += .034 * Math.cos(u * Math.PI * 2) + .012 * Math.sin(i * .27 + u * 5)
      positions.push(p.x, p.y, p.z)
      const c = quiet.clone().lerp(ember, .36 + .50 * (1 - Math.abs(u) * 2)).lerp(pale, .11 * Math.sin(i / segments * Math.PI))
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

function escarpmentGeometry(side: -1 | 1, band: number) {
  const nz = 78, nv = 34
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color(side < 0 ? '#17362d' : '#153c34')
  const stone = new THREE.Color(side < 0 ? '#53664f' : '#456a5d')
  const warm = new THREE.Color('#866748')
  const zStart = 5.5 - band * 7.0
  const zEnd = zStart - 9.0
  for (let iz = 0; iz <= nz; iz++) {
    const u = iz / nz
    const z = THREE.MathUtils.lerp(zStart, zEnd, u)
    const depth = THREE.MathUtils.clamp((5.0 - z) / 23, 0, 1)
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const baseX = side * (5.82 + .32 * Math.sin(z * .27 + band * 1.8) + .16 * Math.sin(z * .83 - band))
      const alcove = Math.pow(Math.sin(v * Math.PI), 1.18) * (1.12 + .18 * band)
      const fracture = .25 * Math.sin(v * Math.PI * 4.4 + u * 5.8 + band) + .11 * Math.sin(v * 18 - u * 4.2)
      const x = baseX - side * (alcove + fracture * .20)
      const floor = height(x * .90, z)
      const total = 2.05 + 1.58 * depth + .34 * band
      const y = floor - .08 + v * total + .14 * Math.sin(v * Math.PI * 3.2 + u * 6.6 + band) + .052 * Math.sin(v * 19 + u * 11)
      const zz = z - .23 * v + .12 * Math.sin(v * 6.4 + u * 4.4 + band)
      positions.push(x, y, zz)
      const strata = .5 + .5 * Math.sin(v * 31 + u * 8 + band)
      const c = dark.clone().lerp(stone, .28 + .46 * v).lerp(warm, .11 * strata)
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

function sanctuaryFold(side: -1 | 1, index: number) {
  const points = Array.from({ length: 38 }, (_, i) => {
    const t = i / 37
    const z = 3.5 - index * 4.2 - 3.1 * t
    const x = side * (4.92 - .82 * Math.sin(t * Math.PI))
    return new THREE.Vector3(
      x,
      height(x, z) + .20 + .78 * Math.sin(t * Math.PI) + .11 * Math.sin(t * 7 + index),
      z,
    )
  })
  return tube(points, .052, 9)
}

function MemoryValley({ onWalk }: { onWalk: WalkHandler }) {
  const floor = useMemo(sanctuaryFloorGeometry, [])
  const path = useMemo(memoryPathGeometry, [])
  const walls = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 3 }, (_, band) => ({ side, band, geometry: escarpmentGeometry(side, band) }))), [])
  const folds = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 5 }, (_, index) => ({ side, index, geometry: sanctuaryFold(side, index) }))), [])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor">
      <meshStandardMaterial vertexColors roughness={.98} metalness={0}/>
    </mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk">
      <meshStandardMaterial vertexColors roughness={.90} emissive="#543820" emissiveIntensity={.18}/>
    </mesh>
    <group name="home-v225-v2-weathered-memory-walls">
      {walls.map(({ side, band, geometry }) => <mesh key={`${side}-${band}`} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={.97}/>
      </mesh>)}
    </group>
    <group name="home-v225-v2-cathedral-memory-ribs">
      {folds.map(({ side, index, geometry }) => <mesh key={`${side}-${index}`} geometry={geometry} castShadow>
        <meshStandardMaterial color={side < 0 ? '#718066' : '#55786a'} emissive={index % 2 ? '#493921' : '#21493e'} emissiveIntensity={.15} roughness={.84}/>
      </mesh>)}
    </group>
  </group>
}

function groundCoveGeometry() {
  const nu = 54, nv = 36
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#493326')
  const amber = new THREE.Color('#a9683c')
  const moss = new THREE.Color('#536c54')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu
    const theta = -.96 + u * 1.92
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const radius = 2.25 - .32 * v + .12 * Math.sin(u * Math.PI * 4 + v * 5)
      const inward = .52 + 2.25 * u
      const x = inward + Math.cos(theta) * radius * (.42 + .58 * v)
      const z = Math.sin(theta) * radius * .82
      const arch = Math.sin(v * Math.PI)
      const y = .02 + v * 1.82 + .50 * arch + .10 * Math.sin(u * 8 + v * 5)
      positions.push(x, y, z)
      const c = deep.clone().lerp(amber, .34 + .42 * arch).lerp(moss, .18 * (1 - u))
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
    const a = iu * row + iv, b = a + 1, c = a + row, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function hearthBasinGeometry() {
  const g = new THREE.SphereGeometry(1, 64, 34, 0, Math.PI * 2, Math.PI * .50, Math.PI * .50)
  g.scale(1.38, .30, 1.10)
  return g
}

function GroundHearth({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const cove = useMemo(groundCoveGeometry, [])
  const basin = useMemo(hearthBasinGeometry, [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} name="home-v225-v2-ground-memory-hearth" onClick={(e) => { e.stopPropagation(); onGround() }}>
    <mesh geometry={cove} position={[.05,-.06,.05]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={.91} side={THREE.DoubleSide}/>
    </mesh>
    <mesh geometry={basin} position={[2.72,.16,-.06]} castShadow receiveShadow>
      <meshStandardMaterial color="#8c5235" emissive="#8d3b22" emissiveIntensity={.72} roughness={.84}/>
    </mesh>
    <mesh position={[2.72,.46,-.06]} scale={[.82,.20,.68]}>
      <sphereGeometry args={[1,32,22]}/>
      <meshPhysicalMaterial color="#f0a56f" emissive="#df693d" emissiveIntensity={1.65} transparent opacity={.82} roughness={.42}/>
    </mesh>
    {Array.from({ length: 7 }, (_, i) => {
      const a = -.90 + i * .30
      return <mesh key={i} position={[2.72 + Math.cos(a)*1.56,.32 + .05*(i%2),-.06 + Math.sin(a)*1.05]} scale={[.26,.12,.48]} rotation={[0,-a,0]} castShadow>
        <sphereGeometry args={[1,26,18]}/>
        <meshStandardMaterial color={i%2 ? '#8f7656' : '#6c684f'} roughness={.94}/>
      </mesh>
    })}
    <pointLight position={[2.72,1.08,-.03]} color="#ffac76" intensity={9.0} distance={9.5}/>
    <pointLight position={[1.18,1.82,-.72]} color="#9ac7ad" intensity={1.7} distance={7.2}/>
  </group>
}

function lifeVaultGeometry() {
  const nu = 64, nv = 46
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#183a35')
  const teal = new THREE.Color('#4b887b')
  const violet = new THREE.Color('#736884')
  const gold = new THREE.Color('#b7a16e')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu
    const x = -3.10 + u * 4.65
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const y = .12 + v * 3.35
      const arch = Math.sin(v * Math.PI)
      const fold = .44 * Math.sin(u * Math.PI * 2.3 + v * 4.2) + .18 * Math.sin(u * 9 - v * 6)
      const z = -.58 - 1.05 * arch + .22 * fold + .18 * Math.sin(u * Math.PI)
      const xx = x + .28 * arch * Math.sin(u * Math.PI * 2) + .10 * Math.sin(v * 8 + u * 4)
      positions.push(xx, y + .14 * Math.sin(u * 6 + v * 3) * arch, z)
      const c = deep.clone().lerp(teal, .34 + .30 * arch).lerp(violet, .24 * u).lerp(gold, .12 * (1 - Math.abs(u - .5) * 2))
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
    const a = iu * row + iv, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function lifeRootGeometry(index: number) {
  const side = index % 2 ? -1 : 1
  const points = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27
    return new THREE.Vector3(
      -1.25 + side * t * (1.10 + index * .08),
      .06 + .08 * Math.sin(t * Math.PI),
      -.05 + t * (.68 + .06 * index) + .08 * Math.sin(t * 5 + index),
    )
  })
  return tube(points, .040, 8)
}

function LifeMapObservatory({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const vault = useMemo(lifeVaultGeometry, [])
  const roots = useMemo(() => Array.from({ length: 7 }, (_, i) => lifeRootGeometry(i)), [])
  const nodes = useMemo(() => Array.from({ length: 26 }, (_, i) => {
    const u = ((i * 37) % 101) / 100
    const v = .12 + ((i * 53) % 83) / 100 * .76
    const x = -3.00 + u * 4.45
    const y = .20 + v * 3.05
    const arch = Math.sin(v * Math.PI)
    const z = -.52 - 1.06 * arch + .14 * Math.sin(u * 8 + v * 5)
    return { p: [x,y,z] as V3, s: .052 + (i%4)*.010, warm: i%5===0 }
  }), [])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} name="home-v225-v2-life-map-lineage-observatory" onClick={(e) => { e.stopPropagation(); onLifeMap() }}>
    <mesh geometry={vault} castShadow receiveShadow>
      <meshPhysicalMaterial vertexColors roughness={.58} metalness={0} clearcoat={.05} side={THREE.DoubleSide}/>
    </mesh>
    {roots.map((geometry, i) => <mesh key={`root-${i}`} geometry={geometry} castShadow>
      <meshStandardMaterial color={i%2 ? '#53786b' : '#7d6758'} emissive="#254d41" emissiveIntensity={.18} roughness={.80}/>
    </mesh>)}
    {nodes.map((node, i) => <mesh key={i} position={node.p} scale={node.s}>
      <sphereGeometry args={[1,18,14]}/>
      <meshPhysicalMaterial color={node.warm ? '#e1ba7c' : i%2 ? '#a9ddca' : '#c9b6dc'} emissive={node.warm ? '#a26731' : i%2 ? '#4c9e84' : '#7c5c96'} emissiveIntensity={1.25} roughness={.30}/>
    </mesh>)}
    <pointLight position={[-1.0,1.90,-.70]} color="#7fd0b4" intensity={3.1} distance={7.0}/>
    <pointLight position={[-2.3,2.65,-1.0]} color="#bda1ce" intensity={1.65} distance={6.0}/>
  </group>
}

function orbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 152, 112)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const deep = new THREE.Color('#0a2d26')
  const green = new THREE.Color('#3e8f75')
  const pale = new THREE.Color('#acd5c2')
  const warm = new THREE.Color('#c98065')
  for (let i = 0; i < p.count; i++) {
    const bx = p.getX(i), by = p.getY(i), bz = p.getZ(i)
    const angle = Math.atan2(bz, bx)
    const upper = Math.max(0, by)
    const lower = Math.max(0, -by)
    const topCleft = Math.exp(-Math.pow(bx / .17, 2) - Math.pow((by - .77) / .15, 2))
    const lobeBias = bx < 0 ? 1.12 : .96
    const lowerTaper = Math.max(.10, 1 - .88 * Math.pow(lower, 1.08))
    const shoulder = 1 + .38 * upper
    const surfaceFold = 1 + .060 * Math.sin(angle * 3.2 + by * 7.8) + .026 * Math.sin(angle * 8.2 - by * 10.1)
    let x = bx * .90 * shoulder * lowerTaper * lobeBias * surfaceFold
    let z = bz * (.60 + .10 * upper) * lowerTaper * (1 + .035 * Math.sin(angle * 4.5 - by * 5.2))
    let y = by * .82 - .52 * topCleft - .48 * Math.pow(lower, 1.12)
    x += .085 * (1 - by * by) + .030 * bz
    y += .032 * Math.sin(angle * 3.7 + by * 8.5) * (1 - Math.abs(by))
    z += .028 * Math.sin(angle * 2.9 - by * 5.9) * (1 - Math.abs(by))
    p.setXYZ(i, x, y, z)
    const sideLight = Math.max(0, Math.cos(angle - .32)) * (1 - Math.abs(by))
    const band = .5 + .5 * Math.sin(angle * 3.8 + by * 7.2)
    const c = deep.clone().lerp(green, .32 + .34 * band).lerp(pale, .18 * sideLight).lerp(warm, .22 * Math.max(0, Math.cos(angle + 1.08)) * (1 - Math.abs(by)))
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function orbVein(index: number) {
  const side = index % 2 ? -1 : 1
  const points = Array.from({ length: 40 }, (_, i) => {
    const t = i / 39
    const y = .56 - index * .048 - t * (.72 + index * .012)
    const width = .46 * (1 - .63 * Math.max(0, -y))
    return new THREE.Vector3(
      side * width * (.56 + .25 * Math.sin(t * Math.PI + index * .42)) + .035,
      y,
      .34 * Math.sin(t * Math.PI * 1.12 + index * .49) * (1 - .32 * t) + .03,
    )
  })
  return tube(points, .009 + index * .00034, 7)
}

function groundingFilament(index: number) {
  const side = index - 2
  const points = Array.from({ length: 32 }, (_, i) => {
    const t = i / 31
    return new THREE.Vector3(
      side * .09 * (1 + .72 * t) + .024 * Math.sin(t * 7 + index),
      -.49 - .62 * t,
      .05 + .27 * t + .034 * Math.sin(t * 5 + index),
    )
  })
  return tube(points, .0085, 7)
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
  const veins = useMemo(() => Array.from({ length: 14 }, (_, i) => orbVein(i)), [])
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
    <mesh geometry={geometry} position={[0,-.28,0]} scale={[.82,.94,.72]} castShadow>
      <meshPhysicalMaterial vertexColors color="#d4e5dd" roughness={.56} clearcoat={.04} clearcoatRoughness={.88} sheen={.16} sheenColor="#659b86" emissive="#103b30" emissiveIntensity={.18}/>
    </mesh>
    <group position={[0,-.28,0]} scale={[.82,.94,.72]} name="home-v225-v2-orb-embedded-memory-veins">
      {veins.map((g,i) => <mesh key={i} geometry={g}>
        <meshStandardMaterial color={warning ? '#d77a68' : i%2 ? '#9ad0b8' : '#d39b80'} emissive={warning ? '#8a392f' : i%2 ? '#3b7863' : '#875039'} emissiveIntensity={.64} roughness={.54}/>
      </mesh>)}
    </group>
    <group position={[0,-.28,0]} scale={[.82,.94,.72]}>
      {filaments.map((g,i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#608672" emissive="#2c5b4a" emissiveIntensity={.30} roughness={.76}/></mesh>)}
    </group>
    <mesh position={[0,-.28,0]} scale={[.91,1.06,.82]} onClick={activate}>
      <sphereGeometry args={[1,28,20]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    <pointLight position={[.05,-.06,.28]} color={warning ? '#d56d5d' : '#80d8b7'} intensity={state === 'dormant' ? .16 : .86} distance={3.8}/>
  </group>
}

function AtmosphericDepth() {
  const field = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 250; i++) {
      const a = i * 2.39996323
      const r = 2.2 + ((i * 37) % 100) / 100 * 9.2
      pts.push(Math.cos(a) * r, .42 + ((i * 29) % 100) / 100 * 4.2, 3.5 - ((i * 53) % 100) / 100 * 19.4)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return <group name="home-v225-v2-bounded-atmospheric-depth">
    <points geometry={field}><pointsMaterial color="#bad8c8" size={.018} transparent opacity={.24} depthWrite={false}/></points>
    <pointLight position={[0,3.8,-12]} color="#79aa97" intensity={.90} distance={15}/>
    <pointLight position={[-2.9,2.0,-8]} color="#de9a67" intensity={1.28} distance={10}/>
    <pointLight position={[3.0,2.4,-9]} color="#93b8ad" intensity={.78} distance={10}/>
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
