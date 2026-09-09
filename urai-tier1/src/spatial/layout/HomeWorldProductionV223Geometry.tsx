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
export const ORB=new THREE.Vector3(-.45,1.02,-7.45)
export const GROUND = new THREE.Vector3(-4.85, 0, -8.25)
export const LIFE_MAP = new THREE.Vector3(4.85, 0, -8.25)
export const BOUNDS = { minX: -7.5, maxX: 7.5, minZ: -14.4, maxZ: 6.8 }

type PbrMaps = [THREE.Texture, THREE.Texture, THREE.Texture]
type SurfaceRole = 'landscape' | 'ground' | 'life-map' | 'orb'

function maps(): PbrMaps {
  const [c, n, a] = useTexture(T as unknown as string[])
  return useMemo(() => [c, n, a].map((source, index) => {
    const texture = source.clone()
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(3.6, 5.4)
    texture.anisotropy = 8
    texture.colorSpace = index ? THREE.NoColorSpace : THREE.SRGBColorSpace
    texture.needsUpdate = true
    return texture
  }) as PbrMaps, [a, c, n])
}

function ensureAuthoredUv(geometry: THREE.BufferGeometry) {
  const clone = geometry.clone()
  if (clone.getAttribute('uv')) return clone
  const position = clone.getAttribute('position') as THREE.BufferAttribute | undefined
  if (!position) return clone
  clone.computeBoundingBox()
  const box = clone.boundingBox
  if (!box) return clone
  const size = box.getSize(new THREE.Vector3())
  const axes: Array<{ axis: 'x' | 'y' | 'z'; span: number }> = [
    { axis: 'x', span: size.x },
    { axis: 'y', span: size.y },
    { axis: 'z', span: size.z },
  ]
  axes.sort((left, right) => right.span - left.span)
  const [uAxis, vAxis] = axes
  const min = box.min
  const spanU = Math.max(.001, uAxis.span)
  const spanV = Math.max(.001, vAxis.span)
  const uv: number[] = []
  for (let index = 0; index < position.count; index += 1) {
    const point = { x: position.getX(index), y: position.getY(index), z: position.getZ(index) }
    uv.push(((point[uAxis.axis] - min[uAxis.axis]) / spanU) * 3.8, ((point[vAxis.axis] - min[vAxis.axis]) / spanV) * 3.8)
  }
  clone.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  return clone
}

function tuneAuthoredScene(source: THREE.Object3D, role: SurfaceRole, materialMaps?: PbrMaps) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const namedSurface = object.name || object.parent?.name || ''
    const usesStoneMaps = role === 'landscape' && (namedSurface.includes('floor') || namedSurface.includes('weathered-strata'))
    if (usesStoneMaps) object.geometry = ensureAuthoredUv(object.geometry)
    object.castShadow = true
    object.receiveShadow = true
    const originals = Array.isArray(object.material) ? object.material : [object.material]
    const materials = originals.map((material) => {
      const hasColors = Boolean(object.geometry.getAttribute('color'))
      if (role === 'orb') {
        const physical = new THREE.MeshPhysicalMaterial({
          color: '#d4e6dc',
          vertexColors: hasColors,
          roughness: .43,
          metalness: 0,
          clearcoat: .34,
          clearcoatRoughness: .62,
          sheen: .18,
          sheenColor: new THREE.Color('#76b9a3'),
          emissive: new THREE.Color('#174d40'),
          emissiveIntensity: .16,
          envMapIntensity: .82,
        })
        physical.needsUpdate = true
        return physical
      }
      const next = material instanceof THREE.MeshStandardMaterial
        ? material.clone()
        : new THREE.MeshStandardMaterial({ color: '#758075' })
      next.vertexColors = hasColors
      next.metalness = Math.min(next.metalness, .02)
      next.envMapIntensity = role === 'landscape' ? .72 : .82
      if (role === 'ground') {
        next.roughness = .87
        next.color.lerp(new THREE.Color('#6c7e69'), .08)
        next.emissive = new THREE.Color('#14251d')
        next.emissiveIntensity = .035
      } else if (role === 'life-map') {
        next.roughness = .82
        next.color.lerp(new THREE.Color('#6b6680'), .08)
        next.emissive = new THREE.Color('#2d2941')
        next.emissiveIntensity = .055
      } else {
        next.roughness = .92
      }
      if (usesStoneMaps && materialMaps) {
        next.map = materialMaps[0]
        next.normalMap = materialMaps[1]
        next.normalScale = new THREE.Vector2(.34, .34)
        next.roughnessMap = materialMaps[2]
      }
      next.needsUpdate = true
      return next
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
  })
  return root
}

function normalizeAuthoredScene(source: THREE.Object3D, span: number, role: SurfaceRole, materialMaps?: PbrMaps, anchor: 'bottom' | 'center' = 'bottom') {
  const root = tuneAuthoredScene(source, role, materialMaps)
  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const center = box.getCenter(new THREE.Vector3())
  const scale = span / Math.max(size.x, size.y, size.z, .001)
  root.scale.setScalar(scale)
  root.position.set(-center.x * scale, anchor === 'center' ? -center.y * scale : -box.min.y * scale, -center.z * scale)
  return root
}

// Navigation collision mirrors the sculpted V224 floor but is never rendered.
export function height(x: number, z: number) {
  const depth = THREE.MathUtils.clamp((5.8 - z) / 24, 0, 1)
  const lateral = Math.abs(x) / 8.6
  const bowl = .48 * Math.pow(lateral, 2.35) * (.35 + .8 * depth)
  const und = .055 * Math.sin(x * .65 + z * .28) + .035 * Math.sin(x * 1.7 - z * .43) + .018 * Math.cos(x * 3.1 + z * 1.1)
  const meander = -.09 * Math.exp(-Math.pow((x - .35 * Math.sin((z + 4) * .22)) / 1.55, 4))
  const groundBasin = -.20 * Math.exp(-(Math.pow((x + 4.85) / 1.7, 2) + Math.pow((z + 8.25) / 2.1, 2)))
  const mapBasin = -.18 * Math.exp(-(Math.pow((x - 4.85) / 1.7, 2) + Math.pow((z + 8.25) / 2.1, 2)))
  return -.58 + .08 * depth + bowl + und + meander + groundBasin + mapBasin
}

function terrainGeometry() {
  const xs = 80, zs = 96, positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let iz = 0; iz <= zs; iz += 1) {
    const vz = iz / zs
    const z = 5.8 - vz * 24
    for (let ix = 0; ix <= xs; ix += 1) {
      const vx = ix / xs
      const x = -8.6 + vx * 17.2
      positions.push(x, height(x, z), z)
      uvs.push(vx * 5.4, vz * 7.2)
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
  const m = maps()
  const collision = useMemo(terrainGeometry, [])
  const source = useGLTF(AUTHORED_LANDSCAPE).scene
  const landscape = useMemo(() => tuneAuthoredScene(source, 'landscape', m), [m, source])
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
      <meshStandardMaterial normalMap={m[1]} roughnessMap={m[2]} roughness={.98} metalness={0} transparent opacity={0} depthWrite={false} />
    </mesh>
  </group>
}

export function Escarpment({ side }: { side: -1 | 1 }) {
  return <group
    name={side < 0 ? 'home-v223-port-broken-strata' : 'home-v223-starboard-broken-strata'}
    userData={{ visualSource: 'authored-v224-overhanging-strata-and-rooted-memory-ribs', side }}
  />
}

function GroundPlace() {
  const source = useGLTF(AUTHORED_GROUND).scene
  const place = useMemo(() => normalizeAuthoredScene(source, 4.75, 'ground'), [source])
  const y = height(GROUND.x, GROUND.z) - .04
  return <group name="home-v223-ground-sheltered-memory-basin" position={[GROUND.x, y, GROUND.z]} rotation={[0, .14, 0]}>
    <primitive object={place} />
    <pointLight position={[-.55, .55, -.6]} color="#e3a36b" intensity={2.15} distance={5.1} decay={2} />
    <pointLight position={[.9, 1.35, -.95]} color="#9cc4aa" intensity={.72} distance={4.0} decay={2} />
  </group>
}

function LifeMapPlace() {
  const source = useGLTF(AUTHORED_LIFE_MAP).scene
  const place = useMemo(() => normalizeAuthoredScene(source, 4.85, 'life-map'), [source])
  const y = height(LIFE_MAP.x, LIFE_MAP.z) - .04
  return <group name="home-v223-life-map-ascending-memory-terraces" position={[LIFE_MAP.x, y, LIFE_MAP.z]} rotation={[0, -.14, 0]}>
    <primitive object={place} />
    <pointLight position={[-.35, 1.25, -.55]} color="#8fd8bc" intensity={1.65} distance={5.1} decay={2} />
    <pointLight position={[.85, 1.65, -1.0]} color="#b39bd4" intensity={1.08} distance={4.4} decay={2} />
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
  const presence = useMemo(() => normalizeAuthoredScene(source, 2.15, 'orb', undefined, 'center'), [source])
  const collision = useMemo(orbGeometry, [])
  const posture = P[state]
  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.elapsedTime * posture.speed
    const breath = reducedMotion ? 1 : 1 + Math.sin(t * .82) * .018
    group.current.scale.set(posture.s[0] * breath, posture.s[1] * breath, posture.s[2] * breath)
    group.current.rotation.set(posture.r[0], posture.r[1] + (reducedMotion ? 0 : Math.sin(t * .92) * .045), posture.r[2])
  })
  const warning = state === 'warning'
  return <group ref={group} name="home-v223-open-cavity-living-memory-presence" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }}>
    <group position={[0, .38, 0]}>
      <primitive object={presence} />
    </group>
    <mesh name="home-v223-orb-interaction-volume" geometry={collision} position={[0, .38, 0]} scale={[1.5,1.62,1.42]}>
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
    <pointLight position={[.12, .46, .36]} color={warning ? '#d56d54' : '#72d3b2'} intensity={state === 'dormant' ? .30 : 1.35} distance={4.4} decay={2} />
    <pointLight position={[-.55, .82, -.28]} color="#d6a878" intensity={state === 'dormant' ? .10 : .34} distance={2.8} decay={2} />
  </group>
}

useTexture.preload(T as unknown as string[])
useGLTF.preload(AUTHORED_LANDSCAPE)
useGLTF.preload(AUTHORED_GROUND)
useGLTF.preload(AUTHORED_LIFE_MAP)
useGLTF.preload(AUTHORED_ORB)
