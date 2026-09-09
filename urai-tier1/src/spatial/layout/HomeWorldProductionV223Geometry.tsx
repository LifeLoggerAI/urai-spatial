'use client'

import { useMemo, useRef } from 'react'
import { useGLTF, useTexture } from '@react-three/drei'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbState } from '@/app/home/orbStateController'

const AUTHORED_LANDSCAPE = '/assets/urai/home-production/authored-v191/home-continuous-landscape-v191.glb'
const AUTHORED_GROUND = '/assets/urai/home-production/authored-v191/home-ground-place-v191.glb'
const AUTHORED_LIFE_MAP = '/assets/urai/home-production/authored-v191/home-life-map-place-v191.glb'
const AUTHORED_ORB = '/assets/urai/home-production/authored-v191/urai-living-memory-heart-v191.glb'

export const T = [
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp',
  '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp',
] as const

export const SPAWN = new THREE.Vector3(0, .04, 4.6)
export const ORB = new THREE.Vector3(-.45,1.02,-7.45)
export const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
export const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
export const BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -14.4, maxZ: 6.8 }

function maps() {
  const [c, n, a] = useTexture(T as unknown as string[])
  return useMemo(() => [c, n, a].map((source, index) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(3.2, 4.2)
    texture.anisotropy = 8
    texture.colorSpace = index ? THREE.NoColorSpace : THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }), [a, c, n])
}

function tuneAuthoredScene(source: THREE.Object3D, tint?: string, roughness = .94) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.castShadow = true
    object.receiveShadow = true
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((material) => {
      const next = material.clone()
      if (next instanceof THREE.MeshStandardMaterial) {
        next.roughness = Math.max(next.roughness, roughness)
        next.metalness = Math.min(next.metalness, .02)
        next.envMapIntensity = .62
        if (tint) next.color.lerp(new THREE.Color(tint), .09)
      }
      return next
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return root
}

function normalizeAuthoredScene(source: THREE.Object3D, span: number, tint?: string, roughness = .94, anchor: 'bottom' | 'center' = 'bottom') {
  const root = tuneAuthoredScene(source, tint, roughness)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = span / Math.max(size.x, size.y, size.z, .001)
  root.scale.setScalar(scale)
  root.position.set(-center.x * scale, anchor === 'center' ? -center.y * scale : -box.min.y * scale, -center.z * scale)
  return root
}

export function height(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((6.2 - z) / 24.2, 0, 1)
  const lateral = Math.abs(x) / 9.2
  const channel = Math.exp(-Math.pow(x / 3.2, 4))
  const side = Math.pow(lateral, 2.65) * (.55 + depth * 1.95)
  const far = Math.pow(depth, 3.35) * (2.2 + .55 * Math.sin(x * .42 + .8))
  const port = Math.exp(-(Math.pow((x + 5.9) / 2.2, 2) + Math.pow((z + 4.2) / 4.8, 2))) * .88
  const starboard = Math.exp(-(Math.pow((x - 6.1) / 2, 2) + Math.pow((z + 6) / 4.4, 2))) * 1.02
  const deepPort = Math.exp(-(Math.pow((x + 3.8) / 2.7, 2) + Math.pow((z + 13) / 3.2, 2))) * 1.12
  const groundBasin = Math.exp(-(Math.pow((x + 4.9) / 2.05, 2) + Math.pow((z + 8.8) / 2.55, 2))) * 1.22
  const mapBasin = Math.exp(-(Math.pow((x - 4.9) / 2.05, 2) + Math.pow((z + 8.8) / 2.55, 2))) * 1.22
  const strata = (Math.sin(x * .73 + z * .49) * .16 + Math.sin(x * 1.91 - z * 1.27) * .07 + Math.cos(x * 3.17 + z * 2.31) * .035) * (.22 + lateral * .78)
  const cleft = -Math.exp(-Math.pow(x / 2.45, 2)) * (.18 + depth * .18)
  return -.52 + depth * .08 + side + far + port + starboard + deepPort - groundBasin - mapBasin + strata * (1 - channel * .72) + cleft
}

function terrainGeometry() {
  const xs = 88, zs = 108, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let iz = 0; iz <= zs; iz += 1) {
    const vz = iz / zs
    const z = 6.2 - vz * 24.2
    for (let ix = 0; ix <= xs; ix += 1) {
      const vx = ix / xs
      const x = -9.2 + vx * 18.4
      positions.push(x, height(x, z), z)
      uvs.push(vx * 5.5, vz * 7.5)
    }
  }
  for (let iz = 0; iz < zs; iz += 1) for (let ix = 0; ix < xs; ix += 1) {
    const a = iz * (xs + 1) + ix, b = a + 1, c = a + xs + 1, d = c + 1
    ;(ix + iz) & 1 ? indices.push(a, b, d, a, d, c) : indices.push(a, b, c, b, d, c)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

export function Terrain({ walk, onGround, onLifeMap }: { walk: (event: ThreeEvent<MouseEvent>) => void; onGround: () => void; onLifeMap: () => void }) {
  const materialMaps = maps()
  const collision = useMemo(terrainGeometry, [])
  const source = useGLTF(AUTHORED_LANDSCAPE).scene
  const landscape = useMemo(() => tuneAuthoredScene(source, '#52685c', .96), [source])
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    const groundDistance = Math.hypot(event.point.x - GROUND.x, event.point.z - GROUND.z)
    const lifeMapDistance = Math.hypot(event.point.x - LIFE_MAP.x, event.point.z - LIFE_MAP.z)
    if (groundDistance < 2.55) onGround()
    else if (lifeMapDistance < 2.55) onLifeMap()
    else walk(event)
  }
  return <group name="home-v223-weathered-valley-floor" onClick={activate}>
    <primitive object={landscape} />
    <mesh name="home-v223-navigation-collision-surface" geometry={collision} receiveShadow onClick={activate}>
      <meshStandardMaterial normalMap={materialMaps[1]} roughnessMap={materialMaps[2]} roughness={.98} metalness={0} transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>
}

export function Escarpment({ side }: { side: -1 | 1 }) {
  return <group
    name={side < 0 ? 'home-v223-port-broken-strata' : 'home-v223-starboard-broken-strata'}
    userData={{ visualSource: 'authored-v191-landscape-shelves-and-weathered-outcrops', side }}
  />
}

function GroundPlace() {
  const source = useGLTF(AUTHORED_GROUND).scene
  const place = useMemo(() => normalizeAuthoredScene(source, 5.85, '#516f5d', .96), [source])
  const y = height(GROUND.x, GROUND.z) - .16
  return <group name="home-v223-ground-sheltered-memory-basin" position={[GROUND.x, y, GROUND.z]}>
    <primitive object={place} />
    <pointLight position={[-.45, .6, -.55]} color="#d49a61" intensity={1.75} distance={5.3} decay={2} />
    <pointLight position={[1.15, 1.05, -1.55]} color="#8dbaa0" intensity={.55} distance={3.4} decay={2} />
  </group>
}

function LifeMapPlace() {
  const source = useGLTF(AUTHORED_LIFE_MAP).scene
  const place = useMemo(() => normalizeAuthoredScene(source, 5.9, '#54566c', .95), [source])
  const y = height(LIFE_MAP.x, LIFE_MAP.z) - .16
  return <group name="home-v223-life-map-ascending-memory-terraces" position={[LIFE_MAP.x, y, LIFE_MAP.z]}>
    <primitive object={place} />
    <pointLight position={[-.35, 1.2, -.85]} color="#8ecab4" intensity={1.5} distance={5.2} decay={2} />
    <pointLight position={[1.05, 1.55, -1.55]} color="#a790c8" intensity={.9} distance={4.1} decay={2} />
  </group>
}

export function DestinationLights(){return <><GroundPlace/><LifeMapPlace/></>}

function orbVertex(v: THREE.Vector3) {
  const n = v.clone().normalize()
  const theta = Math.atan2(n.z, n.x)
  const phi = Math.acos(THREE.MathUtils.clamp(n.y, -1, 1))
  const fold = 1 + .12 * Math.sin(theta * 3.1 + phi * 2.2) + .055 * Math.cos(theta * 6.2 - phi * 2.8)
  return new THREE.Vector3(n.x * .52 * fold, n.y * .68 * fold, n.z * .46 * fold)
}

function orbGeometry() {
  const geometry = new THREE.IcosahedronGeometry(1, 2).toNonIndexed()
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < position.count; index += 1) {
    const point = orbVertex(new THREE.Vector3(position.getX(index), position.getY(index), position.getZ(index)))
    position.setXYZ(index, point.x, point.y, point.z)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

type Posture = { s: [number, number, number]; r: [number, number, number]; speed: number }
const P: Record<OrbState, Posture> = {
  dormant:{s:[.82,.78,.84],r:[.10,-.12,-.08],speed:.10},
  idle:{s:[1.0,.96,.94],r:[-.08,.08,-.05],speed:.36},
  attention:{s:[1.08,1.02,.90],r:[-.18,.18,.13],speed:.72},
  listening:{s:[.94,1.08,.92],r:[.18,-.12,-.10],speed:.27},
  thinking:{s:[1.08,.94,1.02],r:[-.22,.24,.16],speed:.22},
  speaking:{s:[1.12,1.02,.90],r:[.08,-.04,-.18],speed:1.04},
  guiding:{s:[.94,1.10,.90],r:[-.24,.02,.16],speed:.50},
  reflecting:{s:[.96,.94,1.08],r:[.20,.12,-.14],speed:.16},
  calming:{s:[1.04,.92,.98],r:[-.03,-.06,.05],speed:.14},
  privacy:{s:[.84,.86,.82],r:[.24,.14,.20],speed:.08},
  warning:{s:[1.12,1.02,.86],r:[-.28,-.10,-.22],speed:1.30},
  transition:{s:[.88,1.12,.86],r:[-.30,.08,.22],speed:.86},
}

export function Orb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const group = useRef<THREE.Group>(null)
  const source = useGLTF(AUTHORED_ORB).scene
  const presence = useMemo(() => normalizeAuthoredScene(source, .94, undefined, .91, 'center'), [source])
  const collision = useMemo(orbGeometry, [])
  const posture = P[state]
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime * posture.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .82) * .018
    group.current.scale.set(posture.s[0] * breath, posture.s[1] * breath, posture.s[2] * breath)
    group.current.rotation.set(posture.r[0], posture.r[1] + (reducedMotion ? 0 : Math.sin(t * .92) * .055), posture.r[2])
  })
  const warning = state === 'warning'
  return <group ref={group} name="home-v223-open-cavity-living-memory-presence" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }}>
    <group position={[0, .42, 0]}>
      <primitive object={presence} />
    </group>
    <mesh name="home-v223-orb-interaction-volume" geometry={collision} position={[0, .42, 0]} scale={[.92,1.0,.92]}>
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[0, .48, .28]} color={warning ? '#c76850' : '#73c7a9'} intensity={state === 'dormant' ? .22 : .92} distance={3.4} decay={2} />
  </group>
}

useTexture.preload(T as unknown as string[])
useGLTF.preload(AUTHORED_LANDSCAPE)
useGLTF.preload(AUTHORED_GROUND)
useGLTF.preload(AUTHORED_LIFE_MAP)
useGLTF.preload(AUTHORED_ORB)
