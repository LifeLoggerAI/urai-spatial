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
    Math.max(56, points.length * 5),
    radius,
    radial,
    false,
  )
}

function sanctuaryFloorGeometry() {
  const nx = 96, nz = 128
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#172a27')
  const moss = new THREE.Color('#35463b')
  const warm = new THREE.Color('#655742')
  const teal = new THREE.Color('#31544d')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.2 - iz / nz * 25.5
    for (let ix = 0; ix <= nx; ix++) {
      const x = -8.8 + ix / nx * 17.6
      const base = height(x, z)
      const centralWear = Math.exp(-Math.pow(x / 2.9, 2))
      const basin = -.055 * centralWear + .025 * Math.sin(x * .52 + z * .18)
      positions.push(x, base + basin + .018, z)
      const edge = Math.min(1, Math.abs(x) / 8.8)
      const distance = Math.min(1, Math.max(0, (-z - 1) / 19))
      const c = deep.clone().lerp(moss, .30 + .24 * (1 - edge)).lerp(teal, .16 * distance)
      if (centralWear > .72) c.lerp(warm, .18 * centralWear)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nx + 1
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = iz * row + ix, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function memoryPathGeometry() {
  const segments = 110, across = 10
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const ember = new THREE.Color('#8a7457'), quiet = new THREE.Color('#4e6658')
  const centers = Array.from({ length: segments + 1 }, (_, i) => {
    const t = i / segments
    const z = 4.7 - t * 20.8
    const x = .38 * Math.sin(t * Math.PI * 2.05) + .16 * Math.sin(t * Math.PI * 5.2)
    return new THREE.Vector3(x, height(x, z) + .048, z)
  })
  for (let i = 0; i <= segments; i++) {
    const tangent = centers[Math.min(segments, i + 1)].clone().sub(centers[Math.max(0, i - 1)]).normalize()
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
    for (let j = 0; j < across; j++) {
      const u = j / (across - 1) - .5
      const width = 1.34 + .10 * Math.sin(i * .21)
      const p = centers[i].clone().addScaledVector(side, u * width)
      p.y += .018 * Math.cos(u * Math.PI * 2)
      positions.push(p.x, p.y, p.z)
      const c = quiet.clone().lerp(ember, .30 + .46 * (1 - Math.abs(u) * 2))
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

function MemoryValley({ onWalk }: { onWalk: WalkHandler }) {
  const floor = useMemo(sanctuaryFloorGeometry, [])
  const path = useMemo(memoryPathGeometry, [])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor">
      <meshStandardMaterial vertexColors roughness={.98} metalness={0}/>
    </mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk">
      <meshStandardMaterial vertexColors roughness={.92} emissive="#322d24" emissiveIntensity={.10}/>
    </mesh>
  </group>
}

function sideRib(side: -1 | 1, row: number) {
  const z = 3.2 - row * 3.55
  const reach = 2.35 + row * .12
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29
    const x = side * (7.25 - reach * Math.sin(t * Math.PI * .58))
    const zz = z - .72 * t + .12 * Math.sin(t * 5 + row)
    const y0 = height(x, zz)
    return new THREE.Vector3(
      x,
      y0 + .06 + (1.38 + row * .11) * Math.sin(t * Math.PI) + .28 * t,
      zz,
    )
  })
  return tube(points, .065 + row * .003, 10)
}

function branchRib(side: -1 | 1, row: number) {
  const z = 1.5 - row * 3.75
  const points = Array.from({ length: 26 }, (_, i) => {
    const t = i / 25
    const x = side * (6.75 - 2.15 * t)
    const zz = z - 1.20 * t
    return new THREE.Vector3(
      x,
      height(x, zz) + .08 + .38 * Math.sin(t * Math.PI) + .14 * t,
      zz,
    )
  })
  return tube(points, .032, 8)
}

function SanctuaryRibs() {
  const ribs = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 6 }, (_, row) => ({
    side, row, main: sideRib(side, row), branch: branchRib(side, row),
  }))), [])
  return <group name="home-v225-v2-cathedral-memory-ribs">
    {ribs.map(({ side, row, main, branch }) => <group key={`${side}-${row}`}>
      <mesh geometry={main} castShadow receiveShadow>
        <meshStandardMaterial color={side < 0 ? '#526654' : '#485f55'} roughness={.90}/>
      </mesh>
      <mesh geometry={branch} castShadow>
        <meshStandardMaterial color={row % 2 ? '#6c624e' : '#41665a'} roughness={.88}/>
      </mesh>
    </group>)}
  </group>
}

function veilGeometry(side: -1 | 1, index: number) {
  const w = 4.4, h = 3.0, nx = 24, ny = 18
  const positions: number[] = [], indices: number[] = []
  for (let iy = 0; iy <= ny; iy++) for (let ix = 0; ix <= nx; ix++) {
    const u = ix / nx, v = iy / ny
    const x = side * (7.9 - .46 * Math.sin(v * Math.PI)) + side * .08 * Math.sin(u * 7 + index)
    const z = 2.3 - index * 6.0 - u * w + .13 * Math.sin(v * 5 + u * 3)
    const y = -.16 + v * h + .10 * Math.sin(u * Math.PI) * Math.sin(v * Math.PI)
    positions.push(x, y, z)
  }
  const row = nx + 1
  for (let iy = 0; iy < ny; iy++) for (let ix = 0; ix < nx; ix++) {
    const a = iy * row + ix, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function LayeredMemoryWalls() {
  const veils = useMemo(() => ([-1, 1] as const).flatMap((side) => Array.from({ length: 3 }, (_, index) => ({
    side, index, geometry: veilGeometry(side, index),
  }))), [])
  return <group name="home-v225-v2-weathered-memory-walls">
    {veils.map(({ side, index, geometry }) => <mesh key={`${side}-${index}`} geometry={geometry} receiveShadow castShadow>
      <meshPhysicalMaterial
        color={side < 0 ? '#233a32' : '#263a38'}
        roughness={.94}
        metalness={0}
        transparent
        opacity={.74}
        side={THREE.DoubleSide}
      />
    </mesh>)}
  </group>
}

function hearthRib(index: number) {
  const angle0 = -1.20 + index * .47
  const points = Array.from({ length: 28 }, (_, i) => {
    const t = i / 27
    const a = angle0 + t * 1.34
    const r = 1.12 + .09 * Math.sin(t * Math.PI * 2 + index)
    return new THREE.Vector3(
      Math.cos(a) * r,
      .08 + .86 * Math.sin(t * Math.PI),
      Math.sin(a) * .78 - .22,
    )
  })
  return tube(points, .028 + (index % 2) * .005, 8)
}

function GroundHearth({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const ribs = useMemo(() => Array.from({ length: 6 }, (_, i) => hearthRib(i)), [])
  const basin = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 28, 0, Math.PI * 2, Math.PI * .53, Math.PI * .47)
    g.scale(.78, .22, .64)
    return g
  }, [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0,.10,0]} name="home-v225-v2-ground-memory-hearth" onClick={(e) => { e.stopPropagation(); onGround() }}>
    {ribs.map((geometry, i) => <mesh geometry={geometry} key={i} castShadow>
      <meshStandardMaterial color={i % 2 ? '#74644c' : '#4f6656'} roughness={.87}/>
    </mesh>)}
    <mesh geometry={basin} position={[0,.02,-.18]} castShadow receiveShadow>
      <meshStandardMaterial color="#6d4d3a" emissive="#5b2e20" emissiveIntensity={.32} roughness={.91}/>
    </mesh>
    {Array.from({ length: 7 }, (_, i) => {
      const a = i * 2.399
      const r = .22 + .04 * (i % 3)
      return <mesh key={i} position={[Math.cos(a)*r,.16 + .05*(i%2),-.18 + Math.sin(a)*r*.72]} scale={[.035,.11,.035]}>
        <sphereGeometry args={[1,14,10]}/>
        <meshStandardMaterial color="#d29a72" emissive="#b65e3b" emissiveIntensity={1.3} roughness={.72}/>
      </mesh>
    })}
    <pointLight position={[0,.62,-.15]} color="#ef9b6e" intensity={4.2} distance={5.2}/>
    <pointLight position={[-.45,1.35,-.72]} color="#83b69d" intensity={.72} distance={4.0}/>
  </group>
}

function lineageBranch(index: number) {
  const side = index % 2 ? -1 : 1
  const tier = Math.floor(index / 2)
  const points = Array.from({ length: 32 }, (_, i) => {
    const t = i / 31
    const span = .82 + tier * .22
    return new THREE.Vector3(
      side * span * Math.pow(t,.76) + .06 * Math.sin(index + t * 6),
      .20 + t * (1.10 + tier * .24) + .22 * Math.sin(t * Math.PI),
      -.25 - t * (.58 + tier * .08) + .08 * Math.sin(t * 4 + index),
    )
  })
  return { geometry: tube(points, .015 + tier * .002, 7), end: points[points.length - 1] }
}

function LifeMapObservatory({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const spine = useMemo(() => tube(Array.from({ length: 38 }, (_, i) => {
    const t = i / 37
    return new THREE.Vector3(.04 * Math.sin(t * 8), .12 + t * 2.44, -.08 - .28*t + .05*Math.sin(t*5))
  }), .038, 9), [])
  const branches = useMemo(() => Array.from({ length: 10 }, (_, i) => lineageBranch(i)), [])
  return <group position={[LIFE_MAP.x, y, LIFE_MAP.z]} rotation={[0,-.08,0]} name="home-v225-v2-life-map-lineage-observatory" onClick={(e) => { e.stopPropagation(); onLifeMap() }}>
    <mesh geometry={spine} castShadow>
      <meshPhysicalMaterial color="#668e80" emissive="#315f53" emissiveIntensity={.45} roughness={.54} clearcoat={.12}/>
    </mesh>
    {branches.map(({ geometry, end }, i) => <group key={i}>
      <mesh geometry={geometry} castShadow>
        <meshPhysicalMaterial color={i % 2 ? '#83bbaa' : '#a08db2'} emissive={i % 2 ? '#316f5b' : '#5e4774'} emissiveIntensity={.58} roughness={.48}/>
      </mesh>
      <mesh position={end} scale={[.085,.085,.085]}>
        <sphereGeometry args={[1,22,16]}/>
        <meshPhysicalMaterial color={i % 2 ? '#c2ddd1' : '#d2c1dd'} emissive={i % 2 ? '#5a9f87' : '#886ba0'} emissiveIntensity={1.25} roughness={.32}/>
      </mesh>
    </group>)}
    <pointLight position={[0,1.35,-.32]} color="#79cbb0" intensity={2.45} distance={5.1}/>
    <pointLight position={[.72,2.05,-.70]} color="#bea3d0" intensity={1.75} distance={4.7}/>
  </group>
}

function orbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 128, 96)
  const p = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const deep = new THREE.Color('#102f2a'), mid = new THREE.Color('#4f9682'), pale = new THREE.Color('#c8ded4'), warm = new THREE.Color('#bd8a70')
  for (let i = 0; i < p.count; i++) {
    const bx = p.getX(i), by = p.getY(i), bz = p.getZ(i)
    const upper = Math.max(0, by), lower = Math.max(0, -by), angle = Math.atan2(bz, bx)
    const cleft = Math.exp(-Math.pow(bx / .20, 2) - Math.pow((by - .74) / .21, 2))
    const taper = 1 - .56 * Math.pow(lower, 1.40)
    const organic = 1 + .025 * Math.sin(angle * 3.2 + by * 7.4) + .012 * Math.sin(angle * 8 - by * 11)
    let x = bx * (.69 + .19 * upper) * taper * organic
    let z = bz * (.50 + .075 * upper) * taper
    let y = by * 1.04 - .32 * cleft - .21 * Math.pow(lower, 1.75) + .07 * upper * Math.abs(bx)
    x += .06 * (1 - by * by) + .024 * bz
    y += .018 * Math.sin(angle * 3 + by * 9) * (1 - Math.abs(by))
    z += .018 * Math.sin(angle * 2 + by * 5) * (1 - Math.abs(by))
    p.setXYZ(i, x, y, z)
    const side = Math.max(0, Math.cos(angle - .42)) * (1 - Math.abs(by))
    const band = .5 + .5 * Math.sin(angle * 3.1 + by * 6.6)
    const c = deep.clone().lerp(mid, .34 + .30 * band).lerp(pale, .20 * side).lerp(warm, .12 * Math.max(0, Math.cos(angle + 1.0)) * (1 - Math.abs(by)))
    colors[i*3] = c.r; colors[i*3+1] = c.g; colors[i*3+2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function orbVein(index: number) {
  const side = index % 2 ? -1 : 1
  const startY = .62 - index * .085
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29
    const y = startY - t * (.78 + index * .022)
    const width = .44 * (1 - .38 * Math.max(0, -y))
    return new THREE.Vector3(
      side * width * (.54 + .22 * Math.sin(t * Math.PI + index * .45)) + .035,
      y + .32,
      .40 * Math.sin(t * Math.PI * 1.12 + index * .54) * (1 - .30 * t) + .03,
    )
  })
  return tube(points, .0058 + index * .00028, 6)
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
  const veins = useMemo(() => Array.from({ length: 10 }, (_, i) => orbVein(i)), [])
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
    <mesh geometry={geometry} position={[0,.25,0]} scale={[.50,.50,.50]} castShadow>
      <meshPhysicalMaterial vertexColors color="#dce9e3" roughness={.60} clearcoat={.10} clearcoatRoughness={.80} sheen={.16} sheenColor="#6ca18f" emissive="#123a31" emissiveIntensity={.10}/>
    </mesh>
    <group position={[0,.245,0]} scale={[.50,.50,.50]} name="home-v225-v2-orb-embedded-memory-veins">
      {veins.map((g,i) => <mesh key={i} geometry={g}>
        <meshStandardMaterial color={warning ? '#d77a68' : i % 2 ? '#8bc5b0' : '#c79b82'} emissive={warning ? '#8a392f' : i % 2 ? '#326e5c' : '#754c36'} emissiveIntensity={.44} roughness={.64}/>
      </mesh>)}
    </group>
    <mesh position={[0,.25,0]} scale={[.56,.68,.52]} onClick={activate}>
      <sphereGeometry args={[1,24,18]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/>
    </mesh>
    <pointLight position={[.08,.36,.28]} color={warning ? '#d56d5d' : '#72c8ab'} intensity={state === 'dormant' ? .12 : .48} distance={2.35}/>
  </group>
}

function AtmosphericDepth() {
  const near = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 130; i++) {
      const a = i * 2.39996323
      const r = 2.4 + ((i * 37) % 100) / 100 * 8.6
      pts.push(Math.cos(a) * r, .55 + ((i * 29) % 100) / 100 * 3.9, 3.4 - ((i * 53) % 100) / 100 * 18.0)
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3)); return g
  }, [])
  return <group name="home-v225-v2-bounded-atmospheric-depth">
    <points geometry={near}><pointsMaterial color="#a8cdbb" size={.014} transparent opacity={.20} depthWrite={false}/></points>
    <pointLight position={[0,4,-14]} color="#6c9e8d" intensity={.58} distance={12}/>
    <pointLight position={[-5.5,2.2,-10]} color="#bb875f" intensity={.36} distance={8}/>
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
    <LayeredMemoryWalls/>
    <SanctuaryRibs/>
    <GroundHearth onGround={onGround}/>
    <LifeMapObservatory onLifeMap={onLifeMap}/>
    <LivingMemoryOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <AtmosphericDepth/>
  </group>
}
