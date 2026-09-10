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
  'home-v225-v2-ground-memory-hearth',
  'home-v225-v2-life-map-lineage-observatory',
  'home-v225-v2-intimate-veined-living-memory-orb',
])

function RetireRejectedLayers() {
  const { scene } = useThree()
  useEffect(() => {
    const changed: THREE.Object3D[] = []
    scene.traverse(object => {
      const retired = retiredExact.has(object.name)
        || /^home-v225-rooted-memory-rib-/.test(object.name)
      if (retired && object.visible) {
        object.visible = false
        changed.push(object)
      }
    })
    return () => changed.forEach(object => { object.visible = true })
  }, [scene])
  return null
}

function tube(points: THREE.Vector3[], radius: number, radial = 10) {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, false, 'centripetal', .34), Math.max(64, points.length * 3), radius, radial, false)
}

function sanctuaryArch(side: -1 | 1, index: number) {
  const points = Array.from({ length: 36 }, (_, i) => {
    const t = i / 35
    const z = -3.8 - index * 4.1 - t * 2.3
    const x = side * (5.7 - 2.8 * Math.sin(t * Math.PI) - index * .12)
    const y = height(x * .82, z) + .62 + Math.sin(t * Math.PI) * (2.2 + index * .24)
    return new THREE.Vector3(x, y, z)
  })
  return tube(points, .12 + index * .018, 12)
}

function SanctuaryStructure() {
  const arches = useMemo(() => ([-1, 1] as const).flatMap(side => Array.from({ length: 4 }, (_, i) => ({ side, i, g: sanctuaryArch(side, i) }))), [])
  return <group name="home-v225-v3-integrated-memory-architecture">
    {arches.map(({ side, i, g }) => <mesh key={`${side}-${i}`} geometry={g} castShadow receiveShadow>
      <meshStandardMaterial color={side < 0 ? '#405548' : '#3d5c50'} roughness={.92} emissive={i === 3 ? '#18362e' : '#0d211d'} emissiveIntensity={.10}/>
    </mesh>)}
  </group>
}

function caveShell(layer: number) {
  const nu = 64, nv = 28
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const charcoal = new THREE.Color('#20231f'), stone = new THREE.Color('#585846'), amber = new THREE.Color('#7c5940')
  for (let iu = 0; iu <= nu; iu++) {
    const u = iu / nu
    const theta = THREE.MathUtils.lerp(-1.24, 1.24, u)
    for (let iv = 0; iv <= nv; iv++) {
      const v = iv / nv
      const r = 1.52 - layer * .10 + .07 * Math.sin(u * 11 + layer)
      const x = Math.cos(theta) * r * (.72 + .22 * v)
      const z = Math.sin(theta) * r * (.76 - layer * .02) - .28 * v
      const crown = Math.sin(v * Math.PI)
      const y = .03 + v * (1.48 - layer * .06) + .38 * crown + .055 * Math.sin(u * 9 + v * 8 + layer)
      positions.push(x, y, z)
      const c = charcoal.clone().lerp(stone, .30 + .42 * v).lerp(amber, .12 * crown)
      colors.push(c.r, c.g, c.b)
    }
  }
  const row = nv + 1
  for (let iu = 0; iu < nu; iu++) for (let iv = 0; iv < nv; iv++) {
    const a = iu * row + iv, b = a + 1, c = a + row, d = c + 1
    indices.push(a, c, b, b, c, d)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  g.setIndex(indices)
  g.computeVertexNormals()
  return g
}

function GroundSanctuary({ onGround }: { onGround: () => void }) {
  const y = height(GROUND.x, GROUND.z)
  const shells = useMemo(() => Array.from({ length: 3 }, (_, i) => caveShell(i)), [])
  return <group position={[GROUND.x, y + .02, GROUND.z]} rotation={[0, -.10, 0]} name="home-v225-v3-ground-inhabited-recess" onClick={e => { e.stopPropagation(); onGround() }}>
    {shells.map((g, i) => <mesh key={i} geometry={g} position={[0, i * .035, -i * .20]} castShadow receiveShadow><meshStandardMaterial vertexColors roughness={.95} side={THREE.DoubleSide}/></mesh>)}
    <mesh position={[0, .08, -.28]} scale={[1.22, .13, .82]} receiveShadow><sphereGeometry args={[1, 48, 28]}/><meshStandardMaterial color="#4d4d3f" roughness={.98}/></mesh>
    <mesh position={[-.12, .22, -.30]} scale={[.34, .08, .26]}><sphereGeometry args={[1, 34, 20]}/><meshStandardMaterial color="#bd835c" emissive="#7f3e2d" emissiveIntensity={.60} roughness={.62}/></mesh>
    {Array.from({ length: 6 }, (_, i) => {
      const a = -.98 + i * .39
      return <mesh key={i} position={[Math.cos(a) * .82, .16, Math.sin(a) * .46 - .02]} rotation={[0, -a, 0]} scale={[.20, .075, .35]} castShadow>
        <sphereGeometry args={[1, 24, 16]}/><meshStandardMaterial color={i % 2 ? '#5d6958' : '#6d624d'} roughness={.96}/>
      </mesh>
    })}
    <pointLight position={[-.10, .72, -.18]} color="#d48d61" intensity={3.2} distance={5.2}/>
  </group>
}

function observatoryStone(side: -1 | 1) {
  const points = Array.from({ length: 34 }, (_, i) => {
    const t = i / 33
    return new THREE.Vector3(side * (1.25 - .38 * Math.sin(t * Math.PI)), .08 + t * 2.35, -.18 - t * .58 + .08 * Math.sin(t * 5))
  })
  return tube(points, .11, 10)
}

function constellationLines(index: number) {
  const a = index * .72 + .18
  const r = .42 + (index % 4) * .18
  const end = new THREE.Vector3(Math.cos(a) * r, Math.sin(a * 1.17) * r * .55, Math.sin(a) * r * .30)
  const bend = end.clone().multiplyScalar(.50).add(new THREE.Vector3(0, .12, -.06))
  return { g: tube([new THREE.Vector3(), bend, end], .008, 6), end }
}

function LifeMapSanctuary({ onLifeMap }: { onLifeMap: () => void }) {
  const y = height(LIFE_MAP.x, LIFE_MAP.z)
  const stones = useMemo(() => ([-1, 1] as const).map(side => ({ side, g: observatoryStone(side) })), [])
  const links = useMemo(() => Array.from({ length: 11 }, (_, i) => constellationLines(i)), [])
  return <group position={[LIFE_MAP.x, y + .02, LIFE_MAP.z]} rotation={[0, .10, 0]} name="home-v225-v3-life-map-memory-observatory" onClick={e => { e.stopPropagation(); onLifeMap() }}>
    <mesh position={[0, .05, -.08]} scale={[1.38, .12, .82]} receiveShadow><sphereGeometry args={[1, 46, 24]}/><meshStandardMaterial color="#43574f" roughness={.96}/></mesh>
    {stones.map(({ side, g }) => <mesh key={side} geometry={g} castShadow><meshStandardMaterial color={side < 0 ? '#526a60' : '#4c5f5b'} roughness={.90}/></mesh>)}
    <group position={[0, 1.33, -.44]} name="home-v225-v3-life-map-contained-memory-field">
      <mesh scale={[.12, .12, .12]}><sphereGeometry args={[1, 32, 20]}/><meshStandardMaterial color="#ead5a0" emissive="#b78236" emissiveIntensity={1.4} roughness={.35}/></mesh>
      {links.map(({ g, end }, i) => <group key={i}>
        <mesh geometry={g}><meshStandardMaterial color={i % 3 === 0 ? '#b8a0c8' : '#83b7a5'} emissive={i % 3 === 0 ? '#554263' : '#315e50'} emissiveIntensity={.48} roughness={.68}/></mesh>
        <mesh position={end} scale={[.032 + (i % 2) * .009, .032 + (i % 2) * .009, .032 + (i % 2) * .009]}><sphereGeometry args={[1, 16, 12]}/><meshStandardMaterial color={i % 3 === 0 ? '#c9add4' : i % 2 ? '#a7cfbf' : '#dbc391'} emissive={i % 3 === 0 ? '#665176' : i % 2 ? '#477563' : '#896a35'} emissiveIntensity={.72}/></mesh>
      </group>)}
    </group>
    <pointLight position={[0, 1.45, -.32]} color="#8ec6b1" intensity={1.55} distance={5.2}/>
  </group>
}

function organicOrbGeometry() {
  const rows = 78, cols = 116
  const positions: number[] = [], colors: number[] = [], indices: number[] = []
  const deep = new THREE.Color('#12352e'), jade = new THREE.Color('#457e6a'), warm = new THREE.Color('#a86d58'), pale = new THREE.Color('#8eb8a7')
  for (let iy = 0; iy <= rows; iy++) {
    const v = iy / rows
    const phi = Math.PI * v
    const ny = Math.cos(phi)
    const ring = Math.pow(Math.sin(phi), .88)
    for (let ix = 0; ix <= cols; ix++) {
      const u = ix / cols, theta = u * Math.PI * 2
      const top = Math.max(0, ny), lower = Math.max(0, -ny)
      const lobe = 1 + .15 * top * (Math.cos(theta) < 0 ? 1 : .55)
      const taper = 1 - .58 * Math.pow(lower, 1.18)
      const skin = 1 + .024 * Math.sin(theta * 4.2 + ny * 8) + .011 * Math.sin(theta * 9 - ny * 13)
      let x = Math.cos(theta) * ring * .70 * lobe * taper * skin
      let z = Math.sin(theta) * ring * .58 * lobe * taper * skin
      const cleft = Math.exp(-Math.pow(x / .20, 2) - Math.pow((ny - .70) / .19, 2)) * Math.max(0, Math.sin(theta))
      let y = ny * .94 - .20 * cleft - .10 * Math.pow(lower, 1.35)
      x += .060 * (1 - ny * ny) + .020 * z
      y += .018 * Math.sin(theta * 3 + ny * 8) * ring
      z += .018 * Math.sin(theta * 2 - ny * 5) * ring
      positions.push(x, y, z)
      const band = .5 + .5 * Math.sin(theta * 3.4 + ny * 6.5)
      const c = deep.clone().lerp(jade, .30 + .34 * band).lerp(warm, .13 * Math.max(0, -Math.cos(theta + .4)) * ring).lerp(pale, .08 * Math.max(0, Math.cos(theta - .2)) * ring)
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

function vein(index: number) {
  const side = index % 2 ? -1 : 1
  const points = Array.from({ length: 32 }, (_, i) => {
    const t = i / 31
    return new THREE.Vector3(side * (.05 + t * .31 + .035 * Math.sin(t * 8 + index)), .45 - t * .90 + .03 * Math.sin(t * 7 + index), .42 + .025 * Math.sin(t * 6 + index))
  })
  return tube(points, .0054 + index * .0002, 6)
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

function LivingMemoryPresence({ state, reducedMotion, onOrb }: { state: OrbState; reducedMotion: boolean; onOrb: () => void }) {
  const root = useRef<THREE.Group>(null)
  const body = useMemo(organicOrbGeometry, [])
  const veins = useMemo(() => Array.from({ length: 9 }, (_, i) => vein(i)), [])
  const p = posture[state]
  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.elapsedTime * p.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .78) * .007
    root.current.scale.set(p.s[0] * breath, p.s[1] * breath, p.s[2] * breath)
    root.current.rotation.set(p.r[0], p.r[1] + (reducedMotion ? 0 : Math.sin(t * .70) * .016), p.r[2])
  })
  const warning = state === 'warning'
  const activate = (e: ThreeEvent<MouseEvent>) => { e.stopPropagation(); onOrb() }
  return <group ref={root} position={ORB} name="home-v225-v3-single-living-memory-presence" onClick={activate}>
    <mesh geometry={body} position={[0, .04, 0]} scale={[.74, .82, .72]} castShadow><meshPhysicalMaterial vertexColors roughness={.67} clearcoat={.025} clearcoatRoughness={.90} sheen={.10} sheenColor="#698d80" emissive="#0f2c26" emissiveIntensity={.075}/></mesh>
    <group position={[0, .04, 0]} scale={[.74, .82, .72]}>{veins.map((g, i) => <mesh key={i} geometry={g}><meshStandardMaterial color={warning ? '#c76859' : i % 2 ? '#719d8b' : '#a87862'} emissive={warning ? '#713029' : i % 2 ? '#294f43' : '#614132'} emissiveIntensity={.30} roughness={.70}/></mesh>)}</group>
    <mesh position={[0, .04, 0]} scale={[.78, .88, .70]} onClick={activate}><sphereGeometry args={[1, 20, 16]}/><meshBasicMaterial transparent opacity={0} depthWrite={false}/></mesh>
    <pointLight position={[.05, .12, .30]} color={warning ? '#c96858' : '#6fa991'} intensity={state === 'dormant' ? .08 : .34} distance={2.8}/>
  </group>
}

function MemoryWisps() {
  const geometry = useMemo(() => {
    const pts: number[] = []
    for (let i = 0; i < 180; i++) {
      const a = i * 2.39996323
      const r = 2.5 + ((i * 47) % 100) / 100 * 7.2
      pts.push(Math.cos(a) * r, .70 + ((i * 31) % 100) / 100 * 3.4, 2.6 - ((i * 61) % 100) / 100 * 17.5)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    return g
  }, [])
  return <points geometry={geometry}><pointsMaterial color="#a9c5b8" size={.012} transparent opacity={.16} depthWrite={false}/></points>
}

export function HomeV225PolishV3({ orbState, reducedMotion, onOrb, onGround, onLifeMap, onWalk }: { orbState: OrbState; reducedMotion: boolean; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onWalk: WalkHandler }) {
  return <group name="home-v225-v3-production-living-sanctuary" onClick={onWalk}>
    <RetireRejectedLayers/>
    <SanctuaryStructure/>
    <GroundSanctuary onGround={onGround}/>
    <LifeMapSanctuary onLifeMap={onLifeMap}/>
    <LivingMemoryPresence state={orbState} reducedMotion={reducedMotion} onOrb={onOrb}/>
    <MemoryWisps/>
  </group>
}
