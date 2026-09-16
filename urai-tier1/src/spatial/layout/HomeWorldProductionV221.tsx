'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'

const SPAWN = new THREE.Vector3(0, .04, 4.6)
const ORB = new THREE.Vector3(-.5, 1.28, -7.6)
const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
const BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -14.4, maxZ: 6.8 }

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Transition = 'none' | 'ground' | 'life-map'
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Maps = { color: THREE.Texture; normal: THREE.Texture; arm: THREE.Texture }

function useStoneMaps(): Maps {
  const [colorSource, normalSource, armSource] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  return useMemo(() => {
    const prep = (source: THREE.Texture, srgb = false) => {
      const texture = source.clone()
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping
      texture.repeat.set(8, 12)
      texture.anisotropy = 8
      texture.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace
      texture.needsUpdate = true
      return texture
    }
    return { color: prep(colorSource, true), normal: prep(normalSource), arm: prep(armSource) }
  }, [armSource, colorSource, normalSource])
}

function terrainHeight(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((5.8 - z) / 23.8, 0, 1)
  const center = Math.sin((z + 2.2) * .19) * .62
  const lateral = Math.abs(x - center) / 10.2
  const walk = -.28 * Math.exp(-Math.pow((x - center) / 3.8, 4))
  const shelf = Math.pow(lateral, 2.3) * (.12 + depth * 1.5)
  const farRise = Math.pow(depth, 4.1) * 1.12
  const erosion = (Math.sin(x * .58 + z * .37) * .11 + Math.sin(x * 1.31 - z * .62) * .065 + Math.cos(x * 2.4 + z * .21) * .03) * (.35 + lateral * .65)
  return -.7 + walk + shelf + farRise + erosion
}

function SanctuaryFloor({ onWalk }: { onWalk: (event: ThreeEvent<MouseEvent>) => void }) {
  const maps = useStoneMaps()
  const geometry = useMemo(() => {
    const xs = 132
    const zs = 170
    const positions: number[] = []
    const uvs: number[] = []
    const indices: number[] = []
    for (let iz = 0; iz <= zs; iz += 1) {
      const vz = iz / zs
      const z = 6.7 - vz * 25.8
      for (let ix = 0; ix <= xs; ix += 1) {
        const vx = ix / xs
        const x = -10.2 + vx * 20.4
        positions.push(x, terrainHeight(x, z), z)
        uvs.push(vx * 10, vz * 14)
      }
    }
    for (let iz = 0; iz < zs; iz += 1) {
      for (let ix = 0; ix < xs; ix += 1) {
        const a = iz * (xs + 1) + ix
        const b = a + 1
        const c = a + xs + 1
        const d = c + 1
        if ((ix + iz) & 1) indices.push(a, b, d, a, d, c)
        else indices.push(a, b, c, b, d, c)
      }
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    result.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    result.setIndex(indices)
    result.computeVertexNormals()
    return result
  }, [])

  return (
    <mesh name="home-v221-continuous-eroded-sanctuary-floor" geometry={geometry} receiveShadow onClick={onWalk}>
      <meshStandardMaterial
        color="#617463"
        map={maps.color}
        normalMap={maps.normal}
        normalScale={new THREE.Vector2(.38, .38)}
        roughnessMap={maps.arm}
        roughness={.98}
        metalness={.002}
      />
    </mesh>
  )
}

function terracedMassGeometry(seed: number) {
  const around = 80
  const bands = 14
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const dark = new THREE.Color('#30443a')
  const mid = new THREE.Color('#526758')
  const pale = new THREE.Color('#74816d')

  for (let band = 0; band <= bands; band += 1) {
    const v = band / bands
    const stepped = Math.floor(v * 7) / 7
    const y = -1.02 + v * 2.04 + .045 * Math.sin(seed + band * 1.7)
    const taper = 1.18 - stepped * .42 - Math.pow(v, 3.2) * .28
    for (let i = 0; i < around; i += 1) {
      const u = i / around
      const angle = u * Math.PI * 2
      const cutA = .18 * Math.exp(-Math.pow(Math.atan2(Math.sin(angle - seed * .17), Math.cos(angle - seed * .17)) / .42, 2))
      const cutB = .11 * Math.exp(-Math.pow(Math.atan2(Math.sin(angle + 1.9 + seed * .09), Math.cos(angle + 1.9 + seed * .09)) / .28, 2))
      const weather = .11 * Math.sin(angle * 3.1 + seed) + .055 * Math.sin(angle * 7.3 - seed * .6) + .025 * Math.cos(angle * 13.1 + band)
      const radius = Math.max(.22, taper + weather - (cutA + cutB) * Math.sin(Math.PI * v))
      positions.push(Math.cos(angle) * radius, y + .04 * Math.sin(angle * 4.2 + seed) * Math.sin(Math.PI * v), Math.sin(angle) * radius * (.78 + .08 * Math.sin(seed)))
      uvs.push(u * 4, v * 3.6)
      const layer = band % 4
      const color = layer === 0 ? dark.clone().lerp(mid, .28) : layer === 1 ? mid.clone() : layer === 2 ? pale.clone().lerp(mid, .6) : mid.clone().lerp(dark, .36)
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let band = 0; band < bands; band += 1) {
    for (let i = 0; i < around; i += 1) {
      const next = (i + 1) % around
      const a = band * around + i
      const b = band * around + next
      const c = (band + 1) * around + i
      const d = (band + 1) * around + next
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function StrataMass({ name, position, scale, rotation = [0, 0, 0], seed }: {
  name: string
  position: [number, number, number]
  scale: [number, number, number]
  rotation?: [number, number, number]
  seed: number
}) {
  const maps = useStoneMaps()
  const geometry = useMemo(() => terracedMassGeometry(seed), [seed])
  return (
    <mesh name={name} geometry={geometry} position={position} scale={scale} rotation={rotation} castShadow receiveShadow>
      <meshStandardMaterial
        vertexColors
        map={maps.color}
        normalMap={maps.normal}
        normalScale={new THREE.Vector2(.32, .32)}
        roughnessMap={maps.arm}
        roughness={.98}
        metalness={.002}
      />
    </mesh>
  )
}

function GeologicalHistory() {
  return (
    <>
      <StrataMass name="home-v221-port-eroded-terraces" position={[-7.55, -.05, -4.6]} scale={[4.25, 1.0, 3.75]} rotation={[0, -.22, .03]} seed={11} />
      <StrataMass name="home-v221-starboard-eroded-terraces" position={[7.45, -.02, -6.0]} scale={[4.45, 1.06, 3.8]} rotation={[0, .24, -.025]} seed={17} />
      <StrataMass name="home-v221-port-history-rise" position={[-6.5, .36, -13.5]} scale={[5.0, 1.48, 4.0]} rotation={[0, .12, .03]} seed={23} />
      <StrataMass name="home-v221-starboard-history-rise" position={[6.15, .42, -14.2]} scale={[5.25, 1.55, 4.15]} rotation={[0, -.11, -.035]} seed={29} />
      <StrataMass name="home-v221-distant-weathered-shelf" position={[.5, 1.05, -18.6]} scale={[6.4, 1.28, 2.7]} rotation={[0, .03, 0]} seed={37} />
    </>
  )
}

function destinationPatch(kind: 'ground' | 'life-map') {
  const n = 70
  const half = 3.2
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  const primary = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.25, 0, 2.45),
    new THREE.Vector3(.28, .22, 1.3),
    new THREE.Vector3(-.32, .5, .2),
    new THREE.Vector3(.2, .86, -1.05),
    new THREE.Vector3(-.08, 1.22, -2.25),
  ])
  const branch = new THREE.CatmullRomCurve3([
    new THREE.Vector3(.1, .2, .85),
    new THREE.Vector3(.9, .4, .2),
    new THREE.Vector3(1.5, .68, -1.0),
    new THREE.Vector3(1.18, .9, -1.85),
  ])

  const distanceToCurve = (curve: THREE.CatmullRomCurve3, x: number, z: number) => {
    let best = Infinity
    let y = 0
    for (let i = 0; i <= 42; i += 1) {
      const point = curve.getPoint(i / 42)
      const distance = (point.x - x) ** 2 + (point.z - z) ** 2
      if (distance < best) {
        best = distance
        y = point.y
      }
    }
    return { distance: Math.sqrt(best), y }
  }

  for (let iz = 0; iz <= n; iz += 1) {
    const vz = iz / n
    const z = -half + vz * half * 2
    for (let ix = 0; ix <= n; ix += 1) {
      const vx = ix / n
      const x = -half + vx * half * 2
      const radius = Math.sqrt(x * x + z * z) / half
      const fade = Math.max(0, 1 - THREE.MathUtils.smoothstep(radius, .72, 1))
      let y = 0
      if (kind === 'ground') {
        const descent = -.72 * Math.exp(-(Math.pow((x + .18 + z * .15) * .7, 2) + Math.pow((z - .15) * .48, 2)))
        const shelter = .48 * Math.exp(-(Math.pow((x + 1.35) * .72, 2) + Math.pow((z + 1.75) * .7, 2)))
        const rear = .74 * Math.exp(-(Math.pow(x * .48, 2) + Math.pow((z + 2.25) * .8, 2)))
        const channel = -.12 * Math.exp(-Math.pow(x - .35 * z, 2) * 3.2) * Math.exp(-Math.pow(z - .4, 2) * .22)
        y = (descent + shelter + rear + channel + .055 * Math.sin(x * 3 + z * 2.2)) * fade
      } else {
        const a = distanceToCurve(primary, x, z)
        const b = distanceToCurve(branch, x, z)
        const ridge = Math.exp(-a.distance * a.distance * 4.5) * (a.y + .12)
        const fork = Math.exp(-b.distance * b.distance * 4.8) * (b.y * .7 + .08)
        const valley = -.12 * Math.exp(-(x * x * .25 + Math.pow(z - 1.65, 2) * .42))
        y = (ridge + fork + valley + .045 * Math.sin(x * 3.4 - z * 2.1)) * fade
      }
      positions.push(x, y, z)
      uvs.push(vx * 5, vz * 5)
    }
  }

  for (let iz = 0; iz < n; iz += 1) {
    for (let ix = 0; ix < n; ix += 1) {
      const a = iz * (n + 1) + ix
      const b = a + 1
      const c = a + n + 1
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function GroundPlace({ onOpen }: { onOpen: () => void }) {
  const maps = useStoneMaps()
  const geometry = useMemo(() => destinationPatch('ground'), [])
  const base = terrainHeight(GROUND.x, GROUND.z)
  return (
    <group name="home-v221-ground-place" position={[GROUND.x, base + .02, GROUND.z]} onClick={(event) => { event.stopPropagation(); onOpen() }}>
      <mesh name="ground-v221-descending-weathered-place" geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#4d6454" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.42, .42)} roughnessMap={maps.arm} roughness={.98} />
      </mesh>
      <StrataMass name="ground-v221-rooted-shelter" position={[-1.25, -.15, -2.1]} scale={[1.9, .48, 1.45]} rotation={[0, .28, -.04]} seed={47} />
      <pointLight position={[-.55, -.15, -1.1]} color="#d5a16a" intensity={1.55} distance={3.4} decay={2} />
    </group>
  )
}

function LifeMapPlace({ onOpen }: { onOpen: () => void }) {
  const maps = useStoneMaps()
  const geometry = useMemo(() => destinationPatch('life-map'), [])
  const base = terrainHeight(LIFE_MAP.x, LIFE_MAP.z)
  return (
    <group name="home-v221-life-map-place" position={[LIFE_MAP.x, base + .02, LIFE_MAP.z]} onClick={(event) => { event.stopPropagation(); onOpen() }}>
      <mesh name="lifemap-v221-ascending-lineage-place" geometry={geometry} castShadow receiveShadow>
        <meshStandardMaterial color="#526b5c" map={maps.color} normalMap={maps.normal} normalScale={new THREE.Vector2(.4, .4)} roughnessMap={maps.arm} roughness={.97} />
      </mesh>
      <StrataMass name="lifemap-v221-rooted-history-buttress" position={[1.1, .28, -2.05]} scale={[1.55, .58, 1.35]} rotation={[0, -.3, .05]} seed={53} />
      <pointLight position={[-.1, .8, -1.0]} color="#9ed5bc" intensity={1.35} distance={4.0} decay={2} />
      <pointLight position={[1.05, .35, -.4]} color="#c39a66" intensity={.5} distance={2.4} decay={2} />
    </group>
  )
}

function mantleCenter(u: number) {
  const angle = -1.05 + u * Math.PI * 3.65
  const radius = .28 + .1 * Math.sin(angle * 1.65) + .045 * Math.cos(angle * 3.2)
  return new THREE.Vector3(
    Math.cos(angle) * radius * .82 + .08 * Math.sin(u * 5.2),
    (u - .5) * 2.08 + .13 * Math.sin(angle * .72),
    Math.sin(angle) * radius * .66 + .055 * Math.cos(u * 7.1),
  )
}

function foldedMantleGeometry(inner = false) {
  const along = 108
  const across = 22
  const positions: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const dark = new THREE.Color(inner ? '#0d2a25' : '#213c32')
  const moss = new THREE.Color(inner ? '#386552' : '#66896f')
  const warm = new THREE.Color(inner ? '#765b43' : '#b28b62')

  for (let i = 0; i <= along; i += 1) {
    const u = i / along
    const center = mantleCenter(u)
    const angle = -1.05 + u * Math.PI * 3.65
    const radial = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)).normalize()
    const vertical = new THREE.Vector3(0, 1, 0)
    const twist = angle * .34 + Math.sin(u * Math.PI) * .9
    const widthDirection = radial.clone().multiplyScalar(Math.cos(twist)).add(vertical.clone().multiplyScalar(Math.sin(twist))).normalize()
    const breadth = (inner ? .3 : .48) * (.5 + Math.pow(Math.sin(Math.PI * u), .72))
    for (let j = 0; j <= across; j += 1) {
      const v = j / across * 2 - 1
      const edge = 1 - Math.pow(Math.abs(v), 2.7) * .15
      const fold = widthDirection.clone().multiplyScalar(v * breadth * edge)
      const normalPush = radial.clone().multiplyScalar((inner ? .035 : .07) * Math.sin(v * Math.PI) * Math.sin(u * 11.5 + angle * 1.3))
      const point = center.clone().add(fold).add(normalPush)
      point.x += (inner ? .025 : .055) * Math.sin(u * 17 + v * 3.2)
      point.z += (inner ? .02 : .045) * Math.cos(u * 13 - v * 4.1)
      positions.push(point.x, point.y, point.z)
      const band = .5 + .5 * Math.sin(u * 42 + v * 5.5)
      const heat = Math.max(0, Math.sin(u * Math.PI * 2.1 - .4)) * (1 - Math.abs(v))
      const color = dark.clone().lerp(moss, .25 + band * .45).lerp(warm, heat * (inner ? .12 : .24))
      colors.push(color.r, color.g, color.b)
    }
  }

  for (let i = 0; i < along; i += 1) {
    for (let j = 0; j < across; j += 1) {
      const a = i * (across + 1) + j
      const b = a + 1
      const c = (i + 1) * (across + 1) + j
      const d = c + 1
      indices.push(a, b, c, b, d, c)
    }
  }

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function memorySeamCurve(offset = 0) {
  const points: THREE.Vector3[] = []
  for (let i = 5; i <= 103; i += 1) {
    const u = i / 108
    const point = mantleCenter(u)
    point.x += .055 * Math.cos(u * 19 + offset)
    point.z += .05 * Math.sin(u * 17 + offset)
    points.push(point)
  }
  return new THREE.CatmullRomCurve3(points)
}

type Posture = {
  scale: [number, number, number]
  rotation: [number, number, number]
  speed: number
  inner: number
  seam: number
}

const POSTURE: Record<OrbState, Posture> = {
  dormant: { scale: [.78, .72, .84], rotation: [.22, -.42, -.18], speed: .1, inner: -.2, seam: .12 },
  idle: { scale: [1, 1, 1], rotation: [-.08, .24, -.08], speed: .38, inner: .1, seam: .34 },
  attention: { scale: [1.16, 1.05, .82], rotation: [-.22, .48, .18], speed: .7, inner: .48, seam: .62 },
  listening: { scale: [.86, 1.25, .92], rotation: [.28, -.4, -.14], speed: .27, inner: -.5, seam: .42 },
  thinking: { scale: [1.2, .88, 1.08], rotation: [-.34, .72, .24], speed: .22, inner: .82, seam: .48 },
  speaking: { scale: [1.25, 1.02, .76], rotation: [.14, .28, -.28], speed: 1.0, inner: 1.05, seam: .82 },
  guiding: { scale: [.88, 1.32, .86], rotation: [-.38, -.18, .25], speed: .5, inner: -.72, seam: .56 },
  reflecting: { scale: [.88, .96, 1.23], rotation: [.31, .82, -.22], speed: .16, inner: .34, seam: .38 },
  calming: { scale: [1.1, .82, 1.08], rotation: [-.04, -.3, .08], speed: .14, inner: -.25, seam: .28 },
  privacy: { scale: [.72, .86, .72], rotation: [.42, .92, .31], speed: .08, inner: .95, seam: .16 },
  warning: { scale: [1.28, 1.08, .68], rotation: [-.42, -.56, -.31], speed: 1.25, inner: -1.1, seam: .95 },
  transition: { scale: [.82, 1.38, .78], rotation: [-.48, .4, .34], speed: .82, inner: .62, seam: .72 },
}

function OrbPresence({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const groupRef = useRef<THREE.Group>(null)
  const innerRef = useRef<THREE.Mesh>(null)
  const outerGeometry = useMemo(() => foldedMantleGeometry(false), [])
  const innerGeometry = useMemo(() => foldedMantleGeometry(true), [])
  const seamA = useMemo(() => memorySeamCurve(.25), [])
  const seamB = useMemo(() => memorySeamCurve(2.2), [])
  const posture = POSTURE[state]

  useFrame(({ clock }) => {
    const group = groupRef.current
    if (!group) return
    const t = clock.elapsedTime * posture.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .8) * .022
    group.scale.set(posture.scale[0] * breath, posture.scale[1] * breath, posture.scale[2] * breath)
    group.rotation.set(posture.rotation[0], posture.rotation[1] + (reducedMotion ? 0 : Math.sin(t * .9) * .11), posture.rotation[2])
    if (innerRef.current && !reducedMotion) innerRef.current.rotation.y = posture.inner + Math.sin(t * 1.6) * .32
  })

  const warning = state === 'warning'
  return (
    <group ref={groupRef} name="home-v221-connected-folded-memory-mantle" position={ORB} scale={[1.06, 1.06, 1.06]} onClick={(event) => { event.stopPropagation(); onOpen() }}>
      <mesh geometry={outerGeometry} castShadow receiveShadow>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={.92} metalness={.005} flatShading emissive={warning ? '#5c241d' : '#102d26'} emissiveIntensity={warning ? .22 : .06} />
      </mesh>
      <mesh ref={innerRef} geometry={innerGeometry} scale={[.76, .84, .76]} rotation={[.18, posture.inner, -.12]}>
        <meshStandardMaterial vertexColors side={THREE.DoubleSide} roughness={.88} metalness={.004} emissive="#17493a" emissiveIntensity={state === 'dormant' ? .04 : .14} />
      </mesh>
      <mesh>
        <tubeGeometry args={[seamA, 92, .014, 5, false]} />
        <meshBasicMaterial color={warning ? '#d26950' : '#86c5a6'} transparent opacity={posture.seam} toneMapped={false} />
      </mesh>
      <mesh>
        <tubeGeometry args={[seamB, 92, .009, 5, false]} />
        <meshBasicMaterial color="#d1aa77" transparent opacity={posture.seam * .55} toneMapped={false} />
      </mesh>
      <pointLight color={warning ? '#c65a43' : '#78b99b'} intensity={state === 'dormant' ? .18 : .72} distance={3.6} decay={2} />
    </group>
  )
}

function Cadence({ active }: { active: boolean }) {
  const { invalidate, setFrameloop } = useThree()
  useEffect(() => {
    if (!active) {
      setFrameloop('always')
      return
    }
    setFrameloop('demand')
    const id = window.setInterval(invalidate, 280)
    invalidate()
    return () => window.clearInterval(id)
  }, [active, invalidate, setFrameloop])
  return null
}

function Rig({ input, yaw, pitch, target, onNearby, transition, owner }: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  target: MutableRefObject<THREE.Vector3 | null>
  onNearby: (value: Nearby) => void
  transition: Transition
  owner: MutableRefObject<HTMLElement | null>
}) {
  const { camera, size } = useThree()
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const last = useRef<Nearby>(null)
  const frames = useRef(0)

  useEffect(() => {
    camera.position.set(0, 1.58, 4.6)
    camera.lookAt(0, .9, -9.2)
    camera.near = .1
    camera.far = 125
    camera.updateProjectionMatrix()
  }, [camera])

  useFrame((_, delta) => {
    if (transition === 'none') stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: yaw.current, delta, speed: 2.9, acceleration: 9, deceleration: 12, bounds: BOUNDS, arrivalRadius: .32 })
    frames.current += 1
    const shell = owner.current
    if (shell) {
      shell.dataset.homePlayerX = position.current.x.toFixed(3)
      shell.dataset.homePlayerZ = position.current.z.toFixed(3)
      shell.dataset.homeDistance = position.current.distanceTo(SPAWN).toFixed(3)
      shell.dataset.homeDistanceOrb = Math.hypot(position.current.x - ORB.x, position.current.z - ORB.z).toFixed(3)
      shell.dataset.homeDistanceGround = Math.hypot(position.current.x - GROUND.x, position.current.z - GROUND.z).toFixed(3)
      shell.dataset.homeDistanceLifeMap = Math.hypot(position.current.x - LIFE_MAP.x, position.current.z - LIFE_MAP.z).toFixed(3)
      shell.dataset.homeMoving = velocity.current.lengthSq() > .0004 ? 'true' : 'false'
      shell.dataset.homeRenderedFrames = String(frames.current)
    }

    let near: Nearby = null
    let best = Infinity
    for (const [name, point, radius] of [['orb', ORB, 2.35], ['ground', GROUND, 2.65], ['life-map', LIFE_MAP, 2.65]] as const) {
      const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z)
      if (distance < radius && distance < best) {
        near = name
        best = distance
      }
    }

    if (camera instanceof THREE.PerspectiveCamera) {
      const fov = size.height > size.width ? 47 : 41
      if (Math.abs(camera.fov - fov) > .01) {
        camera.fov = fov
        camera.updateProjectionMatrix()
      }
    }

    camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * (near ? 1.35 : .08), 1.56, Math.cos(yaw.current) * (near ? 1.35 : .08))), 1 - Math.pow(.0008, delta))
    camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 10, 1.15 + pitch.current * .38, -Math.cos(yaw.current) * 10)))
    if (near !== last.current) {
      last.current = near
      onNearby(near)
    }
  })

  return null
}

function Scene(props: {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  target: MutableRefObject<THREE.Vector3 | null>
  onNearby: (value: Nearby) => void
  transition: Transition
  reducedMotion: boolean
  orbState: OrbState
  onOrb: () => void
  onGround: () => void
  onLifeMap: () => void
  onReady: () => void
  owner: MutableRefObject<HTMLElement | null>
}) {
  const walk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    props.target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    )
  }
  useEffect(() => props.onReady(), [props])

  return (
    <>
      <Cadence active={props.reducedMotion} />
      <color attach="background" args={['#0a2022']} />
      <fogExp2 attach="fog" args={['#315348', .014]} />
      <ambientLight intensity={.78} color="#d6dfd8" />
      <hemisphereLight args={['#d7e5dc', '#44372a', .96]} />
      <directionalLight position={[-7, 10, 5]} intensity={2.05} color="#f0d6a6" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[8, 7, -10]} intensity={.72} color="#8db7a5" />
      <pointLight position={[0, 3.6, 1.2]} color="#d1b27e" intensity={.42} distance={15} decay={2} />
      <SanctuaryFloor onWalk={walk} />
      <GeologicalHistory />
      <GroundPlace onOpen={props.onGround} />
      <LifeMapPlace onOpen={props.onLifeMap} />
      <OrbPresence state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
      <Rig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} onNearby={props.onNearby} transition={props.transition} owner={props.owner} />
    </>
  )
}

export function HomeWorldProductionV221({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<Transition>('none')
  const yaw = useRef(0)
  const pitch = useRef(.06)
  const target = useRef<THREE.Vector3 | null>(null)
  const worldRef = useRef<HTMLElement>(null)
  const markReady = useCallback(() => setSceneReady(true), [])

  const openOrb = useCallback(() => {
    if (transition === 'none') {
      setOrbState('attention')
      onOrbOpen()
    }
  }, [onOrbOpen, transition])
  const openGround = useCallback(() => {
    if (transition === 'none') {
      target.current = null
      setOrbState('transition')
      setTransition('ground')
    }
  }, [transition])
  const openLifeMap = useCallback(() => {
    if (transition === 'none') {
      target.current = null
      setOrbState('transition')
      setTransition('life-map')
    }
  }, [transition])
  const interact = useCallback(() => {
    if (nearby === 'orb') openOrb()
    else if (nearby === 'ground') openGround()
    else if (nearby === 'life-map') openLifeMap()
  }, [nearby, openGround, openLifeMap, openOrb])

  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = 0; pitch.current = .06 } })
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: .003, minPitch: -.46, maxPitch: .5, onDragState: setDragging })

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply = () => { setReducedMotion(reduced.matches); setMobile(coarse.matches) }
    apply()
    reduced.addEventListener?.('change', apply)
    coarse.addEventListener?.('change', apply)
    return () => { reduced.removeEventListener?.('change', apply); coarse.removeEventListener?.('change', apply) }
  }, [])

  useEffect(() => {
    const listener = (event: CustomEvent<OrbStateEventDetail>) => {
      if (transition === 'none') setOrbState(event.detail.state)
    }
    window.addEventListener(URAI_ORB_STATE_EVENT, listener)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener)
  }, [transition])

  useEffect(() => {
    if (transition === 'none') return
    const id = window.setTimeout(() => {
      if (transition === 'ground') requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
      else requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
    }, reducedMotion ? 720 : 1800)
    return () => window.clearTimeout(id)
  }, [reducedMotion, transition])

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && transition !== 'none') {
        event.preventDefault()
        setTransition('none')
        setOrbState('idle')
      }
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [transition])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const context = transition === 'life-map'
    ? 'Ascending into your Life Map'
    : transition === 'ground'
      ? 'Descending into Ground'
      : nearby === 'orb'
        ? 'The Orb is here'
        : nearby === 'ground'
          ? 'The path descends'
          : nearby === 'life-map'
            ? 'The path rises into your Life Map'
            : null

  return (
    <main
      ref={worldRef}
      className={`${styles.world} urai-asset-home-world`}
      data-urai-home-production
      data-urai-true-3d="true"
      data-home-primary-owner="asset-driven"
      data-home-visible-world="v221-authored-inhabited-memory-sanctuary"
      data-home-world-character="production-cinematic-sacred-tech"
      data-home-physical-base="continuous-eroded-geology-layered-strata-traversal"
      data-home-visual-ownership="single-canvas-three-dimensional-geometry"
      data-home-desktop-mobile-world="same-scene"
      data-home-embodied-self="privacy-preserving-first-person"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-assets-ready={ready ? 'true' : 'false'}
      data-home-ready={ready ? 'true' : 'warming'}
      data-home-input-ready={ready ? 'true' : 'false'}
      data-home-interaction-ready={ready ? 'true' : 'false'}
      data-home-player-x="0.000"
      data-home-player-z="4.600"
      data-home-distance="0.000"
      data-home-distance-orb={Math.hypot(SPAWN.x - ORB.x, SPAWN.z - ORB.z).toFixed(3)}
      data-home-distance-ground={Math.hypot(SPAWN.x - GROUND.x, SPAWN.z - GROUND.z).toFixed(3)}
      data-home-distance-life-map={Math.hypot(SPAWN.x - LIFE_MAP.x, SPAWN.z - LIFE_MAP.z).toFixed(3)}
      data-home-moving="false"
      data-home-rendered-frames="0"
      data-home-nearby={nearby ?? 'none'}
      data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-first-person'}
      data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()}
      data-home-portal-sequence={transition === 'none' ? 'idle' : `${transition}:traversal`}
      data-home-portal-lifecycle="environmental-approach-traversal-arrival"
      data-home-input-locked={transition !== 'none' ? 'true' : 'false'}
      data-home-orb-state={orbState}
      data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
      data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
      data-home-visual-grade="v221-literal-pixel-candidate-not-certified"
      data-home-final-art-revision="v221-retained-pixels-pending"
      data-home-live-art-revision="v221-authored-inhabited-memory-sanctuary"
      data-home-art-certification="fresh-exact-head-pixels-required"
      data-home-scanned-composition="v221-low-terraced-geology-rooted-destinations"
      data-home-runtime-assets="rock-tile-floor-diff-1k.webp rock-tile-floor-normal-gl-1k.webp rock-tile-floor-arm-1k.webp"
      data-home-governed-identity-assets="none-mounted-v221-text-native-authority"
      data-home-visible-production-assets="v221-continuous-geology v221-ground-place v221-life-map-place v221-connected-folded-memory-mantle"
      data-home-authored-regions="home-authored-terrain home-mountain-horizon home-sanctuary-pavilion home-life-map-physical-portal"
      data-testid="home-visible-navigable-sanctuary-world"
      style={{ position: 'relative', overflow: 'hidden', backgroundColor: '#0a2022' }}
      {...look}
    >
      <Canvas
        className={styles.canvas}
        dpr={1}
        shadows
        frameloop={reducedMotion ? 'demand' : 'always'}
        camera={{ position: [0, 1.58, 4.6], fov: 42, near: .1, far: 125 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.55
          gl.shadowMap.type = THREE.PCFSoftShadowMap
          gl.setClearColor(0x0a2022, 1)
          setCanvasReady(true)
        }}
      >
        <Scene input={input} yaw={yaw} pitch={pitch} target={target} onNearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markReady} owner={worldRef} />
      </Canvas>
      {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}
      {transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
      <span className="sr-only" data-testid="urai-home-webgl-orb">The connected folded living-memory mantle is integrated into your private sanctuary.</span>
      <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
    </main>
  )
}

export const HomeWorldProduction = HomeWorldProductionV221
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
