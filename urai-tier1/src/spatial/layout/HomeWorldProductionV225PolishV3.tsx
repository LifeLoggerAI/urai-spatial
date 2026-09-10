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
    camera.zoom = size.height > size.width ? .94 : 1
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

function memoryLoop(radius: number, depth: number, phase: number, thickness: number) {
  const points = Array.from({ length: 72 }, (_, index) => {
    const angle = index / 72 * Math.PI * 2
    const contour = radius * (1 + .055 * Math.sin(angle * 3 + phase) + .025 * Math.sin(angle * 7 - phase))
    return new THREE.Vector3(
      Math.cos(angle) * contour,
      Math.sin(angle) * contour * (1 + .04 * Math.cos(angle * 2 - phase)),
      depth * Math.sin(angle * 2 + phase),
    )
  })
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true, 'centripetal', .42), 144, thickness, 10, true)
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
      [-5.45, -4.8, 5.9, .24, -.92], [5.30, -6.1, 6.35, -.21, .96],
      [-5.1, -11.9, 6.8, .16, -1.08], [4.9, -13.1, 7.15, -.13, 1.12],
    ] as const
    return anchors.map(([x, z, h, bend, sweep], index) => {
      const y = height(x, z)
      const trunk = tube([
        new THREE.Vector3(x, y + .02, z),
        new THREE.Vector3(x + bend * .35, y + h * .28, z + sweep * .10),
        new THREE.Vector3(x + bend, y + h * .62, z + sweep * .40),
        new THREE.Vector3(x + bend * 2.0, y + h * .88, z + sweep * .95),
      ], .205 + (index % 3) * .018, 11)
      const crownA = tube([
        new THREE.Vector3(x + bend * 1.1, y + h * .66, z + sweep * .48),
        new THREE.Vector3(x + bend * 2.4 - sweep * .55, y + h * .91, z + sweep * 1.0),
        new THREE.Vector3(x + bend * 2.8 - sweep * 1.35, y + h * .98, z + sweep * 1.42),
      ], .105, 9)
      const crownB = tube([
        new THREE.Vector3(x + bend * 1.25, y + h * .70, z + sweep * .50),
        new THREE.Vector3(x + bend * 1.6 + sweep * .58, y + h * .92, z + sweep * .86),
        new THREE.Vector3(x + bend * 1.2 + sweep * 1.38, y + h * .95, z + sweep * 1.14),
      ], .092, 9)
      const crownC = tube([
        new THREE.Vector3(x + bend * 1.15, y + h * .72, z + sweep * .48),
        new THREE.Vector3(x + bend * 1.75, y + h * .88, z + sweep * .20),
        new THREE.Vector3(x + bend * 2.10, y + h * .94, z - sweep * .46),
      ], .078, 9)
      return { x, z, y, h, sweep, trunk, crownA, crownB, crownC }
    })
  }, [])
  const leaf = useMemo(() => bladeGeometry(2.4), [])
  return <group name="home-v226-rooted-inhabited-canopy">
    {architecture.map((tree, index) => <group key={index}>
      <mesh geometry={tree.trunk} castShadow><meshStandardMaterial color={index % 2 ? '#26372f' : '#2d3a31'} roughness={.97}/></mesh>
      <mesh geometry={tree.crownA} castShadow><meshStandardMaterial color="#31483a" roughness={.96}/></mesh>
      <mesh geometry={tree.crownB} castShadow><meshStandardMaterial color="#334c3d" roughness={.96}/></mesh>
      <mesh geometry={tree.crownC} castShadow><meshStandardMaterial color="#2f493a" roughness={.96}/></mesh>
      {Array.from({ length: 32 }, (_, leafIndex) => {
        const side = leafIndex % 2 ? -1 : 1
        const t = (leafIndex + 1) / 33
        const crown = leafIndex % 3 - 1
        const px = tree.x + tree.sweep * side * (.32 + t * .72) + crown * .26
        const py = tree.y + tree.h * (.72 + .21 * Math.sin(t * Math.PI)) + crown * .10
        const pz = tree.z + tree.sweep * (.42 + t * .82) - crown * tree.sweep * .32
        return <mesh key={leafIndex} geometry={leaf} position={[px, py, pz]} rotation={[-1.18 + t * .34, tree.sweep * .34 + side * .32, side * (.22 + t * .44)]} scale={[.74 + t * .42, .90 + (leafIndex % 4) * .13, 1]} castShadow>
          <meshStandardMaterial color={leafIndex % 3 === 0 ? '#638064' : leafIndex % 3 === 1 ? '#3e604d' : '#526f57'} roughness={.90} side={THREE.DoubleSide}/>
        </mesh>
      })}
    </group>)}
  </group>
}

function HorizonCrown() {
  const leaf = useMemo(() => bladeGeometry(7.1), [])
  const architecture = useMemo(() => [
    { base: new THREE.Vector3(-7.4, -.12, -17.8), crown: new THREE.Vector3(-2.8, 6.5, -17.0), sweep: 1 },
    { base: new THREE.Vector3(7.2, -.08, -18.6), crown: new THREE.Vector3(2.5, 7.2, -17.4), sweep: -1 },
    { base: new THREE.Vector3(-1.4, -.18, -20.2), crown: new THREE.Vector3(.5, 7.8, -19.0), sweep: 1 },
  ].map((tree, index) => {
    const trunk = tube([
      tree.base,
      tree.base.clone().lerp(tree.crown, .34).add(new THREE.Vector3(tree.sweep * .58, 0, .28)),
      tree.base.clone().lerp(tree.crown, .68).add(new THREE.Vector3(-tree.sweep * .42, .2, -.18)),
      tree.crown,
    ], .34 - index * .035, 12)
    const limbs = Array.from({ length: 5 }, (_, limb) => {
      const side = limb % 2 ? -1 : 1
      const reach = 2.0 + limb * .44
      return tube([
        tree.crown.clone().add(new THREE.Vector3(0, -.46 + limb * .12, 0)),
        tree.crown.clone().add(new THREE.Vector3(side * reach * .48, .35 + limb * .18, .14 * limb)),
        tree.crown.clone().add(new THREE.Vector3(side * reach, .15 - limb * .08, .48 + limb * .18)),
      ], .15 - limb * .014, 9)
    })
    return { ...tree, trunk, limbs }
  }), [])
  return <group name="home-v228-deep-braided-horizon-crown">
    {architecture.map((tree, index) => <group key={index}>
      <mesh geometry={tree.trunk} castShadow><meshStandardMaterial color={index === 2 ? '#263b33' : '#21342d'} roughness={.98}/></mesh>
      {tree.limbs.map((geometry, limb) => <group key={limb}>
        <mesh geometry={geometry} castShadow><meshStandardMaterial color={limb % 2 ? '#324a3b' : '#2b4337'} roughness={.96}/></mesh>
        {Array.from({ length: 4 }, (_, leafIndex) => {
          const side = limb % 2 ? -1 : 1
          return <mesh key={leafIndex} geometry={leaf} position={[tree.crown.x + side * (1.15 + limb * .43 + leafIndex * .38), tree.crown.y + .38 - leafIndex * .12 + limb * .09, tree.crown.z + .46 + limb * .18]} rotation={[-1.05,side*.42,side*(.18+leafIndex*.12)]} scale={[1.25 + leafIndex*.14,1.05 + limb*.08,1]} castShadow>
            <meshStandardMaterial color={leafIndex % 2 ? '#506d56' : '#405d4a'} roughness={.92} side={THREE.DoubleSide}/>
          </mesh>
        })}
      </group>)}
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
  const shelters = useMemo(() => Array.from({ length: 4 }, (_, layer) => tube([
    new THREE.Vector3(-1.62 + layer * .09, .02, -.72 - layer * .10),
    new THREE.Vector3(-1.28 + layer * .06, .94 + layer * .08, -1.08 - layer * .12),
    new THREE.Vector3(-.46, 1.54 + layer * .10, -1.36 - layer * .15),
    new THREE.Vector3(.42, 1.48 + layer * .09, -1.32 - layer * .16),
    new THREE.Vector3(1.38 - layer * .06, .78 + layer * .07, -1.00 - layer * .12),
    new THREE.Vector3(1.62 - layer * .09, .04, -.64 - layer * .10),
  ], .105 - layer * .012, 11)), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0, -.08, 0]} name="home-v226-ground-inhabited-hearth" onClick={(event) => { event.stopPropagation(); onGround() }}>
    <mesh geometry={basin} receiveShadow castShadow><meshStandardMaterial vertexColors roughness={.98}/></mesh>
    {shelters.map((geometry, layer) => <mesh key={layer} geometry={geometry} castShadow>
      <meshStandardMaterial color={layer % 2 ? '#4f574a' : '#3c4d43'} roughness={.97}/>
    </mesh>)}
    <mesh position={[0, .18, -1.38]} scale={[1.42, .72, .30]} castShadow receiveShadow><sphereGeometry args={[1, 48, 28, 0, Math.PI * 2, 0, Math.PI * .52]}/><meshStandardMaterial color="#303b34" roughness={.99} side={THREE.DoubleSide}/></mesh>
    <mesh position={[-.16, .035, -.32]} scale={[.44, .055, .34]} castShadow><capsuleGeometry args={[.65, .5, 12, 28]}/><meshStandardMaterial color="#a9684f" emissive="#633326" emissiveIntensity={.45} roughness={.78}/></mesh>
    <mesh position={[-.16, .28, -.34]} scale={[.17, .32, .14]}><sphereGeometry args={[1, 28, 20]}/><meshPhysicalMaterial color="#e3a079" emissive="#b65338" emissiveIntensity={1.35} roughness={.42}/></mesh>
    <pointLight position={[-.16, .70, -.32]} color="#e59a6c" intensity={4.2} distance={6.2}/>
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
  const portalRoots = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const inset = index * .11
    const depth = -.22 - index * .10
    return tube([
      new THREE.Vector3(-1.42 + inset, .02, depth + .18),
      new THREE.Vector3(-1.05 + inset*.4, 1.12 + index*.045, depth),
      new THREE.Vector3(-.26, 2.30 + index*.055, depth - .12),
      new THREE.Vector3(.70 - inset*.25, 2.08 + index*.035, depth - .08),
      new THREE.Vector3(1.38 - inset, .03, depth + .22),
    ], .095 - index*.009, 9)
  }), [])
  const threads = useMemo(() => Array.from({ length: 11 }, (_, index) => {
    const a = index * .67 - 1.1
    const end = new THREE.Vector3(Math.cos(a) * (.28 + index * .025), Math.sin(a * 1.5) * .22, -.12 - Math.sin(a) * .12)
    return tube([new THREE.Vector3(0, 0, 0), end.clone().multiplyScalar(.48).add(new THREE.Vector3(0, .08, -.02)), end], .005, 6)
  }), [])
  const stars = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 420; index++) {
      const arm = index % 5, t = index / 420, angle = t * Math.PI * 11 + arm * 1.256
      const radius = .08 + Math.pow(t, .66) * 1.02
      positions.push(Math.cos(angle) * radius, Math.sin(angle) * radius * .62, .04 * Math.sin(index * .37))
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return geometry
  }, [])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} rotation={[0, .08, 0]} name="home-v226-life-map-lineage-observatory" onClick={(event) => { event.stopPropagation(); onLifeMap() }}>
    <group name="home-v228-life-map-rooted-branching-threshold">
      {portalRoots.map((geometry,index)=><mesh key={index} geometry={geometry} castShadow><meshStandardMaterial color={index%2?'#597565':'#675d70'} emissive={index%2?'#233f35':'#382b43'} emissiveIntensity={.28} roughness={.84}/></mesh>)}
    </group>
    <group position={[0, 1.22, -.42]} scale={[.82,.88,.82]} name="home-v226-life-map-contained-memory-field">
      <points geometry={stars} position={[0,0,.04]}><pointsMaterial color="#d5eee5" size={.026} transparent opacity={.88} depthWrite={false} sizeAttenuation/></points>
      {threads.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={index % 2 ? '#91bdae' : '#b9a6c3'} emissive={index % 2 ? '#355d50' : '#55455e'} emissiveIntensity={.52}/></mesh>)}
      <pointLight color="#b8d8cc" intensity={2.2} distance={4.2}/>
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

function presenceBranch(index: number) {
  const side = index % 2 ? -1 : 1
  const angle = -1.1 + index * .31
  return tube(Array.from({ length: 34 }, (_, point) => {
    const t = point / 33
    const reach = .10 + Math.sin(t * Math.PI) * (.34 + (index % 3) * .06)
    return new THREE.Vector3(
      side * (.035 + t * .22) + Math.cos(angle + t * .8) * reach,
      -.40 + t * 1.04 + .08 * Math.sin(t * Math.PI * 2 + index),
      -.04 + Math.sin(angle + t * .8) * reach * .52,
    )
  }), .013 + (index % 3) * .003, 7)
}

type Posture = { s: V3; r: V3; speed: number }
const posture: Record<OrbState, Posture> = {
  dormant:{s:[.92,.90,.91],r:[.03,-.06,-.03],speed:.10},idle:{s:[1,.99,.98],r:[-.03,.05,-.02],speed:.30},attention:{s:[1.035,1.04,.97],r:[-.08,.12,.04],speed:.62},listening:{s:[.98,1.03,.98],r:[.06,-.06,-.03],speed:.22},thinking:{s:[1.02,.99,1.01],r:[-.09,.14,.06],speed:.18},speaking:{s:[1.04,1.03,.97],r:[.03,-.02,-.06],speed:.80},guiding:{s:[.99,1.04,.97],r:[-.10,.02,.07],speed:.42},reflecting:{s:[.99,.98,1.02],r:[.08,.08,-.05],speed:.14},calming:{s:[1.01,.98,.99],r:[-.02,-.04,.02],speed:.12},privacy:{s:[.92,.92,.91],r:[.10,.08,.08],speed:.08},warning:{s:[1.04,1.04,.96],r:[-.11,-.06,-.08],speed:.95},transition:{s:[.96,1.05,.95],r:[-.11,.04,.08],speed:.65},
}

function RootCradle() {
  const y = height(ORB.x, ORB.z)
  const roots = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const angle = -1.42 + index * .46
    const radius = 1.02 + (index % 2) * .22
    const start = new THREE.Vector3(Math.cos(angle) * radius, -.02, Math.sin(angle) * radius)
    const middle = new THREE.Vector3(Math.cos(angle) * .46, .18 + (index % 3) * .05, Math.sin(angle) * .42)
    const end = new THREE.Vector3(Math.cos(angle) * .14, .38, Math.sin(angle) * .12)
    return tube([start, middle, end], .040 + (index % 2) * .009, 9)
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
  const branches = useMemo(() => Array.from({ length: 9 }, (_, index) => presenceBranch(index)), [])
  const roots = useMemo(() => Array.from({ length: 5 }, (_, index) => {
    const side = index % 2 ? -1 : 1
    const x = side * (.10 + index * .035)
    return tube([
      new THREE.Vector3(x, -.28 + index * .015, .02),
      new THREE.Vector3(x * 1.7, -.62, .03 + (index % 3) * .06),
      new THREE.Vector3(side * (.42 + index * .055), -.96 - (index % 2) * .08, .10 + (index % 3) * .12),
    ], .018 + index * .002, 8)
  }), [])
  const pose = posture[state]
  const y = height(ORB.x, ORB.z)
  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime * pose.speed, breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .006
    root.current.scale.set(pose.s[0] * breath * 1.34, pose.s[1] * breath * 1.34, pose.s[2] * breath * 1.34)
    root.current.rotation.set(pose.r[0], pose.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .014), pose.r[2])
  })
  const warning = state === 'warning'
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOrb() }
  return <group ref={root} position={[ORB.x, y + 1.05, ORB.z]} rotation={[0,-.10,-.10]} scale={1.34} name="home-v226-rooted-single-living-memory-presence" onClick={activate}>
    <group name="home-v227-split-asymmetric-memory-bloom">
      <mesh geometry={body} position={[-.18,.05,.01]} rotation={[.08,-.42,.18]} scale={[.38,.76,.38]} castShadow><meshPhysicalMaterial vertexColors roughness={.68} clearcoat={.04} clearcoatRoughness={.86} sheen={.16} sheenColor="#b49a9c" emissive="#2a2024" emissiveIntensity={.12}/></mesh>
      <mesh geometry={body} position={[.20,-.08,.05]} rotation={[-.12,.58,-.24]} scale={[.28,.58,.32]} castShadow><meshPhysicalMaterial vertexColors roughness={.72} clearcoat={.03} clearcoatRoughness={.88} sheen={.14} sheenColor="#96b8a8" emissive="#23312b" emissiveIntensity={.11}/></mesh>
      <mesh geometry={body} position={[.01,.12,-.08]} rotation={[.2,.12,.06]} scale={[.19,.82,.24]} castShadow><meshPhysicalMaterial vertexColors roughness={.64} clearcoat={.04} clearcoatRoughness={.84} sheen={.18} sheenColor="#c3a69b" emissive="#302125" emissiveIntensity={.14}/></mesh>
    </group>
    <group name="home-v227-branching-memory-nervature">{branches.map((geometry,index)=><mesh key={index} geometry={geometry}><meshStandardMaterial color={warning?'#d57467':index%2?'#9bc9b5':'#d19a83'} emissive={warning?'#7d342d':index%2?'#3c7561':'#7d4d3e'} emissiveIntensity={.74} roughness={.58}/></mesh>)}</group>
    <group scale={[.46,.82,.52]}>{veins.map((geometry, index) => <mesh key={index} geometry={geometry}><meshStandardMaterial color={warning ? '#d57467' : index % 2 ? '#9bc9b5' : '#d19a83'} emissive={warning ? '#7d342d' : index % 2 ? '#3c7561' : '#7d4d3e'} emissiveIntensity={.72} roughness={.60}/></mesh>)}</group>
    <group name="home-v226-living-memory-root-tendrils">{roots.map((geometry,index)=><mesh key={index} geometry={geometry} castShadow><meshStandardMaterial color={index%2?'#668b78':'#8b6658'} emissive={index%2?'#294d40':'#59382f'} emissiveIntensity={.32} roughness={.78}/></mesh>)}</group>
    <mesh scale={[.72,1.14,.76]} onClick={activate}><sphereGeometry args={[1,20,16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.08,.04,.34]} color={warning ? '#d36d60' : '#d3a18b'} intensity={state === 'dormant' ? .12 : .72} distance={3.8}/>
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
    <HorizonCrown/>
    <RootedCanopy/>
    <GroundSanctuary onGround={onGround}/>
    <LifeMapSanctuary onLifeMap={onLifeMap}/>
    <RootCradle/>
    <LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <MemoryWisps/>
  </group>
}
