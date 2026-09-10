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
  const deep = new THREE.Color('#14231f')
  const moss = new THREE.Color('#2f493d')
  const earth = new THREE.Color('#6a5a43')
  const cool = new THREE.Color('#49695f')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.2 - iz / nz * 25.5
    for (let ix = 0; ix <= nx; ix++) {
      const x = -8.8 + ix / nx * 17.6
      const depth = THREE.MathUtils.clamp((5.0 - z) / 22.5, 0, 1)
      const lane = Math.exp(-Math.pow(x / 2.55, 2))
      const broad = .030 * Math.sin(x * .72 + z * .31) + .020 * Math.cos(x * 1.36 - z * .47)
      const fine = .012 * Math.sin(x * 3.10 + z * 1.73) * Math.cos(z * 2.16 - x * .62)
      const sideFold = Math.pow(THREE.MathUtils.clamp((Math.abs(x) - 2.45) / 6.0, 0, 1), 1.35)
      const y = height(x, z) + broad * (1 - .72 * lane) + fine + .18 * sideFold * (.35 + depth) + .022
      positions.push(x, y, z)
      const edge = THREE.MathUtils.clamp(Math.abs(x) / 8.8, 0, 1)
      const mottled = .5 + .5 * Math.sin(x * 1.9 + z * 1.2) * Math.sin(z * .73 - x * .81)
      const c = deep.clone().lerp(moss, .30 + .30 * (1 - edge)).lerp(earth, .13 * lane + .06 * mottled).lerp(cool, .10 * depth)
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
  const ember = new THREE.Color('#9b8060')
  const quiet = new THREE.Color('#3f5b4d')
  const pale = new THREE.Color('#b3a88d')
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
      const c = quiet.clone().lerp(ember, .34 + .48 * (1 - Math.abs(u) * 2)).lerp(pale, .08 * Math.sin(i / segments * Math.PI))
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
  const dark = new THREE.Color(side < 0 ? '#20362d' : '#203833')
  const stone = new THREE.Color(side < 0 ? '#4c5b49' : '#425c54')
  const warm = new THREE.Color('#78624b')
  const zStart = 5.2 - band * 7.1
  const zEnd = zStart - 8.8
  for (let iz = 0; iz <= nz; iz++) {
    const u = iz / nz
    const z = THREE.MathUtils.lerp(zStart, zEnd, u)
    const depth = THREE.MathUtils.clamp((5.0 - z) / 23, 0, 1)
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const baseX = side * (5.55 + .28 * Math.sin(z * .31 + band * 1.6) + .14 * Math.sin(z * .91 - band))
      const inward = Math.pow(Math.sin(v * Math.PI), 1.25) * (1.08 + .20 * band)
      const shelf = .20 * Math.sin(v * Math.PI * 4.2 + u * 5.2 + band) + .08 * Math.sin(v * 17 - u * 4)
      const x = baseX - side * (inward + shelf * .18)
      const floor = height(x * .90, z)
      const total = 2.20 + 1.80 * depth + .42 * band
      const y = floor - .06 + v * total + .12 * Math.sin(v * Math.PI * 3.3 + u * 6.2 + band) + .045 * Math.sin(v * 19 + u * 11)
      const zz = z - .20 * v + .10 * Math.sin(v * 6.2 + u * 4.4 + band)
      positions.push(x, y, zz)
      const strata = .5 + .5 * Math.sin(v * 30 + u * 8 + band)
      const c = dark.clone().lerp(stone, .30 + .42 * v).lerp(warm, .08 * strata)
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
  const green = new THREE.Color('#506b59')
  const earth = new THREE.Color('#725f48')
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const z = z0 - 3.35 * t
    const edgeX = side * (4.90 - .88 * Math.sin(t * Math.PI))
    const base = height(edgeX, z)
    const lift = .18 + 1.10 * Math.sin(t * Math.PI) + .18 * Math.sin(t * Math.PI * 2.4 + index)
    const thickness = .28 + .16 * Math.sin(t * Math.PI)
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

function MemoryValley({ onWalk }: { onWalk: WalkHandler }) {
  const floor = useMemo(sanctuaryFloorGeometry, [])
  const path = useMemo(memoryPathGeometry, [])
  const ridges = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 3 }, (_, band) => ({ side, band, geometry: ridgeGeometry(side, band) }))), [])
  const fins = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 5 }, (_, index) => ({ side, index, geometry: finGeometry(side, index) }))), [])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor">
      <meshStandardMaterial vertexColors roughness={.98} metalness={0}/>
    </mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk">
      <meshStandardMaterial vertexColors roughness={.92} emissive="#382e24" emissiveIntensity={.11}/>
    </mesh>
    <group name="home-v225-v2-weathered-memory-walls">
      {ridges.map(({ side, band, geometry }) => <mesh key={`${side}-${band}`} geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors roughness={.98}/>
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
  const nu = 38, nv = 24
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const bark = new THREE.Color('#4b5947')
  const moss = new THREE.Color('#6b765a')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu
    const x = -.50 + u * 4.25
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const z = -1.70 + v * 3.35
      const arch = Math.sin(v * Math.PI)
      const y = .18 + 1.46 * arch * (1 - .14 * u) + .20 * Math.sin(u * Math.PI) + .08 * Math.sin(v * 8 + u * 5)
      const xx = x + .16 * Math.sin(v * Math.PI * 2 + u * 3)
      const zz = z + .12 * Math.sin(u * Math.PI * 1.8 + v * 4)
      positions.push(xx, y, zz)
      const c = bark.clone().lerp(moss, .22 + .34 * arch)
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
  const n = 44
  const points = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const a = start + span * t
    return new THREE.Vector3(Math.cos(a) * radius, .34 + .035 * Math.sin(t * Math.PI * 3), Math.sin(a) * radius * .76)
  })
  return tube(points, .085, 10)
}

function GroundHearth({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const canopy = useMemo(groundCanopyGeometry, [])
  const seatA = useMemo(() => seatRibbon(1.45, -.30, 1.35), [])
  const seatB = useMemo(() => seatRibbon(1.78, 2.05, .95), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} name="home-v225-v2-ground-memory-hearth" onClick={(e) => { e.stopPropagation(); onGround() }}>
    <mesh geometry={canopy} position={[.18,-.04,.10]} rotation={[0,.04,0]} castShadow receiveShadow>
      <meshStandardMaterial vertexColors roughness={.96} side={THREE.DoubleSide}/>
    </mesh>
    <mesh position={[2.28,.20,-.05]} scale={[1.18,.22,.98]} castShadow receiveShadow>
      <sphereGeometry args={[1,52,30,0,Math.PI*2,Math.PI*.53,Math.PI*.47]}/>
      <meshStandardMaterial color="#744f38" emissive="#743821" emissiveIntensity={.38} roughness={.90}/>
    </mesh>
    <mesh geometry={seatA} position={[2.10,.08,.15]} castShadow><meshStandardMaterial color="#8a7254" roughness={.91}/></mesh>
    <mesh geometry={seatB} position={[2.05,.06,.12]} castShadow><meshStandardMaterial color="#665b47" roughness={.94}/></mesh>
    {Array.from({ length: 13 }, (_, i) => {
      const a = i * 2.399
      const r = .26 + .05 * (i % 4)
      return <mesh key={i} position={[2.28 + Math.cos(a)*r,.62 + .07*(i%3),-.05 + Math.sin(a)*r*.76]} scale={[.045,.14,.045]}>
        <sphereGeometry args={[1,16,12]}/>
        <meshStandardMaterial color="#e4aa7d" emissive="#cb6840" emissiveIntensity={1.45} roughness={.66}/>
      </mesh>
    })}
    <pointLight position={[2.28,1.05,-.02]} color="#f0a176" intensity={6.2} distance={7.8}/>
    <pointLight position={[1.05,1.72,-.85]} color="#8ebda5" intensity={1.30} distance={6.5}/>
  </group>
}

function lineageTrunkGeometry() {
  const points = Array.from({ length: 42 }, (_, i) => {
    const t = i / 41
    return new THREE.Vector3(
      -.12 + .14 * Math.sin(t * 5.2) - .10 * t,
      .06 + t * 3.20,
      .05 - .38 * t + .08 * Math.sin(t * 7.1),
    )
  })
  return tube(points, .10, 11)
}

function lineageBranch(index: number) {
  const side = index % 2 ? -1 : 1
  const tier = Math.floor(index / 2)
  const originY = .55 + tier * .43
  const span = 1.02 + tier * .17
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29
    return new THREE.Vector3(
      -.10 + side * span * Math.pow(t, .78) + .08 * Math.sin(index + t * 5.3),
      originY + t * (.66 + tier * .055) + .16 * Math.sin(t * Math.PI),
      -.12 - t * (.52 + tier * .07) + .08 * Math.sin(t * 4 + index),
    )
  })
  return { geometry: tube(points, .032 + tier * .004, 8), end: points[points.length - 1] }
}

function rootRibbon(index: number) {
  const side = index % 2 ? -1 : 1
  const angle = -.95 + index * .31
  const points = Array.from({ length: 26 }, (_, i) => {
    const t = i / 25
    return new THREE.Vector3(
      side * t * (1.05 + index * .06),
      .05 + .08 * Math.sin(t * Math.PI),
      .12 + Math.sin(angle) * t * 1.15 + .10 * Math.sin(t * 5 + index),
    )
  })
  return tube(points, .045, 8)
}

function LifeMapObservatory({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const trunk = useMemo(lineageTrunkGeometry, [])
  const branches = useMemo(() => Array.from({ length: 12 }, (_, i) => lineageBranch(i)), [])
  const roots = useMemo(() => Array.from({ length: 7 }, (_, i) => rootRibbon(i)), [])
  return <group position={[LIFE_MAP.x - 2.42, y + .02, LIFE_MAP.z]} name="home-v225-v2-life-map-lineage-observatory" onClick={(e) => { e.stopPropagation(); onLifeMap() }}>
    {roots.map((geometry, i) => <mesh key={`root-${i}`} geometry={geometry} castShadow receiveShadow>
      <meshStandardMaterial color={i%2 ? '#516d60' : '#675c54'} roughness={.91} emissive="#1b3e35" emissiveIntensity={.10}/>
    </mesh>)}
    <mesh geometry={trunk} castShadow receiveShadow>
      <meshStandardMaterial color="#59786b" roughness={.82} emissive="#244c40" emissiveIntensity={.18}/>
    </mesh>
    {branches.map(({ geometry, end }, i) => <group key={i}>
      <mesh geometry={geometry} castShadow>
        <meshStandardMaterial color={i%2 ? '#72a28f' : '#8c7a95'} emissive={i%2 ? '#2d6554' : '#5a4662'} emissiveIntensity={.35} roughness={.66}/>
      </mesh>
      <mesh position={end} scale={[.10 + (i%3)*.018,.10 + (i%2)*.014,.10]}>
        <sphereGeometry args={[1,24,18]}/>
        <meshPhysicalMaterial color={i%2 ? '#a9d0bf' : '#c2aec8'} emissive={i%2 ? '#4e9c80' : '#7b5b86'} emissiveIntensity={.88} roughness={.40} clearcoat={.06}/>
      </mesh>
    </group>)}
    <pointLight position={[0,1.95,-.42]} color="#7ac4a8" intensity={2.6} distance={6.2}/>
    <pointLight position={[.70,2.70,-.80]} color="#aa8fba" intensity={1.25} distance={5.4}/>
  </group>
}

function orbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 128, 96)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const deep = new THREE.Color('#13362e')
  const green = new THREE.Color('#4e9a81')
  const pale = new THREE.Color('#b8d7c9')
  const warm = new THREE.Color('#c58a70')
  for (let i = 0; i < p.count; i++) {
    const bx = p.getX(i), by = p.getY(i), bz = p.getZ(i)
    const angle = Math.atan2(bz, bx)
    const upper = Math.max(0, by)
    const lower = Math.max(0, -by)
    const shoulder = 1 + .24 * upper
    const taper = Math.max(.27, 1 - .72 * Math.pow(lower, 1.24))
    const cleft = Math.exp(-Math.pow((bx + .03) / .20, 2) - Math.pow((by - .78) / .17, 2))
    const leftBias = bx < 0 ? 1.08 : .95
    const folded = 1 + .045 * Math.sin(angle * 3.1 + by * 7.2) + .020 * Math.sin(angle * 7.4 - by * 9.0)
    let x = bx * .83 * shoulder * taper * folded * leftBias
    let z = bz * (.62 + .08 * upper) * taper * (1 + .026 * Math.sin(angle * 4.2 - by * 5.8))
    let y = by * .96 - .34 * cleft - .19 * Math.pow(lower, 1.35)
    x += .075 * (1 - by * by) + .025 * bz
    y += .025 * Math.sin(angle * 3.4 + by * 8.0) * (1 - Math.abs(by))
    z += .023 * Math.sin(angle * 2.7 - by * 5.6) * (1 - Math.abs(by))
    p.setXYZ(i, x, y, z)
    const sideLight = Math.max(0, Math.cos(angle - .35)) * (1 - Math.abs(by))
    const band = .5 + .5 * Math.sin(angle * 3.4 + by * 6.8)
    const c = deep.clone().lerp(green, .34 + .30 * band).lerp(pale, .17 * sideLight).lerp(warm, .15 * Math.max(0, Math.cos(angle + 1.05)) * (1 - Math.abs(by)))
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function orbVein(index: number) {
  const side = index % 2 ? -1 : 1
  const points = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33
    const y = .68 - index * .060 - t * (.84 + index * .015)
    const width = .48 * (1 - .48 * Math.max(0, -y))
    return new THREE.Vector3(
      side * width * (.54 + .24 * Math.sin(t * Math.PI + index * .42)) + .04,
      y,
      .40 * Math.sin(t * Math.PI * 1.10 + index * .49) * (1 - .28 * t) + .03,
    )
  })
  return tube(points, .008 + index * .00035, 7)
}

function groundingFilament(index: number) {
  const side = index - 1
  const points = Array.from({ length: 26 }, (_, i) => {
    const t = i / 25
    return new THREE.Vector3(
      side * .14 * (1 + .8 * t) + .025 * Math.sin(t * 7 + index),
      -.52 - .50 * t,
      .04 + .22 * t + .035 * Math.sin(t * 5 + index),
    )
  })
  return tube(points, .010, 7)
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
  const veins = useMemo(() => Array.from({ length: 11 }, (_, i) => orbVein(i)), [])
  const filaments = useMemo(() => Array.from({ length: 3 }, (_, i) => groundingFilament(i)), [])
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
    <mesh geometry={geometry} position={[0,-.10,0]} scale={[.78,.88,.72]} castShadow>
      <meshPhysicalMaterial vertexColors color="#d8e6df" roughness={.62} clearcoat={.06} clearcoatRoughness={.84} sheen={.14} sheenColor="#6b9c89" emissive="#133a31" emissiveIntensity={.14}/>
    </mesh>
    <group position={[0,-.10,0]} scale={[.78,.88,.72]} name="home-v225-v2-orb-embedded-memory-veins">
      {veins.map((g,i) => <mesh key={i} geometry={g}>
        <meshStandardMaterial color={warning ? '#d77a68' : i%2 ? '#8fc6b1' : '#ca957d'} emissive={warning ? '#8a392f' : i%2 ? '#336f5d' : '#794a36'} emissiveIntensity={.48} roughness={.62}/>
      </mesh>)}
    </group>
    <group position={[0,-.10,0]} scale={[.78,.88,.72]}>
      {filaments.map((g,i) => <mesh key={i} geometry={g}><meshStandardMaterial color="#527564" emissive="#244b3f" emissiveIntensity={.22} roughness={.82}/></mesh>)}
    </group>
    <mesh position={[0,-.10,0]} scale={[.86,1.02,.80]} onClick={activate}>
      <sphereGeometry args={[1,28,20]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    <pointLight position={[.08,.02,.32]} color={warning ? '#d56d5d' : '#79c9ad'} intensity={state === 'dormant' ? .14 : .68} distance={3.4}/>
  </group>
}

function AtmosphericDepth() {
  const field = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 210; i++) {
      const a = i * 2.39996323
      const r = 2.2 + ((i * 37) % 100) / 100 * 9.2
      pts.push(Math.cos(a) * r, .42 + ((i * 29) % 100) / 100 * 4.2, 3.5 - ((i * 53) % 100) / 100 * 19.4)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return <group name="home-v225-v2-bounded-atmospheric-depth">
    <points geometry={field}><pointsMaterial color="#b4d0c1" size={.018} transparent opacity={.22} depthWrite={false}/></points>
    <pointLight position={[0,3.8,-12]} color="#79aa97" intensity={.82} distance={15}/>
    <pointLight position={[-4.2,2.0,-8]} color="#c58b66" intensity={.65} distance={9}/>
    <pointLight position={[4.0,2.4,-9]} color="#829e9a" intensity={.55} distance={9}/>
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
