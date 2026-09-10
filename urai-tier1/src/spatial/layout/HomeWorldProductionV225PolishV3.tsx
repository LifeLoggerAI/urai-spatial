'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'
import { GROUND, LIFE_MAP, ORB, height } from './HomeWorldProductionV223Geometry'

type WalkHandler = (event: ThreeEvent<MouseEvent>) => void
type V3 = [number, number, number]

const retiredExact = new Set([
  'home-v225-v2-cathedral-memory-ribs',
  'home-v225-v2-weathered-memory-walls',
  'home-v225-v2-ground-memory-hearth',
  'home-v225-v2-life-map-lineage-observatory',
  'home-v225-v2-intimate-veined-living-memory-orb',
  'home-v225-ground-sheltered-memory-basin',
  'home-v225-life-map-rooted-memory-observatory',
  'home-v225-single-asymmetric-living-memory-presence',
  'home-v225-living-memory-grove',
])

function RetireRejectedLayers() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse((object) => {
      const retired = retiredExact.has(object.name)
        || /^home-v225-rooted-memory-rib-/.test(object.name)
        || /^home-v225-(?:port|starboard)-overhanging-strata-/.test(object.name)
      if (retired && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach((object) => { object.visible = true })
  }, [scene])
  return null
}

function PortraitFraming() {
  const { camera, size } = useThree()
  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return
    const previous = camera.zoom
    camera.zoom = size.height > size.width ? 1.18 : 1
    camera.updateProjectionMatrix()
    return () => {
      camera.zoom = previous
      camera.updateProjectionMatrix()
    }
  }, [camera, size.height, size.width])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 9) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .42), Math.max(56, points.length * 5), radius, radial, false)
}

function bladeGeometry(seed: number) {
  const shape = new THREE.Shape()
  const skew = Math.sin(seed * 1.73) * .08
  shape.moveTo(0, -.06)
  shape.bezierCurveTo(.30 + skew, -.02, .55 + skew, .22, .64, .52)
  shape.bezierCurveTo(.42, .42, .16, .28, 0, .08)
  shape.bezierCurveTo(-.12, .30, -.24 + skew, .44, -.35, .52)
  shape.bezierCurveTo(-.30, .18, -.16, -.02, 0, -.06)
  return new THREE.ShapeGeometry(shape, 18)
}

function RootedCanopy() {
  const architecture = useMemo(() => {
    const anchors = [
      [-5.4, -2.6, 4.7, .18, -.48], [5.1, -3.2, 4.9, -.20, .55],
      [-4.8, -6.2, 5.5, .10, -.70], [4.6, -7.1, 5.8, -.08, .74],
      [-4.0, -10.1, 6.1, .06, -.84], [4.1, -11.0, 6.0, -.06, .88],
      [-3.2, -14.0, 5.7, .04, -.96], [3.3, -14.7, 5.5, -.04, .98],
    ] as const
    return anchors.map(([x, z, h, bend, sweep], index) => {
      const y = height(x, z)
      const trunk = tube([
        new THREE.Vector3(x, y + .02, z),
        new THREE.Vector3(x + bend * .35, y + h * .28, z + sweep * .10),
        new THREE.Vector3(x + bend, y + h * .62, z + sweep * .40),
        new THREE.Vector3(x + bend * 2.0, y + h * .88, z + sweep * .95),
      ], .055 + (index % 3) * .008, 9)
      const crownA = tube([
        new THREE.Vector3(x + bend * 1.1, y + h * .66, z + sweep * .48),
        new THREE.Vector3(x + bend * 2.4 - sweep * .55, y + h * .91, z + sweep * 1.0),
        new THREE.Vector3(x + bend * 2.8 - sweep * 1.35, y + h * .98, z + sweep * 1.42),
      ], .027, 8)
      const crownB = tube([
        new THREE.Vector3(x + bend * 1.25, y + h * .70, z + sweep * .50),
        new THREE.Vector3(x + bend * 1.6 + sweep * .58, y + h * .92, z + sweep * .86),
        new THREE.Vector3(x + bend * 1.2 + sweep * 1.38, y + h * .95, z + sweep * 1.14),
      ], .024, 8)
      return { x, z, y, h, sweep, trunk, crownA, crownB }
    })
  }, [])
  const leaf = useMemo(() => bladeGeometry(2.4), [])
  return <group name="home-v226-rooted-inhabited-canopy">
    {architecture.map((tree, index) => <group key={index}>
      <mesh geometry={tree.trunk} castShadow><meshStandardMaterial color={index % 2 ? '#26372f' : '#2d3a31'} roughness={.97}/></mesh>
      <mesh geometry={tree.crownA} castShadow><meshStandardMaterial color="#31483a" roughness={.96}/></mesh>
      <mesh geometry={tree.crownB} castShadow><meshStandardMaterial color="#334c3d" roughness={.96}/></mesh>
      {Array.from({ length: 9 }, (_, leafIndex) => {
        const side = leafIndex % 2 ? -1 : 1
        const t = (leafIndex + 1) / 10
        const px = tree.x + tree.sweep * side * (.38 + t * .55)
        const py = tree.y + tree.h * (.73 + .19 * Math.sin(t * Math.PI))
        const pz = tree.z + tree.sweep * (.58 + t * .66)
        return <mesh key={leafIndex} geometry={leaf} position={[px, py, pz]} rotation={[-1.22 + t * .3, tree.sweep * .34 + side * .28, side * (.25 + t * .4)]} scale={[.58 + t * .28, .72 + (leafIndex % 3) * .12, 1]} castShadow>
          <meshStandardMaterial color={leafIndex % 3 === 0 ? '#4d6752' : leafIndex % 3 === 1 ? '#385344' : '#425c49'} roughness={.92} side={THREE.DoubleSide}/>
        </mesh>
      })}
    </group>)}
  </group>
}

function terraceGeometry(side: -1 | 1, z: number, width: number, rise: number) {
  const vertices: number[] = []
  const indices: number[] = []
  const cols = 34
  const rows = 7
  for (let row = 0; row <= rows; row++) {
    const v = row / rows
    for (let col = 0; col <= cols; col++) {
      const u = col / cols
      const x = side * (2.7 + v * width + .18 * Math.sin(u * 8.4 + v * 3.1))
      const zz = z - u * 8.4 + .22 * Math.sin(u * 6.2 + v * 2.6)
      const y = height(x, zz) + .04 + rise * Math.sin(v * Math.PI) + .06 * Math.sin(u * 11 + v * 4)
      vertices.push(x, y, zz)
    }
  }
  const stride = cols + 1
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const a = row * stride + col, b = a + 1, c = a + stride, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function WeatheredMemoryBanks() {
  const banks = useMemo(() => [
    terraceGeometry(-1, -2.0, 2.4, .32),
    terraceGeometry(1, -2.8, 2.1, .28),
    terraceGeometry(-1, -9.4, 1.8, .24),
    terraceGeometry(1, -10.2, 1.65, .22),
  ], [])
  return <group name="home-v226-weathered-memory-banks">
    {banks.map((geometry, index) => <mesh key={index} geometry={geometry} receiveShadow castShadow>
      <meshStandardMaterial color={index % 2 ? '#455046' : '#514d43'} roughness={.99} metalness={0}/>
    </mesh>)}
  </group>
}

function basinGeometry() {
  const nx = 52, nz = 40, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const earth = new THREE.Color('#342f29'), warm = new THREE.Color('#66513f'), moss = new THREE.Color('#475444')
  for (let iz = 0; iz <= nz; iz++) {
    const vz = iz / nz, z = -1.55 + vz * 3.1
    for (let ix = 0; ix <= nx; ix++) {
      const vx = ix / nx, x = -2.05 + vx * 4.1
      const r = Math.min(1, Math.sqrt((x / 2.05) ** 2 + (z / 1.55) ** 2))
      const rim = .28 * Math.pow(r, 2.2)
      const shelter = .34 * Math.exp(-((x / .95) ** 2 + ((z + 1.10) / .52) ** 2))
      const y = -.16 + rim + shelter + .035 * Math.sin(x * 2.8 + z * 3.2)
      positions.push(x, y, z)
      const color = earth.clone().lerp(warm, .20 + .28 * (1 - r)).lerp(moss, .15 * r)
      colors.push(color.r, color.g, color.b)
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

function GroundSanctuary({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const basin = useMemo(basinGeometry, [])
  const shelter = useMemo(() => tube([
    new THREE.Vector3(-1.48, .02, -.86), new THREE.Vector3(-1.18, .92, -1.18), new THREE.Vector3(-.45, 1.42, -1.42),
    new THREE.Vector3(.42, 1.36, -1.36), new THREE.Vector3(1.32, .74, -1.02), new THREE.Vector3(1.52, .04, -.70),
  ], .045, 10), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0, -.08, 0]} name="home-v226-ground-inhabited-hearth" onClick={(event) => { event.stopPropagation(); onGround() }}>
    <mesh geometry={basin} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={.98}/></mesh>
    <mesh geometry={shelter} castShadow><meshStandardMaterial color="#425046" roughness={.96}/></mesh>
    <mesh position={[-.16, .035, -.32]} scale={[.44, .055, .34]} castShadow><capsuleGeometry args={[.65, .5, 12, 28]}/><meshStandardMaterial color="#a9684f" emissive="#633326" emissiveIntensity={.45} roughness={.78}/></mesh>
    <pointLight position={[-.16, .60, -.32]} color="#d88c64" intensity={2.6} distance={5.2}/>
  </group>
}

function observatoryShell() {
  const nu = 64, nv = 28, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#273633'), jade = new THREE.Color('#4a675e'), dusk = new THREE.Color('#665b72')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu, theta = THREE.MathUtils.lerp(-1.18, 1.18, u)
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv, crown = Math.sin(v * Math.PI), radius = 1.55 + .10 * Math.sin(u * 7)
      const x = Math.sin(theta) * radius * (.72 + .12 * v)
      const z = -.52 - Math.cos(theta) * radius * .56 - .16 * v
      const y = .02 + v * 1.72 + .42 * crown + .05 * Math.sin(u * 9 + v * 8)
      positions.push(x, y, z)
      const color = deep.clone().lerp(jade, .22 + .38 * v).lerp(dusk, .13 * crown)
      colors.push(color.r, color.g, color.b)
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

function LifeMapSanctuary({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const shell = useMemo(observatoryShell, [])
  const threads = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const a = index * .67 - 1.1
    const end = new THREE.Vector3(Math.cos(a) * (.28 + index * .025), Math.sin(a * 1.5) * .22, -.12 - Math.sin(a) * .12)
    return tube([new THREE.Vector3(0, 0, 0), end.clone().multiplyScalar(.48).add(new THREE.Vector3(0, .08, -.02)), end], .005, 6)
  }), [])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v226-life-map-lineage-observatory" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
    <mesh geometry={shell} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.93} side={THREE.DoubleSide}/></mesh>
    <group position={[0, 1.10, -.78]} name="home-v226-life-map-contained-memory-field">
      {threads.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index % 2 ? '#91bdae' : '#b9a6c3'} emissive={index % 2 ? '#355d50' : '#55455e'} emissiveIntensity={.52}/></mesh>)}
      <pointLight color="#b8d8cc" intensity={.85} distance={2.2}/>
    </group>
    <pointLight position={[0, 1.35, -.64]} color="#8bc4b0" intensity={1.5} distance={5.4}/>
  </group>
}

function organicOrbGeometry() {
  const geometry = new THREE.SphereGeometry(1, 128, 96)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const shadow = new THREE.Color('#201d22'), plum = new THREE.Color('#71505e'), jade = new THREE.Color('#5f8d78'), warm = new THREE.Color('#ba806c'), pale = new THREE.Color('#d6cbb4')
  for (let index = 0; index < position.count; index++) {
    const bx = position.getX(index), by = position.getY(index), bz = position.getZ(index), angle = Math.atan2(bz, bx)
    const upper = Math.max(0, by), lower = Math.max(0, -by)
    const shoulder = 1 + .34 * upper * (bx < 0 ? 1.18 : .88) * (.45 + .55 * Math.abs(bx))
    const taper = 1 - .74 * Math.pow(lower, 1.16)
    const fold = 1 + .055 * Math.sin(angle * 3 + by * 7) + .024 * Math.sin(angle * 7 - by * 9)
    const cleft = Math.exp(-Math.pow(bx / .17, 2) - Math.pow((by - .70) / .17, 2)) * Math.max(0, .76 + bz)
    const x = bx * .95 * shoulder * taper * fold + .10 * (1 - by * by) + .06 * bz
    const z = bz * .58 * (1 + .12 * upper) * taper + .026 * Math.sin(angle * 3 + by * 6)
    const y = by * .74 - .42 * cleft - .16 * Math.pow(lower, 1.34) + .07 * Math.abs(bx) * upper
    position.setXYZ(index, x, y, z)
    const edge = Math.min(1, Math.abs(bx) * 1.2), side = Math.max(0, Math.cos(angle - .45)) * (1 - Math.abs(by)), band = .5 + .5 * Math.sin(angle * 3.2 + by * 6.2)
    const color = shadow.clone().lerp(plum, .26 + .22 * band).lerp(jade, .24 * side).lerp(warm, .25 * Math.max(0, -Math.cos(angle + .2)) * (1 - Math.abs(by))).lerp(pale, .12 * edge * upper)
    colors[index * 3] = color.r; colors[index * 3 + 1] = color.g; colors[index * 3 + 2] = color.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function vein(index: number) {
  const side = index % 2 ? -1 : 1
  return tube(Array.from({ length: 30 }, (_, point) => {
    const t = point / 29
    return new THREE.Vector3(side * (.07 + t * .36 + .025 * Math.sin(t * 8 + index)), .34 - t * .68 + .025 * Math.sin(t * 7 + index), .39 + .018 * Math.sin(t * 5 + index))
  }), .0048 + index * .00018, 5)
}

type Posture = { s: V3; r: V3; speed: number }
const posture: Record<OrbState, Posture> = {
  dormant:{s:[.92,.90,.91],r:[.03,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.03,.05,-.02],speed:.30},attention:{s:[1.035,1.04,.97],r:[-.08,.12,.04],speed:.62},listening:{s:[.98,1.03,.98],r:[.06,-.06,-.03],speed:.22},thinking:{s:[1.02,.99,1.01],r:[-.09,.14,.06],speed:.18},speaking:{s:[1.04,1.03,.97],r:[.03,-.02,-.06],speed:.80},guiding:{s:[.99,1.04,.97],r:[-.10,.02,.07],speed:.42},reflecting:{s:[.99,.98,1.02],r:[.08,.08,-.05],speed:.14},calming:{s:[1.01,.98,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.92,.92,.91],r:[.10,.08,.08],speed:.08},warning:{s:[1.04,1.04,.96],r:[-.11,-.06,-.08],speed:.95},transition:{s:[.96,1.05,.95],r:[-.11,.04,.08],speed:.65},
}

function RootCradle() {
  const y = height(ORB.x, ORB.z)
  const roots = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const angle = -1.42 + index * .46
    const radius = .82 + (index % 2) * .18
    const start = new THREE.Vector3(Math.cos(angle) * radius, -.02, Math.sin(angle) * radius)
    const middle = new THREE.Vector3(Math.cos(angle) * .46, .18 + (index % 3) * .05, Math.sin(angle) * .42)
    const end = new THREE.Vector3(Math.cos(angle) * .16, .24, Math.sin(angle) * .14)
    return tube([start, middle, end], .025 + (index % 2) * .006, 8)
  }), [])
  return <group position={[ORB.x, y + .015, ORB.z]} name="home-v226-root-cradle">
    {roots.map((geometry, index) => <mesh key={index} geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={index % 2 ? '#3d4b3f' : '#51463e'} roughness={.98}/></mesh>)}
    <pointLight position={[.02,.32,.06]} color="#b88672" intensity={.42} distance={2.8}/>
  </group>
}

function LivingMemoryPresence({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const body = useMemo(organicOrbGeometry, [])
  const veins = useMemo(() => Array.from({ length: 8 }, (_, index) => vein(index)), [])
  const pose = posture[state]
  const y = height(ORB.x, ORB.z)
  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime * pose.speed, breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .006
    root.current.scale.set(pose.s[0] * breath, pose.s[1] * breath, pose.s[2] * breath)
    root.current.rotation.set(pose.r[0], pose.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .014), pose.r[2])
  })
  const warning = state === 'warning'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, Math.max(y + .78, ORB.y - .12), ORB.z]} name="home-v226-rooted-single-living-memory-presence" onClick={activate}>
    <mesh geometry={body} scale={[.88,.80,.82]} castShadow><meshPhysicalMaterial vertexColors roughness={.72} clearcoat={.03} clearcoatRoughness={.88} sheen={.15} sheenColor="#a58788" emissive="#2a2024" emissiveIntensity={.10}/></mesh>
    <group scale={[.88,.80,.82]}>{veins.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={warning ? '#c9685b' : index % 2 ? '#8ab09d' : '#c08a78'} emissive={warning ? '#6e3029' : index % 2 ? '#355b4c' : '#6b453b'} emissiveIntensity={.38} roughness={.72}/></mesh>)}</group>
    <mesh scale={[.98,.80,.78]} onClick={activate}><sphereGeometry args={[1,20,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.08,.03,.34]} color={warning ? '#c96858' : '#c59b83'} intensity={state === 'dormant' ? .08 : .32} distance={2.8}/>
  </group>
}

function MemoryWisps() {
  const geometry = useMemo(() => {
    const points: number[] = []
    for (let index = 0; index < 260; index++) {
      const angle = index * 2.39996323, radius = 2.0 + ((index * 47) % 100) / 100 * 8.8
      points.push(Math.cos(angle) * radius, .52 + ((index * 31) % 100) / 100 * 3.8, 2.4 - ((index * 61) % 100) / 100 * 18.4)
    }
    const buffer = new THREE.BufferGeometry()
    buffer.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
    return buffer
  }, [])
  return <points geometry={geometry}><pointsMaterial color="#d8ddd2" size={.011} transparent opacity={.18} depthWrite={false}/></points>
}

export function HomeV225PolishV3({ orbState, reducedMotion, onOrb, onGround, onLifeMap, onWalk }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onWalk: WalkHandler }) {
  return <group name="home-v226-production-rooted-memory-sanctuary" onClick={onWalk}>
    <RetireRejectedLayers/>
    <PortraitFraming/>
    <WeatheredMemoryBanks/>
    <RootedCanopy/>
    <GroundSanctuary onGround={onGround}/>
    <LifeMapSanctuary onLifeMap={onLifeMap}/>
    <RootCradle/>
    <LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <MemoryWisps/>
  </group>
}
