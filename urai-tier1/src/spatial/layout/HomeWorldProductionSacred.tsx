'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, Stars, useAnimations, useGLTF } from '@react-three/drei'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { useSceneStore } from '@/spatial/store/useSceneStore'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const SANCTUARY = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const ORB_MODEL = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'
const PORTAL_MODEL = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const HUMAN = '/assets/urai/generated/human-makehuman-v4/home-human-makehuman-v4.glb'
const FERN_MODEL = '/assets/urai/home-production/cc0/polyhaven-fern-02-geometry-v1.glb'
const SPAWN = new THREE.Vector3(0, 0.04, 8.2)
const ORB = new THREE.Vector3(0, 1.72, -2.55)
const GROUND = new THREE.Vector3(-5.8, 0, -8.8)
const LIFE_MAP = new THREE.Vector3(5.8, 0, -8.8)
const BOUNDS = { minX: -11.5, maxX: 11.5, minZ: -13.5, maxZ: 9.1 }
const DEFAULT_YAW = 0
const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}
const SANCTUARY_REQUIRED_OBJECTS = [
  'home-authored-terrain', 'home-authored-embodied-self', 'home-orb-sanctuary',
  'home-ground-environmental-threshold', 'home-life-map-sky-lookout', 'home-life-map-physical-portal',
  'home-mountain-horizon', 'home-living-vegetation', 'home-sanctuary-pavilion',
] as const

type Nearby = 'orb' | 'ground' | 'life-map' | null
type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Vec3 = readonly [number, number, number]

function seededNoise(x: number, y: number, seed: number) {
  const value = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453
  return value - Math.floor(value)
}

function smoothstep01(value: number) {
  const x = THREE.MathUtils.clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

function terrainHeight(x: number, z: number) {
  const path = Math.exp(-Math.pow((x - Math.sin((z + 2) * 0.12) * 0.42) / 2.45, 2))
  const clearing = Math.exp(-((x * x) / 22 + ((z + 2.55) * (z + 2.55)) / 26))
  const sideRise = smoothstep01((Math.abs(x) - 5.1) / 10.5) * 1.15
  const farRise = smoothstep01((-z - 8.8) / 22) * 0.72
  const broad = Math.sin(x * 0.27 + z * 0.11) * 0.16 + Math.cos(z * 0.21 - x * 0.09) * 0.11
  return -0.22 + sideRise + farRise + broad - path * 0.12 - clearing * 0.19
}

function cloneAuthoredMaterial(material: THREE.Material) {
  const cloned = material.clone()
  if (cloned instanceof THREE.MeshStandardMaterial) {
    cloned.roughness = Math.max(cloned.roughness, 0.52)
    cloned.metalness = Math.min(cloned.metalness, 0.34)
    cloned.envMapIntensity = Math.max(cloned.envMapIntensity, 0.75)
  }
  return cloned
}

function cloneAuthoredModel(source: THREE.Object3D) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material)
      ? object.material.map(cloneAuthoredMaterial)
      : cloneAuthoredMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return clone
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(54, 64, 96, 112)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const moss = new THREE.Color('#405846')
  const warm = new THREE.Color('#857d64')
  const stone = new THREE.Color('#4d5552')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = -position.getY(i) - 5.5
    const height = terrainHeight(x, z) + (seededNoise(i, 4, 91) - 0.5) * 0.055
    position.setZ(i, height)
    const pathDistance = Math.abs(x - Math.sin((z + 2) * 0.12) * 0.42)
    const pathBlend = Math.exp(-pathDistance * pathDistance * 0.34)
    const heightBlend = THREE.MathUtils.clamp((height + 0.25) / 1.55, 0, 1)
    const color = moss.clone().lerp(warm, heightBlend * 0.48).lerp(stone, pathBlend * 0.42)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makePathGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.1, 0, 8.8),
    new THREE.Vector3(-0.35, 0, 5.2),
    new THREE.Vector3(0.2, 0, 1.4),
    new THREE.Vector3(0, 0, -2.7),
    new THREE.Vector3(-0.25, 0, -6.0),
    new THREE.Vector3(0, 0, -10.8),
  ])
  const segments = 72
  const vertices: number[] = []
  const indices: number[] = []
  for (let i = 0; i <= segments; i += 1) {
    const t = i / segments
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t).normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x)
    const width = THREE.MathUtils.lerp(1.5, 1.9, Math.sin(t * Math.PI))
    for (const sign of [-1, 1]) {
      const x = point.x + side.x * width * sign
      const z = point.z + side.z * width * sign
      vertices.push(x, terrainHeight(x, z) + 0.045, z)
    }
    if (i < segments) {
      const a = i * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeOrganicSlab(radius = 2.35, points = 34, seed = 33) {
  const shape = new THREE.Shape()
  for (let i = 0; i < points; i += 1) {
    const angle = (i / points) * Math.PI * 2
    const jitter = 0.86 + seededNoise(i, 7, seed) * 0.24 + Math.sin(angle * 3.1) * 0.035
    const x = Math.cos(angle) * radius * jitter
    const y = Math.sin(angle) * radius * jitter * 0.78
    if (i === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function makeRockGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 28, 20)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const y = position.getY(i)
    const z = position.getZ(i)
    const radial = 0.82 + seededNoise(i, seed, 47) * 0.24 + Math.sin((x + z) * 3.2 + seed) * 0.035
    position.setXYZ(i, x * radial, y * radial * 0.82, z * radial)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

function makeRidgeGeometry(width: number, depth: number, seed: number, amplitude: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, 72, 34)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const valley = new THREE.Color('#23383b')
  const slope = new THREE.Color('#435752')
  const crown = new THREE.Color('#778074')
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i)
    const z = position.getY(i)
    const ridge = Math.max(
      Math.exp(-Math.pow((x + width * 0.29) / (width * 0.13), 2)) * 0.78,
      Math.exp(-Math.pow((x + width * 0.02) / (width * 0.18), 2)),
      Math.exp(-Math.pow((x - width * 0.28) / (width * 0.16), 2)) * 0.72,
    )
    const depthFade = smoothstep01((z + depth * 0.5) / depth)
    const noise = (seededNoise(i, seed, 71) - 0.5) * 0.65
    const height = ridge * amplitude * (0.72 + depthFade * 0.28) + noise
    position.setZ(i, height)
    const blend = THREE.MathUtils.clamp(height / amplitude, 0, 1)
    const color = valley.clone().lerp(slope, blend).lerp(crown, smoothstep01((blend - 0.68) / 0.32))
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeHeartGeometry() {
  const geometry = new THREE.SphereGeometry(1, 64, 44)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const base = new THREE.Color('#25423f')
  const tissue = new THREE.Color('#5f8a7f')
  const history = new THREE.Color('#a27d67')
  for (let i = 0; i < position.count; i += 1) {
    const nx = position.getX(i)
    const ny = position.getY(i)
    const nz = position.getZ(i)
    const upper = THREE.MathUtils.smoothstep(ny, -0.2, 0.9)
    const lower = THREE.MathUtils.smoothstep(-ny, 0.05, 0.98)
    const cleftAxis = (nx + 0.03) * 0.92 + (nz - 0.09) * 0.3
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / 0.025) * upper
    const leftLobe = Math.exp(-(((nx + 0.38) / 0.46) ** 2 + ((nz - 0.1) / 0.62) ** 2)) * upper
    const rightLobe = Math.exp(-(((nx - 0.3) / 0.58) ** 2 + ((nz + 0.08) / 0.64) ** 2)) * upper
    const surface = 1 + 0.04 * Math.sin(Math.atan2(nz, nx) * 4 + ny * 5.4) + 0.2 * leftLobe + 0.08 * rightLobe
    const taper = THREE.MathUtils.lerp(0.24, 1, THREE.MathUtils.smoothstep(ny, -0.94, -0.02))
    let x = nx * surface * 0.7 * taper + ny * 0.14 - 0.1
    let z = nz * surface * 0.7 * taper
    const twist = (ny + 0.06) * 0.42
    const cos = Math.cos(twist)
    const sin = Math.sin(twist)
    const tx = x * cos - z * sin
    const tz = x * sin + z * cos
    x = tx - lower * 0.09
    z = tz
    const y = ny * 1.22 - 0.31 * cleft + 0.15 * leftLobe - lower * (0.18 + lower * 0.16)
    position.setXYZ(i, x, y, z)
    const altitude = THREE.MathUtils.clamp((y + 1.35) / 2.6, 0, 1)
    const remembered = THREE.MathUtils.clamp(cleft + Math.exp(-(((x + 0.06) / 0.22) ** 2 + ((z - 0.55) / 0.2) ** 2)), 0, 1)
    const color = base.clone().lerp(tissue, 0.25 + altitude * 0.42).lerp(history, remembered * 0.4)
    colors.set([color.r, color.g, color.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeScarGeometry() {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.03, 0.78, 0.7),
    new THREE.Vector3(-0.16, 0.55, 0.75),
    new THREE.Vector3(-0.05, 0.3, 0.78),
    new THREE.Vector3(-0.15, 0.06, 0.74),
    new THREE.Vector3(-0.05, -0.2, 0.67),
    new THREE.Vector3(-0.09, -0.48, 0.54),
  ]), 48, 0.022, 7, false)
}

function makeOrbFieldGeometry() {
  const count = 220
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#91d8ca')
  const warm = new THREE.Color('#dfc09a')
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count
    const y = -0.92 + ((i * 31) % count) / (count - 1) * 1.84
    const angle = i * 2.39996323
    const radius = 0.82 + Math.pow(t, 0.62) * 0.38
    positions.set([Math.cos(angle) * radius * 0.82, y, Math.sin(angle) * radius * 0.42], i * 3)
    const color = cool.clone().lerp(warm, 0.14 + 0.48 * ((i % 17) / 16))
    colors.set([color.r, color.g, color.b], i * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const authored = useMemo(() => cloneAuthoredModel(sanctuary.scene), [sanctuary.scene])
  const terrain = useMemo(makeTerrainGeometry, [])
  const path = useMemo(makePathGeometry, [])
  const slab = useMemo(() => makeOrganicSlab(2.7, 42, 61), [])
  useEffect(() => () => { terrain.dispose(); path.dispose() }, [path, terrain])
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ),
    )
  }
  return <group name="home-authored-terrain">
    <mesh name="home-natural-walkable-terrain" geometry={terrain} position={[0, 0, -5.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onWalk}>
      <meshStandardMaterial vertexColors color="#8b9878" roughness={0.98} metalness={0} envMapIntensity={0.7} />
    </mesh>
    <mesh name="home-authored-approach-path" geometry={path} receiveShadow onClick={onWalk}>
      <meshStandardMaterial color="#77756d" roughness={0.9} metalness={0.02} envMapIntensity={0.86} />
    </mesh>
    <mesh position={[0, terrainHeight(0, -2.55) + 0.02, -2.55]} rotation={[Math.PI / 2, 0, 0]} receiveShadow castShadow>
      <extrudeGeometry args={[slab, { depth: 0.12, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 4 }]} />
      <meshStandardMaterial color="#4f514e" roughness={0.82} metalness={0.08} envMapIntensity={1} />
    </mesh>
    <primitive object={authored} />
    <mesh name="home-walkable-navigation-surface" position={[0, 0.42, -2]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[23, 24]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function MountainRange() {
  const far = useMemo(() => makeRidgeGeometry(110, 46, 41, 15), [])
  const middle = useMemo(() => makeRidgeGeometry(88, 38, 19, 10.5), [])
  const near = useMemo(() => makeRidgeGeometry(70, 30, 7, 7.2), [])
  useEffect(() => () => { far.dispose(); middle.dispose(); near.dispose() }, [far, middle, near])
  return <group name="home-distant-natural-horizon">
    <mesh geometry={far} position={[-8, -4.4, -72]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors color="#6e7a72" roughness={1} metalness={0} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={middle} position={[12, -3.5, -54]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors color="#738179" roughness={1} metalness={0} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={near} position={[-10, -2.3, -40]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <meshStandardMaterial vertexColors color="#65736d" roughness={0.98} metalness={0} side={THREE.DoubleSide} />
    </mesh>
  </group>
}

function SkyDome() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    vertexShader: 'varying vec3 v; void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 v; void main(){float h=clamp(v.y*.5+.5,0.,1.);vec3 horizon=vec3(.42,.53,.54);vec3 middle=vec3(.13,.29,.34);vec3 zenith=vec3(.025,.075,.11);vec3 c=mix(horizon,middle,smoothstep(.05,.42,h));c=mix(c,zenith,smoothstep(.42,.96,h));vec3 sun=normalize(vec3(-.58,.25,-.78));float g=pow(max(dot(normalize(v),sun),0.),90.);c+=vec3(.34,.18,.07)*g;gl_FragColor=vec4(c,1.);}`,
  }), [])
  useEffect(() => () => material.dispose(), [material])
  return <mesh name="home-atmospheric-sky" frustumCulled={false} renderOrder={-20}>
    <sphereGeometry args={[175, 48, 32]} />
    <primitive object={material} attach="material" />
  </mesh>
}

function FernGarden({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const plants = useMemo(() => Array.from({ length: 44 }, (_, i) => {
    const angle = i * 2.39996323
    const side = i % 2 === 0 ? -1 : 1
    const radius = 4.2 + seededNoise(i, 5, 17) * 7.1
    const x = side * (4.1 + Math.abs(Math.cos(angle)) * radius)
    const z = 7.2 - (i / 43) * 18.8 + Math.sin(angle) * 1.7
    const object = cloneAuthoredModel(fern.scene)
    object.name = `home-scanned-fern-${i + 1}`
    object.position.set(x, terrainHeight(x, z) + 0.04, z)
    object.rotation.y = angle
    object.rotation.z = (seededNoise(i, 9, 31) - 0.5) * 0.06
    object.scale.setScalar(0.55 + seededNoise(i, 11, 23) * 0.88)
    return object
  }), [fern.scene])
  return <group userData={{ reducedMotion, treatment: 'scanned-natural-sanctuary-garden' }}>{plants.map((plant) => <primitive key={plant.name} object={plant} />)}</group>
}

function RockGarden() {
  const rocks = useMemo(() => [makeRockGeometry(3), makeRockGeometry(7), makeRockGeometry(13)], [])
  useEffect(() => () => rocks.forEach((rock) => rock.dispose()), [rocks])
  const placements: readonly [number, number, number, number, number][] = [
    [-7.5, 4.6, 1.25, 0.72, 0.2], [-6.6, 0.7, 0.9, 0.6, -0.4], [-8.4, -4.1, 1.45, 0.8, 0.6],
    [7.2, 5.3, 1.05, 0.64, -0.3], [6.8, 0.2, 1.2, 0.74, 0.5], [8.2, -5.2, 1.4, 0.78, -0.6],
    [-4.2, -10.4, 0.9, 0.58, 0.2], [4.0, -10.8, 1.0, 0.62, -0.2],
  ]
  return <group name="home-authored-masonry-garden">{placements.map(([x, z, sx, sy, yaw], i) => <mesh key={i} geometry={rocks[i % rocks.length]} position={[x, terrainHeight(x, z) + sy * 0.52, z]} scale={[sx, sy, sx * 0.9]} rotation={[0.05, yaw, -0.04]} castShadow receiveShadow>
    <meshStandardMaterial color={i % 3 === 0 ? '#555d59' : '#444d4a'} roughness={0.96} metalness={0.015} envMapIntensity={0.62} />
  </mesh>)}</group>
}

function FireflyField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 180
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i += 1) {
      const x = (seededNoise(i, 3, 51) - 0.5) * 25
      const z = 8 - seededNoise(i, 7, 71) * 23
      const y = terrainHeight(x, z) + 0.45 + seededNoise(i, 11, 91) * 3.2
      positions.set([x, y, z], i * 3)
    }
    const out = new THREE.BufferGeometry()
    out.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return out
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (ref.current && !reducedMotion) ref.current.rotation.y = Math.sin(clock.elapsedTime * 0.05) * 0.018
  })
  return <points ref={ref} geometry={geometry}>
    <pointsMaterial color="#d6c494" size={0.022} sizeAttenuation transparent opacity={0.42} depthWrite={false} />
  </points>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-18, 11.5, -54]}>
        <mesh><sphereGeometry args={[0.82, 44, 44]} /><meshBasicMaterial color="#f1dfbf" toneMapped={false} /></mesh>
        <mesh position={[0.3, 0.07, 0.2]}><sphereGeometry args={[0.82, 44, 44]} /><meshBasicMaterial color="#16323a" /></mesh>
      </group>
    </group>
    <group name="home-living-vegetation"><FernGarden reducedMotion={reducedMotion} /><RockGarden /></group>
    <FireflyField reducedMotion={reducedMotion} />
  </>
}

function OrbPlatform() {
  const slab = useMemo(() => makeOrganicSlab(1.35, 38, 72), [])
  return <group name="home-sanctuary-pavilion" position={[0, terrainHeight(0, -2.55), -2.55]} userData={{ visualOwner: 'grounded-natural-sanctuary-aaa' }}>
    <mesh position={[0, 0.18, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[slab, { depth: 0.17, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.05, bevelSegments: 4, curveSegments: 4 }]} />
      <meshStandardMaterial color="#545853" roughness={0.8} metalness={0.08} envMapIntensity={1.08} />
    </mesh>
    <mesh position={[0, 0.245, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.78, 0.01, 12, 128]} /><meshStandardMaterial color="#bca472" emissive="#765e35" emissiveIntensity={0.12} metalness={0.28} roughness={0.48} /></mesh>
  </group>
}

function SacredOrb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state, reducedMotion])
  const heart = useMemo(makeHeartGeometry, [])
  const scar = useMemo(makeScarGeometry, [])
  const field = useMemo(makeOrbFieldGeometry, [])
  useEffect(() => {
    const allActions = Object.values(actions).filter((action): action is THREE.AnimationAction => Boolean(action))
    if (reducedMotion) { allActions.forEach((action) => action.stop()); activeAction.current = null; return }
    const next = actions[ORB_CLIPS[state]]
    if (!next) return
    const previous = activeAction.current
    if (previous && previous !== next) previous.fadeOut(0.18)
    next.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.18).play()
    activeAction.current = next
  }, [actions, reducedMotion, state])
  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
    heart.dispose(); scar.dispose(); field.dispose()
  }, [actions, field, heart, scar])
  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = -0.26 + Math.sin(clock.elapsedTime * 0.18) * 0.035
    root.current.rotation.z = -0.08 + Math.sin(clock.elapsedTime * 0.22) * 0.012
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.35) * 0.022
    if (fieldRef.current) fieldRef.current.rotation.y = clock.elapsedTime * 0.024
    if (authoredCore.current) authoredCore.current.scale.setScalar(0.095 + Math.sin(clock.elapsedTime * 0.8) * 0.003)
  })
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, modelClip: ORB_CLIPS[state], runtimeAsset: ORB_MODEL }}>
    <mesh geometry={heart} castShadow receiveShadow>
      <meshStandardMaterial vertexColors color="#55786f" emissive="#244944" emissiveIntensity={state === 'speaking' ? 0.28 : 0.16} roughness={0.76} metalness={0.01} />
    </mesh>
    <mesh geometry={scar}><meshStandardMaterial color="#d6b7a0" emissive="#8d5d4f" emissiveIntensity={0.38} roughness={0.5} metalness={0} /></mesh>
    <group ref={authoredCore} scale={0.095}><primitive object={authoredOrb} /></group>
    <points ref={fieldRef} geometry={field}><pointsMaterial vertexColors size={0.032} sizeAttenuation transparent opacity={0.5} depthWrite={false} /></points>
    <pointLight position={[-0.28, 0.35, 0.76]} color="#e1bc91" intensity={state === 'speaking' ? 1.1 : 0.72} distance={4.2} decay={2} />
    <pointLight position={[0.45, -0.08, 0.42]} color="#78c7ba" intensity={0.5} distance={3.4} decay={2} />
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0, Math.PI, 0]} userData={{ presentation: 'privacy-preserving-first-person-presence' }}>
    <primitive object={model} visible={false} scale={0.72} />
    <mesh position={[0, 0.035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><circleGeometry args={[0.28, 32]} /><meshBasicMaterial color="#0a1110" transparent opacity={0.32} depthWrite={false} /></mesh>
  </group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0, 1.5, 0.1]}>
    <mesh scale={[1.05, 1.38, 1]}><circleGeometry args={[1, 72]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.15} transparent opacity={0.1} transmission={0.52} roughness={0.22} metalness={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <mesh scale={[0.84, 1.15, 1]} position={[0, 0, 0.04]}><circleGeometry args={[1, 72]} /><meshBasicMaterial color={color} transparent opacity={0.055} depthWrite={false} /></mesh>
    <pointLight color={color} intensity={0.7} distance={5.5} decay={2} />
  </group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const color = tone === 'ground' ? '#62c2bf' : '#9189d7'
  const rocks = useMemo(() => [makeRockGeometry(21), makeRockGeometry(27), makeRockGeometry(35)], [])
  useEffect(() => () => rocks.forEach((rock) => rock.dispose()), [rocks])
  const stones = useMemo(() => Array.from({ length: 13 }, (_, i) => {
    const t = i / 12
    const angle = Math.PI * (1 - t)
    return {
      x: Math.cos(angle) * 1.45,
      y: 1.32 + Math.sin(angle) * 1.52,
      rot: (t - 0.5) * 0.42,
      scale: 0.5 + Math.sin(angle) * 0.12,
    }
  }), [])
  return <group userData={{ treatment: 'authored-stone-environmental-threshold' }}>
    {stones.map((stone, i) => <mesh key={i} geometry={rocks[i % rocks.length]} position={[stone.x, stone.y, 0]} scale={[stone.scale, stone.scale * 0.74, stone.scale * 0.68]} rotation={[0.08, stone.rot, 0.12 * Math.sin(i)]} castShadow receiveShadow>
      <meshStandardMaterial color={tone === 'ground' ? '#4a5855' : '#505362'} roughness={0.94} metalness={0.02} envMapIntensity={0.72} />
    </mesh>)}
    <PortalMembrane color={color} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0, -0.08, 0]} userData={{ runtimeAsset: PORTAL_MODEL }}>
    <primitive object={model} visible={false} />
    <DestinationArch tone="life-map" />
    <mesh position={[0, 1.6, 0]} onClick={(event) => { event.stopPropagation(); onActivate() }}><boxGeometry args={[4.5, 4.6, 3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND} rotation={[0, 0.1, 0]}>
      <DestinationArch tone="ground" />
      <mesh position={[0, 1.6, 0]} onClick={(event) => { event.stopPropagation(); onGround() }}><boxGeometry args={[4.5, 4.6, 3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    </group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function MemoryShrines() {
  const positions: readonly [number, number, number, string][] = [
    [-4.1, 2.4, -0.18, '#d3b47d'], [4.0, 1.2, 0.14, '#8cc6c1'], [-4.7, -4.3, 0.12, '#99a8cc'], [4.6, -5.1, -0.1, '#d89b83'],
  ]
  return <group name="home-spatial-memory-artifacts">{positions.map(([x, z, yaw, color], i) => <group key={i} position={[x, terrainHeight(x, z), z]} rotation={[0, yaw, 0]}>
    <mesh position={[0, 0.22, 0]} castShadow receiveShadow><cylinderGeometry args={[0.48, 0.62, 0.44, 32]} /><meshStandardMaterial color="#3f4744" roughness={0.88} metalness={0.04} /></mesh>
    <mesh position={[0, 0.96, 0]} rotation={[0.06, i % 2 ? -0.2 : 0.2, 0]} castShadow><extrudeGeometry args={[makeOrganicSlab(0.5, 20, 90 + i), { depth: 0.08, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.025, bevelSegments: 3 }]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.12} roughness={0.42} metalness={0.06} clearcoat={0.25} /></mesh>
    <pointLight position={[0, 1.1, 0.3]} color={color} intensity={0.24} distance={2.8} decay={2} />
  </group>)}</group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={1.18}>
    <Lightformer form="rect" intensity={5.8} color="#ffe3b4" position={[-7, 12, 8]} scale={[14, 7, 1]} target={[0, 0.8, -4]} />
    <Lightformer form="rect" intensity={2.6} color="#8fc7ce" position={[-13, 6, -10]} scale={[10, 5, 1]} target={[0, 1, -5]} />
    <Lightformer form="rect" intensity={1.8} color="#a19ac7" position={[13, 7, -13]} scale={[9, 4, 1]} target={[0, 1, -5]} />
    <Lightformer form="ring" intensity={1.8} color="#d6b06f" position={[0, 7, -18]} scale={9} target={[0, 1, -5]} />
  </Environment>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby: (value: Nearby) => void; transition: 'none' | 'ground' | 'life-map'; reducedMotion: boolean; onTransitionComplete: () => void }) {
  const { camera, size } = useThree()
  const pos = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const started = useRef<number | null>(null)
  const issued = useRef(false)
  const last = useRef<Nearby>(null)

  useLayoutEffect(() => {
    camera.near = 0.1
    camera.far = 240
    camera.updateProjectionMatrix()
    camera.position.set(0.15, 1.68, 8.35)
    camera.lookAt(0, 1.25, -2.6)
  }, [camera])

  useFrame(({ clock }, delta) => {
    if (transition !== 'none') {
      if (started.current === null) started.current = clock.elapsedTime
      const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6
      const t = THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime - started.current) / duration, 0, 1), 0, 1)
      if (transition === 'life-map') {
        camera.position.lerp(new THREE.Vector3(0, 35, -35), 1 - Math.pow(0.002, delta))
        camera.lookAt(0, 10 + t * 22, -20 - t * 24)
        useSceneStore.getState().setProgress(t)
      } else {
        camera.position.lerp(new THREE.Vector3(-5.8, -2.2, -14.2), 1 - Math.pow(0.002, delta))
        camera.lookAt(-5.8, -1.0, -16)
      }
      if (t >= 1 && !issued.current) { issued.current = true; onTransitionComplete() }
      return
    }

    started.current = null
    issued.current = false
    stepEmbodiedMotion({ delta, input, yaw: yaw.current, position: pos.current, velocity: velocity.current, target, bounds: BOUNDS, speed: 2.65, acceleration: 8, deceleration: 11 })
    if (avatar.current) { avatar.current.position.copy(pos.current); avatar.current.rotation.y = yaw.current + Math.PI }
    const portrait = size.height > size.width
    const backDistance = portrait ? 0.12 : 0.2
    const eyeHeight = portrait ? 1.5 : 1.64
    const desired = pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * backDistance, eyeHeight, Math.cos(yaw.current) * backDistance))
    camera.position.lerp(desired, 1 - Math.pow(0.00065, delta))
    const look = pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 10.5, 1.38 + pitch.current, -Math.cos(yaw.current) * 10.5))
    camera.lookAt(look)
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next: Nearby = null
    let best = Infinity
    for (const [name, point, radius] of candidates) {
      const distance = Math.hypot(pos.current.x - point.x, pos.current.z - point.z)
      if (distance < radius && distance < best) { next = name; best = distance }
    }
    if (next !== last.current) { last.current = next; onNearby(next) }
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const { scene } = useThree()
  const done = useRef(false)
  useEffect(() => {
    let timer: number | undefined
    const check = () => {
      if (done.current) return
      if (SANCTUARY_REQUIRED_OBJECTS.every((name) => scene.getObjectByName(name))) { done.current = true; onReady(); return }
      timer = window.setTimeout(check, 60)
    }
    check()
    return () => { if (timer !== undefined) window.clearTimeout(timer) }
  }, [onReady, scene])
  return null
}

function SacredScene(props: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; nearby: (value: Nearby) => void; orbState: OrbState; reducedMotion: boolean; transition: 'none' | 'ground' | 'life-map'; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onTransitionComplete: () => void; onReady: () => void }) {
  const cosmic = props.transition === 'life-map'
  return <>
    <color attach="background" args={[cosmic ? '#01030a' : '#17353c']} />
    <fogExp2 attach="fog" args={[cosmic ? '#060918' : '#4f6867', cosmic ? 0.0022 : 0.0064]} />
    {!cosmic ? <SkyDome /> : null}
    <Stars radius={190} depth={100} count={cosmic ? 2600 : 120} factor={cosmic ? 3 : 0.5} saturation={0.04} fade speed={props.reducedMotion ? 0 : 0.006} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.48} color="#d9dfd3" />
    <hemisphereLight args={['#bdd7d8', '#29271f', 1.12]} />
    <directionalLight position={[-13, 18, 9]} intensity={3.7} color="#ffe0aa" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} />
    <directionalLight position={[11, 8, -14]} intensity={0.76} color="#86aabd" />
    <spotLight position={[1, 12, 8]} intensity={1.2} color="#f6ead5" distance={42} angle={0.48} penumbra={0.98} decay={2} castShadow />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <MemoryShrines />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0, 0.03, -2.8]} opacity={0.34} scale={22} blur={2.5} far={8} resolution={256} frames={1} color="#141913" />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionSacred({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<'none' | 'ground' | 'life-map'>('none')
  const yaw = useRef(DEFAULT_YAW)
  const pitch = useRef(-0.03)
  const target = useRef<THREE.Vector3 | null>(null)
  const avatar = useRef<THREE.Group | null>(null)
  const markSceneReady = useCallback(() => setSceneReady(true), [])

  const openOrb = useCallback(() => { if (!useSceneStore.getState().inputLocked && transition === 'none') { setOrbState('attention'); onOrbOpen() } }, [onOrbOpen, transition])
  const ground = useCallback(() => { if (transition !== 'none') return; target.current = null; setOrbState('transition'); setTransition('ground') }, [transition])
  const lifeMap = useCallback(() => { if (transition !== 'none') return; target.current = null; setOrbState('transition'); setTransition('life-map'); useSceneStore.getState().enterLifeMap() }, [transition])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') ground(); else if (nearby === 'life-map') lifeMap() }, [nearby, openOrb, ground, lifeMap])
  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = DEFAULT_YAW; pitch.current = -0.03 } })
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: 0.003, minPitch: -0.46, maxPitch: 0.5, onDragState: setDragging })

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery = window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply = () => { setReducedMotion(rm.matches); setMobile(mobileQuery.matches) }
    apply()
    rm.addEventListener?.('change', apply)
    mobileQuery.addEventListener?.('change', apply)
    return () => { rm.removeEventListener?.('change', apply); mobileQuery.removeEventListener?.('change', apply) }
  }, [])

  useEffect(() => {
    const listener = (event: CustomEvent<OrbStateEventDetail>) => { if (transition === 'none') setOrbState(event.detail.state) }
    window.addEventListener(URAI_ORB_STATE_EVENT, listener)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener)
  }, [transition])

  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || transition === 'none') return
      event.preventDefault()
      setTransition('none')
      setOrbState('idle')
      const store = useSceneStore.getState()
      store.setPhase('HOME')
      store.unlock()
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [transition])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const context = transition === 'life-map' ? 'Ascending into your Life Map' : transition === 'ground' ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'Look to the sky' : null
  const complete = () => {
    if (transition === 'ground') requestUraiWorldTravel({ destination:'infrastructure-hub', href:'/ground/', entryPortal:'home-ground', cameraCheckpoint:'home-ground-descent' })
    else if (transition === 'life-map') requestUraiWorldTravel({ destination:'life-map', href:'/life-map/?from=home-sky', entryPortal:'home-sky', cameraCheckpoint:'home-sky-ascent-complete' })
  }

  return <main
    className={`${styles.world} urai-asset-home-world`}
    data-urai-home-production
    data-urai-true-3d="true"
    data-home-primary-owner="asset-driven"
    data-home-visible-world="moonlit-sacred-tech-sanctuary"
    data-home-world-character="premium-cinematic-sacred-tech"
    data-home-physical-base="authored-obsidian-ritual-platform"
    data-home-visual-ownership="three-dimensional-geometry"
    data-home-desktop-mobile-world="same-scene"
    data-home-embodied-self="makehuman-v4"
    data-home-presence-presentation="privacy-preserving-first-person"
    data-home-movement="walk-keyboard-click-touch"
    data-home-audio="production-opus-consent-controlled"
    data-home-visual-grade="cinematic-pbr-aaa-natural-sanctuary"
    data-home-visual-revision="aaa-one-pass-20260912"
    data-home-assets-ready={ready ? 'true' : 'false'}
    data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite"
    data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb generated-continuous-terrain authored-memory-shrines sculpted-stone-thresholds layered-mountain-terrain"
    data-home-nearby={nearby ?? 'none'}
    data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'}
    data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()}
    data-home-input-locked={transition!=='none'?'true':'false'}
    data-home-orb-state={orbState}
    data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation}
    data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]}
    data-testid="home-visible-navigable-sanctuary-world"
    style={{ position: 'relative', overflow: 'hidden', background: '#17353c' }}
    {...look}
  >
    <Canvas className={styles.canvas} dpr={[1, 1.35]} shadows camera={{ position: [0.15, 1.68, 8.35], fov: 43, near: 0.1, far: 240 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => {
      gl.outputColorSpace = THREE.SRGBColorSpace
      gl.toneMapping = THREE.ACESFilmicToneMapping
      gl.toneMappingExposure = 1.22
      gl.shadowMap.type = THREE.PCFSoftShadowMap
      setCanvasReady(true)
    }}>
      <SacredScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onReady={markSceneReady} />
    </Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}
    {transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The living-memory Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate in privacy-preserving first-person presentation.</span>
  </main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)
