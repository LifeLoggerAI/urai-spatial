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
    Math.max(48, points.length * 2), radius, radial, false,
  )
}

function terrainGeometry() {
  const nx = 144, nz = 188
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#0b211d')
  const moss = new THREE.Color('#315342')
  const loam = new THREE.Color('#69533e')
  const lichen = new THREE.Color('#71806a')
  for (let iz = 0; iz <= nz; iz++) {
    const z = 6.4 - iz / nz * 26.2
    for (let ix = 0; ix <= nx; ix++) {
      const x = -9.4 + ix / nx * 18.8
      const depth = THREE.MathUtils.clamp((5 - z) / 23.5, 0, 1)
      const lane = Math.exp(-Math.pow(x / 2.3, 2))
      const side = Math.pow(THREE.MathUtils.clamp((Math.abs(x) - 2.15) / 7.1, 0, 1), 1.35)
      const strata = .045 * Math.sin(x * 2.35 + z * 1.47) + .024 * Math.cos(x * 5.1 - z * 2.6)
      const fold = .09 * Math.sin(x * .72 + z * .30) + .052 * Math.cos(x * 1.14 - z * .51)
      const y = height(x, z) + fold * (1 - .62 * lane) + strata + side * (.25 + .42 * depth) + .018
      positions.push(x, y, z)
      const grain = .5 + .5 * Math.sin(x * 3.2 + z * 2.7) * Math.cos(z * 1.1 - x * 1.7)
      const c = deep.clone().lerp(moss, .28 + .34 * (1 - Math.abs(x) / 9.4)).lerp(loam, .10 + .10 * grain).lerp(lichen, .08 * depth)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nx + 1
  for (let iz = 0; iz < nz; iz++) for (let ix = 0; ix < nx; ix++) {
    const a = iz * row + ix, b = a + 1, c = a + row, d = c + 1
    if ((ix + iz) & 1) indices.push(a, b, d, a, d, c)
    else indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function memoryPathGeometry() {
  const n = 138, cross = 18
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const moss = new THREE.Color('#314b3d'), ember = new THREE.Color('#8d6b49'), pale = new THREE.Color('#aa9670')
  for (let i = 0; i <= n; i++) {
    const t = i / n, z = 5.1 - t * 21.5
    const cx = .18 * Math.sin(t * Math.PI * 2.1) + .07 * Math.sin(t * Math.PI * 5.5)
    for (let j = 0; j < cross; j++) {
      const u = j / (cross - 1) - .5
      const width = 1.55 + .20 * Math.sin(t * Math.PI) + .08 * Math.sin(i * .18)
      const x = cx + u * width
      const y = height(x, z) + .065 + .022 * Math.cos(u * Math.PI * 2) + .008 * Math.sin(i * .33 + u * 7)
      positions.push(x, y, z)
      const center = 1 - Math.abs(u) * 2
      const c = moss.clone().lerp(ember, .30 + .36 * center).lerp(pale, .08 * center * Math.sin(t * Math.PI))
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < n; i++) for (let j = 0; j < cross - 1; j++) {
    const a = i * cross + j, b = a + 1, c = a + cross, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function escarpmentGeometry(side: -1 | 1, band: number) {
  const ns = 92, nv = 44
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color(side < 0 ? '#142c25' : '#12312a')
  const stone = new THREE.Color(side < 0 ? '#4f5f4d' : '#456257')
  const ochre = new THREE.Color('#785b43')
  const z0 = 5.8 - band * 7.4, z1 = z0 - 9.5
  for (let i = 0; i <= ns; i++) {
    const u = i / ns, z = THREE.MathUtils.lerp(z0, z1, u), depth = THREE.MathUtils.clamp((5 - z) / 24, 0, 1)
    for (let j = 0; j <= nv; j++) {
      const v = j / nv
      const baseX = side * (6.55 + .30 * Math.sin(z * .29 + band * 1.5) + .16 * Math.sin(z * .93 - band))
      const hollow = Math.pow(Math.sin(v * Math.PI), 1.22) * (1.10 + .20 * band)
      const fracture = .25 * Math.sin(v * Math.PI * 5 + u * 6.1 + band) + .12 * Math.sin(v * 21 - u * 5)
      const x = baseX - side * (hollow + fracture * .20)
      const floor = height(x * .88, z)
      const total = 2.45 + 1.95 * depth + .38 * band
      const y = floor - .12 + v * total + .13 * Math.sin(v * Math.PI * 3.7 + u * 7 + band) + .055 * Math.sin(v * 23 + u * 13)
      positions.push(x, y, z - .22 * v + .10 * Math.sin(v * 7 + u * 5 + band))
      const layers = .5 + .5 * Math.sin(v * 39 + u * 11 + band)
      const c = dark.clone().lerp(stone, .26 + .48 * v).lerp(ochre, .10 * layers)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < ns; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function canopyGeometry(side: -1 | 1, index: number) {
  const nu = 58, nv = 18
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color('#173029'), stone = new THREE.Color('#536555'), warm = new THREE.Color('#746047')
  for (let i = 0; i <= nu; i++) {
    const t = i / nu
    const z = -8.4 - index * 4.15 - .45 * Math.sin(t * Math.PI)
    const xCenter = side * (6.25 - t * (4.4 - index * .18))
    const yCenter = 1.20 + t * (2.75 + index * .30) + .55 * Math.sin(t * Math.PI)
    for (let j = 0; j <= nv; j++) {
      const v = j / nv - .5
      const taper = 1 - .45 * t
      const x = xCenter + side * (.20 * Math.sin(t * 8 + index) + v * .22)
      const y = yCenter + v * (1.25 * taper) + .07 * Math.sin(v * 12 + t * 7)
      const zz = z + v * .68 + .08 * Math.sin(t * 13 + v * 5 + index)
      positions.push(x, y, zz)
      const c = dark.clone().lerp(stone, .32 + .36 * (v + .5)).lerp(warm, .08 * Math.sin(t * Math.PI))
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function MemoryValley({ onWalk }: { onWalk: WalkHandler }) {
  const floor = useMemo(terrainGeometry, [])
  const path = useMemo(memoryPathGeometry, [])
  const walls = useMemo(() => ([-1, 1] as const).flatMap(side => Array.from({ length: 3 }, (_, band) => ({ side, band, g: escarpmentGeometry(side, band) }))), [])
  const canopies = useMemo(() => ([-1, 1] as const).flatMap(side => Array.from({ length: 2 }, (_, index) => ({ side, index, g: canopyGeometry(side, index) }))), [])
  return <group name="home-v225-v2-continuous-sculpted-memory-valley">
    <mesh geometry={floor} receiveShadow onClick={onWalk} name="home-v225-v2-authored-valley-floor"><meshStandardMaterial vertexColors roughness={.98}/></mesh>
    <mesh geometry={path} receiveShadow onClick={onWalk} name="home-v225-v2-grown-memory-walk"><meshStandardMaterial vertexColors roughness={.94} emissive="#3f2a1e" emissiveIntensity={.08}/></mesh>
    <group name="home-v225-v2-weathered-memory-walls">{walls.map(({ side, band, g }) => <mesh key={`${side}-${band}`} geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.97}/></mesh>)}</group>
    <group name="home-v225-v2-cathedral-memory-ribs">{canopies.map(({ side, index, g }) => <mesh key={`${side}-${index}`} geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.95} side={THREE.DoubleSide}/></mesh>)}</group>
  </group>
}

function caveArchGeometry(layer: number) {
  const n = 76
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const dark = new THREE.Color('#241f1b'), stone = new THREE.Color('#5f5746'), amber = new THREE.Color('#8a5a3a'), moss = new THREE.Color('#4d644f')
  for (let i = 0; i <= n; i++) {
    const t = i / n, a = Math.PI * t
    const noise = .10 * Math.sin(a * 5 + layer) + .04 * Math.sin(a * 13 - layer)
    const outerX = Math.cos(a) * (1.88 - layer * .11 + noise)
    const outerY = Math.sin(a) * (1.58 - layer * .08 + noise * .5)
    const innerX = Math.cos(a) * (.98 - layer * .05 + noise * .25)
    const innerY = Math.sin(a) * (.94 - layer * .05 + noise * .22)
    const zFront = .38 - layer * .32, zBack = -1.18 - layer * .18
    const verts = [[outerX, outerY, zFront], [innerX, innerY, zFront], [outerX * .95, outerY * .96, zBack], [innerX * .92, innerY * .94, zBack]]
    for (let k = 0; k < 4; k++) {
      positions.push(...verts[k])
      const heightMix = Math.sin(a)
      const c = dark.clone().lerp(stone, .34 + .32 * heightMix).lerp(amber, .11 * (1 - layer / 3)).lerp(moss, .08 * (1 - t))
      colors.push(c.r, c.g, c.b)
    }
  }
  for (let i = 0; i < n; i++) {
    const a = i * 4, b = a + 4
    indices.push(a, b, a + 1, b, b + 1, a + 1)
    indices.push(a + 2, a + 3, b + 2, b + 2, a + 3, b + 3)
    indices.push(a, a + 2, b, b, a + 2, b + 2)
    indices.push(a + 1, b + 1, a + 3, b + 1, b + 3, a + 3)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function GroundHearth({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const arches = useMemo(() => Array.from({ length: 4 }, (_, i) => caveArchGeometry(i)), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} name="home-v225-v2-ground-memory-hearth" onClick={e => { e.stopPropagation(); onGround() }}>
    <group position={[2.55, 0, .18]}>
      {arches.map((g, i) => <mesh key={i} geometry={g} position={[0, .03 * i, -.13 * i]} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.96} side={THREE.DoubleSide}/></mesh>)}
      <mesh position={[0, .78, -1.24]} scale={[1.0, .82, .46]}><sphereGeometry args={[1, 46, 28]}/><meshStandardMaterial color="#171b17" roughness={1}/></mesh>
      <mesh position={[0, .13, -.25]} scale={[.86, .18, .68]} receiveShadow><sphereGeometry args={[1, 42, 24]}/><meshStandardMaterial color="#66503c" emissive="#5a2d1d" emissiveIntensity={.22} roughness={.94}/></mesh>
      <mesh position={[0, .30, -.22]} scale={[.43, .12, .34]}><sphereGeometry args={[1, 36, 24]}/><meshPhysicalMaterial color="#e5a475" emissive="#bd5a36" emissiveIntensity={1.35} roughness={.45}/></mesh>
      {Array.from({ length: 7 }, (_, i) => {
        const a = -.95 + i * .31
        return <mesh key={i} position={[Math.cos(a) * 1.10, .17 + .035 * (i % 2), Math.sin(a) * .64 - .05]} rotation={[0, -a, 0]} scale={[.25, .10, .44]} castShadow>
          <sphereGeometry args={[1, 28, 18]}/><meshStandardMaterial color={i % 2 ? '#78664d' : '#566351'} roughness={.95}/>
        </mesh>
      })}
      <pointLight position={[0, .78, -.14]} color="#ef9b67" intensity={6.5} distance={7.8}/>
      <pointLight position={[-.48, 1.55, -.62]} color="#8fb79d" intensity={1.25} distance={5.8}/>
    </group>
  </group>
}

function observatoryWingGeometry(side: -1 | 1) {
  const nu = 54, nv = 20
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#1c2d2a'), stone = new THREE.Color('#596962'), violet = new THREE.Color('#675c72')
  for (let i = 0; i <= nu; i++) {
    const t = i / nu
    const xCenter = side * (1.72 - t * 1.18) + .12 * Math.sin(t * 8 + (side < 0 ? 1 : 0))
    const yCenter = .10 + t * 2.42 + .30 * Math.sin(t * Math.PI)
    const zCenter = -.06 - t * .68
    for (let j = 0; j <= nv; j++) {
      const v = j / nv - .5
      positions.push(xCenter + side * v * .36, yCenter + v * .58, zCenter + v * .50 + .05 * Math.sin(v * 10 + t * 6))
      const c = deep.clone().lerp(stone, .35 + .35 * t).lerp(violet, .10 * Math.sin(t * Math.PI))
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
    const a = i * row + j, b = a + 1, c = a + row, d = c + 1
    indices.push(a, b, c, b, d, c)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function galaxyPositions(seed: number, count: number, scale: number) {
  const p: number[] = []
  for (let i = 0; i < count; i++) {
    const t = i / count, arm = i % 5, angle = t * Math.PI * 10.5 + arm * Math.PI * .4 + seed
    const r = .12 + Math.pow(t, .68) * scale
    p.push(Math.cos(angle) * r, .05 + Math.sin(angle) * r * .46 + (.5 - t) * .42, Math.sin(angle * .52 + i * .025) * r * .48)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3))
  return g
}

function memoryBridge(index: number) {
  const a = index * .88 + .25, r = .62 + (index % 4) * .22
  const end = new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.27) * r * .42, Math.sin(a) * r * .30)
  const points = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(end.x * .45, .18 + end.y * .55, end.z * .40 - .08), end]
  return { g: tube(points, .012, 6), end }
}

function LifeMapObservatory({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const wings = useMemo(() => ([-1, 1] as const).map(side => ({ side, g: observatoryWingGeometry(side) })), [])
  const starsA = useMemo(() => galaxyPositions(.2, 520, 1.55), [])
  const starsB = useMemo(() => galaxyPositions(1.0, 300, 1.18), [])
  const bridges = useMemo(() => Array.from({ length: 10 }, (_, i) => memoryBridge(i)), [])
  return <group position={[LIFE_MAP.x, y + .03, LIFE_MAP.z]} name="home-v225-v2-life-map-lineage-observatory" onClick={e => { e.stopPropagation(); onLifeMap() }}>
    <group position={[-2.55, 0, .05]}>
      {wings.map(({ side, g }) => <mesh key={side} geometry={g} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.94} side={THREE.DoubleSide}/></mesh>)}
      <mesh position={[0, .08, -.10]} scale={[1.48, .20, .86]} receiveShadow><sphereGeometry args={[1, 42, 24]}/><meshStandardMaterial color="#3a5148" roughness={.95}/></mesh>
      <group position={[0, 1.40, -.38]}>
        <points geometry={starsA}><pointsMaterial color="#a9e2ce" size={.035} transparent opacity={.78} depthWrite={false} sizeAttenuation/></points>
        <points geometry={starsB}><pointsMaterial color="#d4b5df" size={.026} transparent opacity={.64} depthWrite={false} sizeAttenuation/></points>
        {bridges.map(({ g, end }, i) => <group key={i}>
          <mesh geometry={g}><meshStandardMaterial color={i % 2 ? '#7fc3aa' : '#a98ab8'} emissive={i % 2 ? '#336f5c' : '#60476d'} emissiveIntensity={.72} roughness={.52}/></mesh>
          <mesh position={end} scale={[.050 + (i % 3) * .010, .050 + (i % 3) * .010, .050 + (i % 3) * .010]}><sphereGeometry args={[1, 20, 14]}/><meshStandardMaterial color={i % 3 === 0 ? '#e7cb91' : i % 2 ? '#9bd3bd' : '#c4a6d0'} emissive={i % 3 === 0 ? '#9d6b31' : i % 2 ? '#3d7d67' : '#6c4f7b'} emissiveIntensity={1.15}/></mesh>
        </group>)}
        <mesh scale={[.16, .16, .16]}><sphereGeometry args={[1, 32, 22]}/><meshPhysicalMaterial color="#f5dfae" emissive="#d6a14c" emissiveIntensity={2.15} roughness={.25}/></mesh>
      </group>
      <pointLight position={[0, 1.55, -.22]} color="#8bd2b9" intensity={3.1} distance={6.8}/>
      <pointLight position={[.75, 2.20, -.62]} color="#b695c7" intensity={1.35} distance={5.5}/>
    </group>
  </group>
}

function livingMantleGeometry() {
  const rows = 72, cols = 104
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#0b2b24'), jade = new THREE.Color('#397c68'), pale = new THREE.Color('#9cc7b3'), warm = new THREE.Color('#b77259')
  for (let iy = 0; iy <= rows; iy++) {
    const v = iy / rows, phi = Math.PI * v, ny = Math.cos(phi), ring = Math.pow(Math.sin(phi), .82)
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols, theta = u * Math.PI * 2
      const front = Math.max(0, Math.sin(theta))
      const shoulder = 1 + .16 * Math.max(0, ny)
      const taper = 1 - .54 * Math.pow(Math.max(0, -ny), 1.12)
      const asym = Math.cos(theta) < 0 ? 1.10 : .94
      const ripple = 1 + .030 * Math.sin(theta * 3.2 + ny * 7.5) + .015 * Math.sin(theta * 8.1 - ny * 11)
      let x = Math.cos(theta) * ring * .82 * shoulder * taper * asym * ripple
      let z = Math.sin(theta) * ring * .61 * shoulder * taper * ripple
      const cleft = Math.exp(-Math.pow(x / .19, 2) - Math.pow((ny - .72) / .20, 2)) * (.55 + .45 * front)
      let y = ny * .98 - .23 * cleft - .13 * Math.pow(Math.max(0, -ny), 1.4)
      x += .055 * (1 - ny * ny) + .022 * z
      y += .018 * Math.sin(theta * 4 + ny * 9) * ring
      z += .020 * Math.sin(theta * 2.6 - ny * 6) * ring
      positions.push(x, y, z)
      const band = .5 + .5 * Math.sin(theta * 3.3 + ny * 6.2)
      const c = deep.clone().lerp(jade, .30 + .35 * band).lerp(pale, .12 * Math.max(0, Math.cos(theta - .3)) * ring).lerp(warm, .18 * Math.max(0, -Math.cos(theta + .5)) * ring)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = cols + 1
  for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < cols; ix++) {
    const a = iy * row + ix, b = a + 1, c = a + row, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function orbVein(index: number) {
  const side = index % 2 ? -1 : 1
  const points = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33
    return new THREE.Vector3(side * (.05 + t * .39 + .06 * Math.sin(t * Math.PI * 2 + index)), .57 - t * 1.04 + .04 * Math.sin(t * 7 + index), .38 + .04 * Math.sin(t * 5 + index))
  })
  return tube(points, .0068 + index * .00025, 7)
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
  const geometry = useMemo(livingMantleGeometry, [])
  const veins = useMemo(() => Array.from({ length: 8 }, (_, i) => orbVein(i)), [])
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
    <mesh geometry={geometry} position={[0, -.12, 0]} scale={[.70, .78, .72]} castShadow><meshPhysicalMaterial vertexColors roughness={.58} clearcoat={.04} clearcoatRoughness={.86} sheen={.14} sheenColor="#6c9d89" emissive="#102f28" emissiveIntensity={.12}/></mesh>
    <mesh position={[-.05, -.10, .03]} scale={[.19, .27, .15]}><sphereGeometry args={[1, 28, 18]}/><meshPhysicalMaterial color="#d58a6f" emissive="#8e4738" emissiveIntensity={.72} roughness={.48}/></mesh>
    <group position={[0, -.12, 0]} scale={[.70, .78, .72]} name="home-v225-v2-orb-embedded-memory-veins">{veins.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color={warning ? '#d67161' : i % 2 ? '#8fc8af' : '#c58c73'} emissive={warning ? '#85342d' : i % 2 ? '#346e5b' : '#774836'} emissiveIntensity={.50} roughness={.60}/></mesh>)}</group>
    <mesh position={[0, -.12, 0]} scale={[.78, .88, .68]} onClick={activate}><sphereGeometry args={[1, 24, 18]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.02, -.03, .32]} color={warning ? '#d26959' : '#78bea4'} intensity={state === 'dormant' ? .12 : .58} distance={3.4}/>
  </group>
}

function AtmosphericDepth() {
  const field = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 280; i++) {
      const a = i * 2.39996323, r = 2.0 + ((i * 37) % 100) / 100 * 9.6
      pts.push(Math.cos(a) * r, .55 + ((i * 29) % 100) / 100 * 4.5, 3.4 - ((i * 53) % 100) / 100 * 20.4)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return <group name="home-v225-v2-bounded-atmospheric-depth">
    <points geometry={field}><pointsMaterial color="#b6d2c3" size={.015} transparent opacity={.20} depthWrite={false}/></points>
    <pointLight position={[0, 4.1, -12]} color="#739f8d" intensity={.65} distance={15}/>
    <pointLight position={[-3.2, 2.2, -8]} color="#c38761" intensity={.72} distance={9}/>
    <pointLight position={[3.2, 2.6, -9]} color="#879f9b" intensity={.58} distance={9}/>
  </group>
}

export function HomeV225PolishV2({ orbState, reducedMotion, onOrb, onGround, onLifeMap, onWalk }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onWalk: WalkHandler }) {
  return <group name="home-v225-v2-production-memory-sanctuary">
    <RetireRejectedPresentation/>
    <MemoryValley onWalk={onWalk}/>
    <GroundHearth onGround={onGround}/>
    <LifeMapObservatory onLifeMap={onLifeMap}/>
    <LivingMemoryOrb state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <AtmosphericDepth/>
  </group>
}
