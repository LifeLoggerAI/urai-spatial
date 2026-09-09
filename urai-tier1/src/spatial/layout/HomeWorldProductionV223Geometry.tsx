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
export const ORB = new THREE.Vector3(-.45, 1.02, -7.45)
export const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
export const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
export const BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -14.4, maxZ: 6.8 }

type PbrMaps = [THREE.Texture, THREE.Texture, THREE.Texture]

function maps(): PbrMaps {
  const [c, n, a] = useTexture(T as unknown as string[])
  return useMemo(() => [c, n, a].map((source, index) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(2.4, 3.2)
    texture.anisotropy = 8
    texture.colorSpace = index ? THREE.NoColorSpace : THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }) as PbrMaps, [a, c, n])
}

export function height(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((5.8 - z) / 24, 0, 1)
  const lateral = Math.abs(x) / 8.6
  const shoulder = .62 * Math.pow(lateral, 2.7) * (.28 + .82 * depth)
  const broad = .055 * Math.sin(z * .31 + x * .22) + .025 * Math.sin(z * .83 - x * .7)
  const path = -.12 * Math.exp(-Math.pow((x - .28 * Math.sin((z + 3) * .24)) / 1.9, 4))
  const groundBasin = -.22 * Math.exp(-(Math.pow((x + 4.85) / 1.8, 2) + Math.pow((z + 8.25) / 2.2, 2)))
  const mapBasin = -.18 * Math.exp(-(Math.pow((x - 4.85) / 1.8, 2) + Math.pow((z + 8.25) / 2.2, 2)))
  return -.62 + .10 * depth + shoulder + broad + path + groundBasin + mapBasin
}

function floorGeometry() {
  const xs = 96, zs = 112
  const positions: number[] = [], uvs: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#142923'), moss = new THREE.Color('#35493a'), earth = new THREE.Color('#665542'), moon = new THREE.Color('#708176')
  for (let iz = 0; iz <= zs; iz++) {
    const vz = iz / zs, z = 5.8 - vz * 24
    for (let ix = 0; ix <= xs; ix++) {
      const vx = ix / xs, x = -8.6 + vx * 17.2
      const y = height(x, z)
      positions.push(x, y, z)
      uvs.push(vx * 2.4, vz * 3.2)
      const center = 1 - THREE.MathUtils.clamp(Math.abs(x) / 8.6, 0, 1)
      const depth = THREE.MathUtils.clamp((5.8 - z) / 24, 0, 1)
      const warm = .5 + .5 * Math.sin(z * .42 + x * .6)
      const c = deep.clone().lerp(moss, .26 + .38 * center).lerp(earth, .06 + .10 * warm).lerp(moon, .05 * depth)
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let iz = 0; iz < zs; iz++) for (let ix = 0; ix < xs; ix++) {
    const a = iz * (xs + 1) + ix, b = a + 1, c = a + xs + 1, d = c + 1
    if ((ix + iz) & 1) indices.push(a, b, d, a, d, c)
    else indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function strataGeometry(side: -1 | 1, z0: number, z1: number, seed: number) {
  const ns = 52, nv = 18
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const shadow = new THREE.Color('#172a25'), mineral = new THREE.Color('#405143'), lichen = new THREE.Color('#65715c'), warm = new THREE.Color('#715d49')
  for (let j = 0; j <= ns; j++) {
    const u = j / ns, z = z0 + (z1 - z0) * u
    const depth = THREE.MathUtils.clamp((5.8 - z) / 24, 0, 1)
    const edge = 6.05 + .42 * Math.sin(z * .29 + seed) + .16 * Math.sin(z * 1.11 - seed * .7)
    const baseX = side * edge
    const baseY = height(baseX * .92, z) - .10
    const h = 2.25 + 2.7 * depth + .28 * Math.sin(z * .37 + seed)
    for (let k = 0; k <= nv; k++) {
      const v = k / nv
      const crown = Math.pow(Math.sin(v * Math.PI), 1.35)
      const ledge = .20 * Math.sin(v * Math.PI * 8 + u * 3 + seed) + .08 * Math.sin(v * Math.PI * 19 - u * 6)
      const inward = (.18 + .62 * crown) * (.60 + .40 * depth) + ledge * .18
      const x = baseX - side * inward + side * .07 * Math.sin(v * 16 + z * .34 + seed)
      const y = baseY + v * h + .045 * Math.sin(v * 31 + u * 7 + seed)
      const zz = z + .16 * Math.sin(v * Math.PI * 2 + seed) + .05 * Math.sin(v * 17 + u * 12)
      positions.push(x, y, zz)
      const band = .5 + .5 * Math.sin(v * 35 + z * .8 + seed)
      const c = shadow.clone().lerp(mineral, .20 + .34 * v).lerp(lichen, .14 * crown).lerp(warm, .09 * band)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let j = 0; j < ns; j++) for (let k = 0; k < nv; k++) {
    const a = j * row + k, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function rootVeinGeometry(side: -1 | 1, index: number) {
  const z0 = 1.0 - index * 3.6
  const points = Array.from({ length: 18 }, (_, i) => {
    const t = i / 17
    const z = z0 - 3.2 * t
    const x = side * (5.55 - .18 * Math.sin(t * Math.PI) + .12 * Math.sin(index * 1.9 + t * 5))
    const y = height(x * .96, z) + .28 + 1.65 * Math.sin(t * Math.PI) + .14 * Math.sin(t * Math.PI * 3 + index)
    return new THREE.Vector3(x, y, z)
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .35), 44, .045 + index * .004, 5, false)
}

function floorCollisionGeometry() {
  const xs = 64, zs = 72, pos: number[] = [], idx: number[] = []
  for (let iz = 0; iz <= zs; iz++) {
    const z = 5.8 - iz / zs * 24
    for (let ix = 0; ix <= xs; ix++) {
      const x = -8.6 + ix / xs * 17.2
      pos.push(x, height(x, z), z)
    }
  }
  for (let iz = 0; iz < zs; iz++) for (let ix = 0; ix < xs; ix++) {
    const a = iz * (xs + 1) + ix, b = a + 1, c = a + xs + 1, d = c + 1
    idx.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function SanctuaryLandscape() {
  const m = maps()
  const floor = useMemo(floorGeometry, [])
  const cliffs = useMemo(() => {
    const segments: [number, number][] = [[4.2, -2.5], [-1.9, -8.4], [-7.8, -14.4], [-13.8, -18.2]]
    return [-1, 1].flatMap((raw) => segments.map(([a, b], i) => ({ side: raw as -1 | 1, i, g: strataGeometry(raw as -1 | 1, a, b, 7.3 + i * 2.7 + raw) })))
  }, [])
  const veins = useMemo(() => [-1, 1].flatMap((raw) => Array.from({ length: 4 }, (_, i) => ({ side: raw as -1 | 1, i, g: rootVeinGeometry(raw as -1 | 1, i) }))), [])
  return <group name="home-v224-authored-inhabited-sanctuary">
    <mesh geometry={floor} receiveShadow name="home-v224-sculpted-sanctuary-floor">
      <meshStandardMaterial normalMap={m[1]} roughnessMap={m[2]} normalScale={new THREE.Vector2(.09, .09)} vertexColors roughness={.96}/>
    </mesh>
    {cliffs.map((x, k) => <mesh key={`c${k}`} geometry={x.g} castShadow receiveShadow name={`home-v224-${x.side < 0 ? 'port' : 'starboard'}-weathered-strata-${x.i + 1}`}>
      <meshStandardMaterial vertexColors roughness={.94}/>
    </mesh>)}
    {veins.map((x, k) => <mesh key={`r${k}`} geometry={x.g} castShadow name={`home-v224-rooted-memory-rib-${k + 1}`}>
      <meshStandardMaterial color={x.side < 0 ? '#48604c' : '#3e5749'} roughness={.90}/>
    </mesh>)}
  </group>
}

function curvedWallGeometry(kind: 'ground' | 'life-map') {
  const nu = 58, nv = 17, pos: number[] = [], col: number[] = [], idx: number[] = []
  const base = new THREE.Color(kind === 'ground' ? '#263c32' : '#343247')
  const hi = new THREE.Color(kind === 'ground' ? '#806d52' : '#77678a')
  for (let i = 0; i <= nu; i++) {
    const u = i / nu
    const angle = THREE.MathUtils.degToRad(118 + 124 * u)
    const radius = (kind === 'ground' ? 1.95 : 2.08) + .12 * Math.sin(u * Math.PI * 3)
    const bx = radius * Math.cos(angle), bz = -.55 + radius * Math.sin(angle)
    for (let j = 0; j <= nv; j++) {
      const v = j / nv
      const h = (kind === 'ground' ? 1.55 : 1.85) + .28 * Math.sin(u * Math.PI)
      const crown = Math.sin(v * Math.PI)
      const x = bx + .16 * Math.cos(angle) * v + .035 * Math.sin(v * 17 + u * 8)
      const z = bz + .16 * Math.sin(angle) * v + .04 * Math.sin(v * 11 + u * 13)
      const y = -.12 + v * h + .10 * crown - .10 * Math.pow(v, 5) * (.5 + .5 * Math.sin(u * 15))
      pos.push(x, y, z)
      const c = base.clone().lerp(hi, .12 + .30 * v + .08 * crown)
      col.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    idx.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function approachPathGeometry(kind: 'ground' | 'life-map') {
  const n = 52, cross = 9, pos: number[] = [], idx: number[] = [], centers: THREE.Vector3[] = []
  const sign = kind === 'ground' ? 1 : -1
  for (let i = 0; i <= n; i++) {
    const t = i / n
    centers.push(new THREE.Vector3(sign * (2.45 * t + .12 * Math.sin(t * Math.PI * 2)), -.10 + .12 * t, 2.95 * t - 1.25))
  }
  for (let i = 0; i <= n; i++) {
    const tangent = centers[Math.min(i + 1, n)].clone().sub(centers[Math.max(0, i - 1)]).normalize()
    const side = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize()
    for (let j = 0; j < cross; j++) {
      const s = j / (cross - 1) - .5
      const p = centers[i].clone().addScaledVector(side, s * (.72 + .10 * Math.sin(i * .3)))
      p.y += .025 * Math.cos(s * Math.PI * 2)
      pos.push(p.x, p.y, p.z)
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < cross - 1; j++) {
    const a = i * cross + j, b = a + 1, c = a + cross, d = c + 1
    idx.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function lifeLedgerGeometry() {
  const nu = 64, nv = 22, pos: number[] = [], col: number[] = [], idx: number[] = []
  const deep = new THREE.Color('#302d43'), violet = new THREE.Color('#6f6283'), pearl = new THREE.Color('#9a8fa7')
  for (let i = 0; i <= nu; i++) {
    const u = i / nu, x = -2.35 + 4.7 * u
    const ridge = .82 + .58 * Math.exp(-Math.pow((x + 1.05) / .66, 2)) + 1.0 * Math.exp(-Math.pow((x - .18) / .72, 2)) + .66 * Math.exp(-Math.pow((x - 1.45) / .62, 2))
    for (let j = 0; j <= nv; j++) {
      const v = j / nv
      const y = -.08 + v * ridge + .06 * Math.sin(v * Math.PI * 3 + x * .8)
      const z = -1.48 - .46 * v + .15 * Math.sin(x * 1.25) + .035 * Math.sin(v * 19 + x * 3.4)
      pos.push(x, y, z)
      const c = deep.clone().lerp(violet, .18 + .30 * v).lerp(pearl, .08 * Math.pow(v, 2))
      col.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    idx.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function GroundPlace() {
  const wall = useMemo(() => curvedWallGeometry('ground'), [])
  const path = useMemo(() => approachPathGeometry('ground'), [])
  const hearth = useMemo(() => new THREE.SphereGeometry(.48, 32, 18), [])
  const y = height(GROUND.x, GROUND.z)
  return <group position={[GROUND.x + .18, y, GROUND.z]} rotation={[0, .08, 0]} name="home-v224-ground-sheltered-memory-basin">
    <mesh geometry={wall} castShadow receiveShadow name="home-v197-ground-continuous-sheltering-memory-wall"><meshStandardMaterial vertexColors roughness={.91}/></mesh>
    <mesh geometry={path} receiveShadow name="home-v197-ground-grown-in-place-memory-path"><meshStandardMaterial color="#756451" roughness={.96}/></mesh>
    <mesh geometry={hearth} position={[.72, .03, -.25]} scale={[1.05, .22, 1.2]} castShadow name="home-v203-ground-embedded-weathered-hearth"><meshStandardMaterial color="#8b6245" emissive="#7b3e25" emissiveIntensity={.22} roughness={.90}/></mesh>
    <pointLight position={[.72, .58, -.22]} color="#e0a06c" intensity={2.5} distance={5.2}/>
    <pointLight position={[-.75, 1.35, -.9]} color="#81b89d" intensity={.55} distance={4.4}/>
  </group>
}

function LifeMapPlace() {
  const wall = useMemo(lifeLedgerGeometry, [])
  const path = useMemo(() => approachPathGeometry('life-map'), [])
  const traces = useMemo(() => Array.from({ length: 4 }, (_, k) => {
    const points = Array.from({ length: 14 }, (_, i) => {
      const t = i / 13
      return new THREE.Vector3(-1.65 + k * 1.02 + .16 * Math.sin(t * Math.PI * 2 + k), .12 + .22 * t + .07 * k * t, .95 - 2.45 * t + .08 * Math.sin(t * Math.PI * 3 + k))
    })
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .4), 40, .014 + k * .002, 5, false)
  }), [])
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  return <group position={[LIFE_MAP.x - .18, y, LIFE_MAP.z]} rotation={[0, -.08, 0]} name="home-v224-life-map-ascending-memory-terraces">
    <mesh geometry={wall} castShadow receiveShadow name="home-v200-life-map-integrated-weathered-memory-ledger-1"><meshStandardMaterial vertexColors roughness={.86} emissive="#262238" emissiveIntensity={.10}/></mesh>
    <mesh geometry={path} receiveShadow name="home-v197-life-map-ascending-observatory-path"><meshStandardMaterial color="#625d73" roughness={.92}/></mesh>
    {traces.map((g, k) => <mesh key={k} geometry={g} name={`home-v203-life-map-embedded-lineage-trace-${k + 1}`}><meshStandardMaterial color="#a495b9" emissive="#67577d" emissiveIntensity={.35} roughness={.75}/></mesh>)}
    <pointLight position={[-.45, 1.25, -.45]} color="#75cdb0" intensity={1.15} distance={4.8}/>
    <pointLight position={[.75, 1.75, -1.05]} color="#b79dd6" intensity={1.3} distance={5.0}/>
  </group>
}

export function DestinationLights() { return <><GroundPlace/><LifeMapPlace/></> }

function orbGeometry() {
  const g = new THREE.SphereGeometry(1, 96, 64)
  const p = g.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(p.count * 3)
  const deep = new THREE.Color('#153c35'), teal = new THREE.Color('#4c9b83'), mint = new THREE.Color('#9ac9b5'), warm = new THREE.Color('#bc8669')
  for (let i = 0; i < p.count; i++) {
    const bx = p.getX(i), by = p.getY(i), bz = p.getZ(i)
    const upper = Math.max(0, by), lower = Math.max(0, -by)
    const angle = Math.atan2(bz, bx)
    const notch = Math.exp(-(bx * bx) / .055 - Math.pow((by - .73) / .30, 2))
    const lobe = Math.pow(upper, 1.7) * Math.min(1, Math.abs(bx) * 2.3)
    const taper = 1 - .48 * Math.pow(lower, 1.35)
    const ripple = 1 + .020 * Math.sin(angle * 5 + by * 5.4) + .010 * Math.sin(angle * 9 - by * 7)
    let x = bx * (.76 + .18 * upper) * taper * ripple
    let z = bz * (.57 + .07 * upper) * taper * (1 + .018 * Math.sin(angle * 4 + .6))
    let y = by * .98 - .20 * notch + .12 * lobe - .13 * Math.pow(lower, 1.8)
    x += .045 * (1 - by * by) + .025 * bz
    z += .020 * Math.sin(angle * 2 + by * 4) * (1 - by * by)
    p.setXYZ(i, x, y, z)
    const sideLight = Math.max(0, Math.cos(angle - .5)) * (1 - Math.abs(by))
    const band = .5 + .5 * Math.sin(angle * 3.2 + by * 6.5)
    const c = deep.clone().lerp(teal, .36 + .26 * band).lerp(mint, .16 * sideLight).lerp(warm, .12 * Math.max(0, Math.cos(angle + 1.25)) * (1 - Math.abs(by)))
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  g.computeVertexNormals()
  return g
}

function orbInteractionGeometry() {
  const g = new THREE.IcosahedronGeometry(1, 2)
  g.scale(.62, .86, .56)
  return g
}

type Posture = { s: [number, number, number]; r: [number, number, number]; speed: number }
const P: Record<OrbState, Posture> = {
  dormant:{s:[.86,.82,.86],r:[.08,-.10,-.05],speed:.10}, idle:{s:[1,.98,.96],r:[-.05,.07,-.04],speed:.34},
  attention:{s:[1.05,1.04,.94],r:[-.12,.14,.08],speed:.68}, listening:{s:[.96,1.06,.95],r:[.12,-.08,-.07],speed:.25},
  thinking:{s:[1.04,.97,1.02],r:[-.15,.18,.10],speed:.20}, speaking:{s:[1.08,1.03,.94],r:[.05,-.03,-.12],speed:.92},
  guiding:{s:[.97,1.08,.94],r:[-.16,.02,.11],speed:.46}, reflecting:{s:[.98,.96,1.05],r:[.13,.10,-.09],speed:.15},
  calming:{s:[1.03,.95,.99],r:[-.02,-.05,.03],speed:.13}, privacy:{s:[.88,.88,.86],r:[.17,.10,.14],speed:.08},
  warning:{s:[1.08,1.04,.92],r:[-.20,-.08,-.15],speed:1.15}, transition:{s:[.92,1.09,.90],r:[-.20,.06,.15],speed:.75},
}

export function Orb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(orbGeometry, [])
  const collision = useMemo(orbInteractionGeometry, [])
  const posture = P[state]
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime * posture.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .82) * .014
    group.current.scale.set(posture.s[0] * breath, posture.s[1] * breath, posture.s[2] * breath)
    group.current.rotation.set(posture.r[0], posture.r[1] + (reducedMotion ? 0 : Math.sin(t * .88) * .032), posture.r[2])
  })
  const warning = state === 'warning'
  return <group ref={group} name="home-v224-single-living-memory-presence" position={ORB} onClick={(e) => { e.stopPropagation(); onOpen() }}>
    <mesh geometry={geometry} position={[0, .42, 0]} scale={[1.06, 1.06, 1.06]} castShadow name="home-v201-single-connected-folded-living-memory-mantle">
      <meshPhysicalMaterial color="#e4eee8" vertexColors roughness={.56} clearcoat={.18} clearcoatRoughness={.72} sheen={.12} sheenColor="#6fae99" emissive="#143d34" emissiveIntensity={.12}/>
    </mesh>
    <mesh geometry={collision} position={[0, .42, 0]} scale={[1.2, 1.2, 1.2]}><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.18, .48, .42]} color={warning ? '#d2705b' : '#6bc5a7'} intensity={state === 'dormant' ? .24 : 1.05} distance={3.5}/>
    <pointLight position={[-.35, .80, -.22]} color="#d6a17b" intensity={state === 'dormant' ? .08 : .28} distance={2.4}/>
  </group>
}

export function Terrain({ walk, onGround, onLifeMap }: { walk: (event: ThreeEvent<MouseEvent>) => void; onGround: () => void; onLifeMap: () => void }) {
  const collision = useMemo(floorCollisionGeometry, [])
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const gd = Math.hypot(event.point.x - GROUND.x, event.point.z - GROUND.z)
    const ld = Math.hypot(event.point.x - LIFE_MAP.x, event.point.z - LIFE_MAP.z)
    gd < 2.55 ? onGround() : ld < 2.55 ? onLifeMap() : walk(event)
  }
  return <group name="home-v224-weathered-valley-floor" onClick={activate}><SanctuaryLandscape/><mesh geometry={collision} visible={false} onClick={activate}/></group>
}

export function Escarpment({ side }: { side: -1 | 1 }) {
  return <group name={side < 0 ? 'home-v224-port-broken-strata' : 'home-v224-starboard-broken-strata'} userData={{ visualSource: 'authored-v224-runtime-topology', side }}/>
}

useTexture.preload(T as unknown as string[])
