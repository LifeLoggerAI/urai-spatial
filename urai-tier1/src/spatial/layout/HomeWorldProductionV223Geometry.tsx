'use client'

import { useMemo, useRef } from 'react'
import { useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

export const T = [
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp',
] as const

export const SPAWN = new THREE.Vector3(0, .04, 4.6)
export const ORB = new THREE.Vector3(-.45, 1.03, -7.45)
export const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
export const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
export const BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -14.4, maxZ: 6.8 }

type PbrMaps = [THREE.Texture, THREE.Texture, THREE.Texture]
type Tuple3 = [number, number, number]

function useStoneMaps(): PbrMaps {
  const source = useTexture(T as unknown as string[]) as THREE.Texture[]
  return useMemo(() => source.map((texture, index) => {
    const clone = texture.clone()
    clone.wrapS = clone.wrapT = THREE.RepeatWrapping
    clone.repeat.set(3.6, 8.2)
    clone.anisotropy = 8
    clone.colorSpace = index === 0 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    clone.needsUpdate = true
    return clone
  }) as PbrMaps, [source])
}

function centerline(z: number) {
  return .30 * Math.sin((z + 2.4) * .22) + .09 * Math.sin((z - 1.0) * .63)
}

export function height(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((5.8 - z) / 24.2, 0, 1)
  const center = centerline(z)
  const lane = Math.abs(x - center)
  const shoulder = Math.max(0, lane - 2.0)
  const shoulderRise = .11 * Math.pow(shoulder, 1.42) * (.42 + .82 * depth)
  const broad = .042 * Math.sin(z * .34 + x * .18) + .022 * Math.cos(z * .77 - x * .52)
  const basinGround = -.24 * Math.exp(-(Math.pow((x - GROUND.x) / 1.85, 2) + Math.pow((z - GROUND.z) / 2.15, 2)))
  const basinMap = -.19 * Math.exp(-(Math.pow((x - LIFE_MAP.x) / 1.85, 2) + Math.pow((z - LIFE_MAP.z) / 2.15, 2)))
  return -.66 + .08 * depth + shoulderRise + broad + basinGround + basinMap
}

function sculptedFloorGeometry() {
  const xs = 144, zs = 176
  const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
  const lo = new THREE.Color('#17241f'), mid = new THREE.Color('#39463a'), earth = new THREE.Color('#665743'), moon = new THREE.Color('#7f8c7d')
  for (let iz = 0; iz <= zs; iz++) {
    const vz = iz / zs, z = 6.1 - vz * 24.8
    for (let ix = 0; ix <= xs; ix++) {
      const vx = ix / xs, x = -8.8 + vx * 17.6
      const y = height(x, z)
      positions.push(x, y, z)
      uvs.push(vx * 3.6, vz * 8.2)
      const lane = THREE.MathUtils.clamp(Math.abs(x - centerline(z)) / 7.4, 0, 1)
      const depth = THREE.MathUtils.clamp((5.8 - z) / 24.2, 0, 1)
      const mottled = .5 + .5 * Math.sin(x * 1.83 + z * 1.07) * Math.sin(z * .68 - x * 1.27)
      const c = lo.clone().lerp(mid, .38 + .25 * (1 - lane)).lerp(earth, .10 + .10 * mottled).lerp(moon, .06 * depth)
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let iz = 0; iz < zs; iz++) for (let ix = 0; ix < xs; ix++) {
    const a = iz * (xs + 1) + ix, b = a + 1, c = a + xs + 1, d = c + 1
    if ((ix + iz) & 1) indices.push(a, b, d, a, d, c)
    else indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function pathGeometry() {
  const n = 120, cross = 11
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#554b3d'), warm = new THREE.Color('#8a7457'), pale = new THREE.Color('#a29479')
  for (let i = 0; i <= n; i++) {
    const t = i / n, z = 5.25 - t * 18.85, cx = centerline(z)
    const width = 1.05 - .25 * t + .05 * Math.sin(t * Math.PI * 4)
    for (let j = 0; j < cross; j++) {
      const s = j / (cross - 1) - .5, x = cx + s * width
      const y = height(x, z) + .025 + .010 * Math.cos(s * Math.PI * 2)
      positions.push(x, y, z)
      const c = deep.clone().lerp(warm, .34 + .26 * (1 - Math.abs(s) * 2)).lerp(pale, .06 * Math.sin(t * Math.PI))
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < cross - 1; j++) {
    const a = i * cross + j, b = a + 1, c = a + cross, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function strataGeometry(side: -1 | 1, z0: number, z1: number, layer: number) {
  const ns = 70, nv = 26
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#16221e'), stone = new THREE.Color('#445044'), moss = new THREE.Color('#64715b'), warm = new THREE.Color('#71604c')
  for (let i = 0; i <= ns; i++) {
    const u = i / ns, z = THREE.MathUtils.lerp(z0, z1, u)
    const depth = THREE.MathUtils.clamp((5.8 - z) / 24.2, 0, 1)
    const baseX = side * (5.42 + .32 * Math.sin(z * .29 + layer * 1.7) + .12 * Math.sin(z * .93 - layer))
    const baseY = height(baseX * .88, z) - .13
    const totalH = 1.55 + 2.65 * depth + .34 * Math.sin(u * Math.PI + layer)
    for (let j = 0; j <= nv; j++) {
      const v = j / nv
      const shelf = .24 * Math.sin(v * Math.PI * 5.0 + layer * .75) + .10 * Math.sin(v * Math.PI * 13 + u * 4)
      const overhang = Math.pow(Math.sin(v * Math.PI), 1.12) * (.42 + .30 * depth)
      const x = baseX - side * (overhang + shelf * .14) + side * .055 * Math.sin(v * 21 + u * 8)
      const y = baseY + v * totalH + .055 * Math.sin(v * 25 + u * 11 + layer)
      const zz = z - .18 * v + .10 * Math.sin(v * Math.PI * 2 + u * 3 + layer)
      positions.push(x, y, zz)
      const band = .5 + .5 * Math.sin(v * 34 + u * 7 + layer)
      const c = deep.clone().lerp(stone, .30 + .37 * v).lerp(moss, .16 * Math.sin(v * Math.PI)).lerp(warm, .08 * band)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < ns; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function memoryRib(side: -1 | 1, index: number) {
  const z0 = 2.2 - index * 4.35
  const points = Array.from({ length: 30 }, (_, i) => {
    const t = i / 29, z = z0 - 3.9 * t
    const x = side * (4.85 + .20 * Math.sin(index * 1.4 + t * 4.8) - .30 * Math.sin(t * Math.PI))
    const y = height(x * .95, z) + .16 + .54 * Math.sin(t * Math.PI) + .06 * Math.sin(t * Math.PI * 4 + index)
    return new THREE.Vector3(x, y, z)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .38), 72, .035 + index * .003, 8, false)
}

function organicCanopy(): { p: Tuple3; s: Tuple3 }[] {
  return [
    { p: [0, 0, 0], s: [1.0, .63, .82] },
    { p: [-.42, -.05, .08], s: [.65, .46, .62] },
    { p: [.38, .02, -.04], s: [.72, .50, .66] },
    { p: [.02, .28, -.14], s: [.58, .43, .56] },
  ]
}

function Grove() {
  const plants = useMemo(() => [
    { x:-2.65,z:-4.9,h:1.55,s:.70,seed:1.2 }, { x:2.50,z:-5.7,h:1.82,s:.78,seed:2.8 },
    { x:-2.85,z:-8.9,h:2.15,s:.87,seed:4.1 }, { x:2.82,z:-10.1,h:2.35,s:.92,seed:5.6 },
    { x:-2.10,z:-12.3,h:2.48,s:.98,seed:7.1 }, { x:2.00,z:-13.0,h:2.22,s:.88,seed:8.5 },
  ].map((plant) => {
    const points = Array.from({ length: 14 }, (_, i) => {
      const t = i / 13
      return new THREE.Vector3(
        plant.x + .07 * Math.sin(plant.seed + t * 5.2) + .08 * t * Math.sin(plant.seed * .7),
        height(plant.x, plant.z) + .05 + plant.h * t,
        plant.z + .06 * Math.sin(plant.seed * 1.8 + t * 4.1) - .08 * t * Math.cos(plant.seed),
      )
    })
    return { ...plant, trunk: new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .35), 48, .045, 8, false), lobes: organicCanopy() }
  }), [])
  return <group name="home-v225-living-memory-grove">
    {plants.map((plant, i) => <group key={i}>
      <mesh geometry={plant.trunk} castShadow><meshStandardMaterial color="#334136" roughness={.97}/></mesh>
      <group position={[plant.x, height(plant.x, plant.z) + plant.h + .42, plant.z]} scale={plant.s}>
        {plant.lobes.map((lobe, k) => <mesh key={k} position={lobe.p} scale={lobe.s} castShadow receiveShadow>
          <sphereGeometry args={[1, 28, 20]}/>
          <meshStandardMaterial color={k % 2 ? '#3e5b47' : '#4b6750'} roughness={.93}/>
        </mesh>)}
      </group>
    </group>)}
  </group>
}

function floorCollisionGeometry() {
  const xs = 72, zs = 88, positions: number[] = [], indices: number[] = []
  for (let iz = 0; iz <= zs; iz++) {
    const z = 6.1 - iz / zs * 24.8
    for (let ix = 0; ix <= xs; ix++) {
      const x = -8.8 + ix / xs * 17.6
      positions.push(x, height(x, z), z)
    }
  }
  for (let iz = 0; iz < zs; iz++) for (let ix = 0; ix < xs; ix++) {
    const a = iz * (xs + 1) + ix, b = a + 1, c = a + xs + 1, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function SanctuaryLandscape() {
  const maps = useStoneMaps()
  const floor = useMemo(sculptedFloorGeometry, [])
  const trail = useMemo(pathGeometry, [])
  const strata = useMemo(() => [-1, 1].flatMap((raw) => [
    { g: strataGeometry(raw as -1 | 1, 5.5, -2.9, 1), side: raw },
    { g: strataGeometry(raw as -1 | 1, -2.2, -9.4, 2), side: raw },
    { g: strataGeometry(raw as -1 | 1, -8.8, -15.0, 3), side: raw },
  ]), [])
  const ribs = useMemo(() => [-1, 1].flatMap((raw) => Array.from({ length: 4 }, (_, i) => ({ g: memoryRib(raw as -1 | 1, i), side: raw }))), [])
  return <group name="home-v225-authored-inhabited-sanctuary">
    <mesh geometry={floor} receiveShadow name="home-v225-sculpted-sanctuary-floor">
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.34,.34)} vertexColors roughness={.96}/>
    </mesh>
    <mesh geometry={trail} receiveShadow name="home-v225-grown-winding-memory-path"><meshStandardMaterial vertexColors roughness={.97}/></mesh>
    {strata.map((entry, i) => <mesh key={i} geometry={entry.g} castShadow receiveShadow name={`home-v225-${entry.side < 0 ? 'port' : 'starboard'}-overhanging-strata-${i+1}`}>
      <meshStandardMaterial vertexColors roughness={.95} side={THREE.DoubleSide}/>
    </mesh>)}
    {ribs.map((entry, i) => <mesh key={i} geometry={entry.g} castShadow name={`home-v225-rooted-memory-rib-${i+1}`}>
      <meshStandardMaterial color={entry.side < 0 ? '#425845' : '#374d40'} roughness={.93}/>
    </mesh>)}
    <Grove/>
  </group>
}

function curvedShelterGeometry(kind: 'ground' | 'life-map') {
  const nu = 76, nv = 24, positions: number[] = [], colors: number[] = [], indices: number[] = []
  const low = new THREE.Color(kind === 'ground' ? '#25372f' : '#292a39')
  const high = new THREE.Color(kind === 'ground' ? '#88745a' : '#857294')
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, angle = THREE.MathUtils.degToRad(112 + 136 * u), radius = 1.95 + .12 * Math.sin(u * Math.PI * 3)
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, crown = Math.sin(v * Math.PI)
      const x = radius * Math.cos(angle) + .18 * Math.cos(angle) * v + .04 * Math.sin(v * 18 + u * 9)
      const z = -.55 + radius * Math.sin(angle) + .18 * Math.sin(angle) * v + .04 * Math.sin(v * 13 + u * 14)
      const h = (kind === 'ground' ? 1.60 : 1.78) + .28 * Math.sin(u * Math.PI)
      const y = -.16 + v * h + .15 * crown - .09 * Math.pow(v, 4) * (.5 + .5 * Math.sin(u * 14))
      positions.push(x, y, z)
      const c = low.clone().lerp(high, .18 + .42 * v + .08 * crown)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    indices.push(a,b,c,b,d,c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function approachPathGeometry(kind: 'ground' | 'life-map') {
  const n = 62, cross = 9, positions: number[] = [], indices: number[] = []
  const sign = kind === 'ground' ? -1 : 1
  const centers = Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n
    return new THREE.Vector3(sign * (2.65 * t + .12 * Math.sin(t * Math.PI * 2)), -.12 + .10 * t, 2.9 * t - 1.25)
  })
  centers.forEach((center, i) => {
    const tangent = centers[Math.min(i + 1, n)].clone().sub(centers[Math.max(0, i - 1)]).normalize()
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
    for (let j = 0; j < cross; j++) {
      const s = j / (cross - 1) - .5
      const p = center.clone().addScaledVector(side, s * (.70 + .08 * Math.sin(i * .27)))
      p.y += .025 * Math.cos(s * Math.PI * 2)
      positions.push(p.x, p.y, p.z)
    }
  })
  for (let i = 0; i < n; i++) for (let j = 0; j < cross - 1; j++) {
    const a = i * cross + j, b = a + 1, c = a + cross, d = c + 1
    indices.push(a,b,c,b,d,c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function memoryArc(index: number) {
  const offset = (index - 2) * .38
  const points = Array.from({ length: 38 }, (_, i) => {
    const t = i / 37
    const angle = THREE.MathUtils.lerp(-1.08, 1.08, t)
    const radius = 1.18 + index * .12
    return new THREE.Vector3(
      Math.sin(angle) * radius + offset * .08,
      .14 + Math.sin(t * Math.PI) * (1.1 + index * .11) + .10 * Math.sin(t * Math.PI * 3 + index),
      -.35 - Math.cos(angle) * (.82 + index * .08) - index * .08,
    )
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .38), 80, .022 + index * .002, 8, false)
}

function GroundPlace() {
  const wall = useMemo(() => curvedShelterGeometry('ground'), [])
  const path = useMemo(() => approachPathGeometry('ground'), [])
  const y = height(GROUND.x, GROUND.z)
  return <group position={[GROUND.x, y, GROUND.z]} rotation={[0,.16,0]} name="home-v225-ground-sheltered-memory-basin">
    <mesh geometry={wall} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.93} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={path} receiveShadow><meshStandardMaterial color="#75624d" roughness={.97}/></mesh>
    <mesh position={[.18,.055,-.38]} rotation={[-Math.PI/2,0,0]} castShadow receiveShadow>
      <ringGeometry args={[.44,.78,64]}/><meshStandardMaterial color="#785a43" emissive="#5e2f1e" emissiveIntensity={.28} roughness={.90}/>
    </mesh>
    <mesh position={[.18,.08,-.38]} scale={[.68,.16,.78]} castShadow><sphereGeometry args={[.58,32,20]}/><meshStandardMaterial color="#8c684d" emissive="#6c3824" emissiveIntensity={.42} roughness={.88}/></mesh>
    <pointLight position={[.18,.70,-.30]} color="#edaa78" intensity={2.8} distance={5.6}/>
    <pointLight position={[-.82,1.48,-1.0]} color="#75ae91" intensity={.68} distance={5.2}/>
  </group>
}

function LifeMapPlace() {
  const shelter = useMemo(() => curvedShelterGeometry('life-map'), [])
  const path = useMemo(() => approachPathGeometry('life-map'), [])
  const arcs = useMemo(() => Array.from({ length: 5 }, (_, i) => memoryArc(i)), [])
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  return <group position={[LIFE_MAP.x, y, LIFE_MAP.z]} rotation={[0,-.16,0]} name="home-v225-life-map-rooted-memory-observatory">
    <mesh geometry={shelter} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.90} side={THREE.DoubleSide}/></mesh>
    <mesh geometry={path} receiveShadow><meshStandardMaterial color="#665e72" roughness={.94}/></mesh>
    <group name="home-v225-life-map-braided-lineage-vault">
      {arcs.map((geometry,i)=><mesh key={i} geometry={geometry} castShadow>
        <meshPhysicalMaterial color={i % 2 ? '#8f7ca4' : '#74a695'} emissive={i % 2 ? '#5a476e' : '#426f61'} emissiveIntensity={.48} roughness={.68} clearcoat={.10}/>
      </mesh>)}
      {Array.from({ length: 7 }, (_, i) => <mesh key={`seed-${i}`} position={[-1.28 + i * .42,.24 + .13 * Math.sin(i),-.95 - .12 * (i % 3)]} scale={[.10,.14,.10]}>
        <sphereGeometry args={[1,24,16]}/><meshStandardMaterial color="#c5b8d0" emissive="#796889" emissiveIntensity={.72} roughness={.62}/>
      </mesh>)}
    </group>
    <pointLight position={[-.50,1.40,-.42]} color="#76cfb1" intensity={1.60} distance={5.4}/>
    <pointLight position={[.72,1.82,-1.08]} color="#b69cd4" intensity={1.82} distance={5.8}/>
  </group>
}

export function DestinationLights() { return <><GroundPlace/><LifeMapPlace/></> }

function livingMemoryGeometry() {
  const geometry = new THREE.SphereGeometry(1, 112, 84)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color('#12372f'), teal = new THREE.Color('#4e927e'), pale = new THREE.Color('#bdd5c7'), warm = new THREE.Color('#b9856c')
  for (let i = 0; i < position.count; i++) {
    const bx = position.getX(i), by = position.getY(i), bz = position.getZ(i)
    const upper = Math.max(0, by), lower = Math.max(0, -by), angle = Math.atan2(bz, bx)
    const cleft = Math.exp(-Math.pow(bx / .24, 2) - Math.pow((by - .73) / .25, 2))
    const asym = 1 + .11 * bx * upper - .045 * Math.max(0,-bx) * upper
    const fold = 1 + .045 * Math.sin(angle * 3 + by * 5.5) + .022 * Math.sin(angle * 7 - by * 9.0)
    const taper = 1 - .46 * Math.pow(lower, 1.45)
    let x = bx * (.76 + .18 * upper) * taper * asym * fold
    let z = bz * (.57 + .08 * upper) * taper * (1 + .032 * Math.sin(angle * 4 + by * 3))
    let y = by * 1.02 - .28 * cleft - .17 * Math.pow(lower, 1.8) + .10 * upper * Math.abs(bx)
    x += .055 * (1 - by * by) + .034 * bz + .025 * Math.sin(by * 8 + angle * 2)
    z += .030 * Math.sin(angle * 2 + by * 5) * (1 - by * by)
    y += .034 * Math.sin(angle * 3.0 + by * 8) * (1 - Math.abs(by))
    position.setXYZ(i,x,y,z)
    const side = Math.max(0, Math.cos(angle - .38)) * (1 - Math.abs(by))
    const band = .5 + .5 * Math.sin(angle * 3.4 + by * 7.2)
    const c = deep.clone().lerp(teal,.38 + .26 * band).lerp(pale,.20 * side).lerp(warm,.14 * Math.max(0,Math.cos(angle + 1.05)) * (1-Math.abs(by)))
    colors[i*3]=c.r; colors[i*3+1]=c.g; colors[i*3+2]=c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors,3))
  geometry.computeVertexNormals()
  return geometry
}

function veinGeometry(index: number) {
  const side = index % 2 ? -1 : 1
  const startY = .72 - index * .14
  const points = Array.from({ length: 26 }, (_, i) => {
    const t = i / 25
    const y = startY - t * (1.05 + .05 * index)
    const width = .58 * (1 - .45 * Math.max(0,-y))
    const x = side * width * (.55 + .24 * Math.sin(t * Math.PI + index * .6)) + .06
    const z = .46 * Math.sin(t * Math.PI * 1.15 + index * .7) * (1 - .32 * t)
    return new THREE.Vector3(x,y + .34,z)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points,false,'centripetal',.35),56,.010 + index*.0008,6,false)
}

function orbInteractionGeometry() {
  const geometry = new THREE.SphereGeometry(1,24,18)
  geometry.scale(.76,.98,.62)
  return geometry
}

type Posture = { s:[number,number,number]; r:[number,number,number]; speed:number }
const P: Record<OrbState,Posture> = {
  dormant:{s:[.88,.84,.87],r:[.07,-.09,-.04],speed:.10}, idle:{s:[1,.99,.97],r:[-.05,.06,-.03],speed:.34},
  attention:{s:[1.04,1.05,.95],r:[-.11,.13,.07],speed:.67}, listening:{s:[.97,1.06,.96],r:[.10,-.07,-.06],speed:.24},
  thinking:{s:[1.03,.98,1.02],r:[-.14,.17,.09],speed:.20}, speaking:{s:[1.07,1.04,.95],r:[.04,-.02,-.11],speed:.90},
  guiding:{s:[.98,1.08,.95],r:[-.15,.02,.10],speed:.45}, reflecting:{s:[.99,.97,1.04],r:[.12,.09,-.08],speed:.15},
  calming:{s:[1.02,.96,.99],r:[-.02,-.05,.03],speed:.13}, privacy:{s:[.89,.89,.87],r:[.16,.09,.13],speed:.08},
  warning:{s:[1.07,1.05,.93],r:[-.19,-.07,-.14],speed:1.10}, transition:{s:[.93,1.09,.91],r:[-.19,.05,.14],speed:.73},
}

export function Orb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(livingMemoryGeometry, [])
  const collision = useMemo(orbInteractionGeometry, [])
  const veins = useMemo(() => Array.from({ length: 7 }, (_, i) => veinGeometry(i)), [])
  const posture = P[state]
  useFrame(({clock}) => {
    if (!group.current) return
    const t = clock.elapsedTime * posture.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .83) * .011
    group.current.scale.set(posture.s[0]*breath,posture.s[1]*breath,posture.s[2]*breath)
    group.current.rotation.set(posture.r[0], posture.r[1] + (reducedMotion ? 0 : Math.sin(t*.86)*.029), posture.r[2])
  })
  const warning = state === 'warning'
  return <group ref={group} name="home-v225-single-asymmetric-living-memory-presence" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}}>
    <mesh geometry={geometry} position={[0,.36,0]} scale={[.82,.82,.82]} castShadow name="home-v225-single-connected-folded-living-memory-mantle">
      <meshPhysicalMaterial color="#d8e6df" vertexColors roughness={.70} clearcoat={.08} clearcoatRoughness={.82} sheen={.22} sheenColor="#6ba18f" emissive="#123a31" emissiveIntensity={.11}/>
    </mesh>
    <group position={[0,.35,0]} scale={[.82,.82,.82]} name="home-v225-embedded-memory-veins">
      {veins.map((vein,i)=><mesh key={i} geometry={vein}><meshStandardMaterial color={warning ? '#d77a68' : i % 2 ? '#79bca5' : '#c09276'} emissive={warning ? '#8a392f' : i % 2 ? '#326e5c' : '#754c36'} emissiveIntensity={.52} roughness={.62}/></mesh>)}
    </group>
    <mesh geometry={collision} position={[0,.36,0]}><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.14,.48,.40]} color={warning ? '#d56d5d' : '#6fc4a7'} intensity={state === 'dormant' ? .16 : .78} distance={3.3}/>
    <pointLight position={[-.30,.75,-.20]} color="#d4a07d" intensity={state === 'dormant' ? .05 : .20} distance={2.3}/>
  </group>
}

export function Terrain({ walk, onGround, onLifeMap }: { walk:(event:ThreeEvent<MouseEvent>)=>void; onGround:()=>void; onLifeMap:()=>void }) {
  const collision = useMemo(floorCollisionGeometry, [])
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const gd = Math.hypot(event.point.x - GROUND.x,event.point.z - GROUND.z)
    const ld = Math.hypot(event.point.x - LIFE_MAP.x,event.point.z - LIFE_MAP.z)
    gd < 2.55 ? onGround() : ld < 2.55 ? onLifeMap() : walk(event)
  }
  return <group name="home-v225-authored-memory-valley" onClick={activate}><SanctuaryLandscape/><mesh geometry={collision} visible={false} onClick={activate}/></group>
}

export function Escarpment({ side }: { side:-1|1 }) {
  return <group name={side < 0 ? 'home-v225-port-authored-strata' : 'home-v225-starboard-authored-strata'} userData={{visualSource:'authored-v225-integrated-topology',side}}/>
}

// Historical components load their maps on demand. Importing the shared
// navigation constants must not preload retired scene textures.
