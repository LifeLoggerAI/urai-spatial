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
const SPAWN = new THREE.Vector3(2.35, 0.04, 7.9)
const ORB = new THREE.Vector3(0, 1.62, -2.65)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -10.5, maxX: 10.5, minZ: -12.5, maxZ: 8.5 }
const DEFAULT_YAW = 0.18

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
  const raw = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453
  return raw - Math.floor(raw)
}

function smoothstep01(value: number) {
  const x = THREE.MathUtils.clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

function terrainHeight(x: number, z: number) {
  const pathCenter = Math.sin((z + 1.8) * 0.115) * 0.38
  const path = Math.exp(-Math.pow((x - pathCenter) / 2.2, 2))
  const clearing = Math.exp(-((x * x) / 24 + ((z + 2.65) * (z + 2.65)) / 28))
  const sideRise = smoothstep01((Math.abs(x) - 5.4) / 8.5) * 0.82
  const farRise = smoothstep01((-z - 8.4) / 18) * 0.45
  const broad = Math.sin(x * 0.23 + z * 0.105) * 0.11 + Math.cos(z * 0.18 - x * 0.06) * 0.08
  return -0.18 + sideRise + farRise + broad - path * 0.08 - clearing * 0.11
}

function cloneAuthoredMaterial(material: THREE.Material) {
  const cloned = material.clone()
  if (cloned instanceof THREE.MeshStandardMaterial) {
    cloned.roughness = Math.max(cloned.roughness, 0.55)
    cloned.metalness = Math.min(cloned.metalness, 0.28)
    cloned.envMapIntensity = Math.max(cloned.envMapIntensity, 0.72)
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

function cloneSanctuary(source: THREE.Object3D) {
  const root = cloneAuthoredModel(source)
  root.visible = false
  root.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = false
      object.receiveShadow = false
    }
  })
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-aaa-natural-sanctuary'
  return root
}

function makeTerrainGeometry() {
  const geometry = new THREE.PlaneGeometry(46, 58, 48, 62)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const green = new THREE.Color('#405445')
  const warm = new THREE.Color('#6c6853')
  const stone = new THREE.Color('#656961')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = -position.getY(index) - 4.8
    const height = terrainHeight(x, z) + (seededNoise(index, 5, 81) - 0.5) * 0.035
    position.setZ(index, height)
    const pathCenter = Math.sin((z + 1.8) * 0.115) * 0.38
    const pathBlend = Math.exp(-Math.pow((x - pathCenter) / 2.1, 2))
    const rise = THREE.MathUtils.clamp((height + 0.2) / 1.25, 0, 1)
    const color = green.clone().lerp(warm, rise * 0.46).lerp(stone, pathBlend * 0.2)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makePathGeometry() {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.2, 0, 8.4),
    new THREE.Vector3(1.2, 0, 5.3),
    new THREE.Vector3(0.5, 0, 2.0),
    new THREE.Vector3(0, 0, -2.65),
    new THREE.Vector3(-0.2, 0, -6.0),
    new THREE.Vector3(0, 0, -11.0),
  ])
  const segments = 44
  const vertices: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const point = curve.getPoint(t)
    const tangent = curve.getTangent(t).normalize()
    const side = new THREE.Vector3(-tangent.z, 0, tangent.x)
    const width = 0.72 + Math.sin(t * Math.PI) * 0.24
    for (const sign of [-1, 1]) {
      const x = point.x + side.x * width * sign
      const z = point.z + side.z * width * sign
      vertices.push(x, terrainHeight(x, z) + 0.035, z)
    }
    if (index < segments) {
      const a = index * 2
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeOrganicSlab(radius = 1, points = 22, seed = 17) {
  const shape = new THREE.Shape()
  for (let index = 0; index < points; index += 1) {
    const angle = (index / points) * Math.PI * 2
    const jitter = 0.88 + seededNoise(index, 4, seed) * 0.19
    const x = Math.cos(angle) * radius * jitter
    const y = Math.sin(angle) * radius * jitter * 0.8
    if (index === 0) shape.moveTo(x, y)
    else shape.lineTo(x, y)
  }
  shape.closePath()
  return shape
}

function makeRockGeometry(seed: number) {
  const geometry = new THREE.SphereGeometry(1, 16, 12)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const y = position.getY(index)
    const z = position.getZ(index)
    const radial = 0.86 + seededNoise(index, seed, 41) * 0.18 + Math.sin((x + z) * 2.8 + seed) * 0.025
    position.setXYZ(index, x * radial, y * radial * 0.78, z * radial)
  }
  geometry.computeVertexNormals()
  return geometry
}

function makeRidgeStrip(width: number, height: number, seed: number, segments = 72) {
  const vertices: number[] = []
  const indices: number[] = []
  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments
    const x = (t - 0.5) * width
    const broad = Math.sin(t * Math.PI * (2.4 + seed * 0.01) + seed) * 0.13
    const peaks = Math.max(
      Math.exp(-Math.pow((t - 0.24) / 0.15, 2)) * 0.64,
      Math.exp(-Math.pow((t - 0.51) / 0.19, 2)),
      Math.exp(-Math.pow((t - 0.78) / 0.14, 2)) * 0.72,
    )
    const top = -1.8 + height * (0.24 + peaks * 0.7 + broad) + (seededNoise(index, seed, 29) - 0.5) * 0.12
    vertices.push(x, -6, 0, x, top, 0)
    if (index < segments) {
      const a = index * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function makeHeartGeometry() {
  const geometry = new THREE.SphereGeometry(1, 42, 30)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  const base = new THREE.Color('#2c514b')
  const tissue = new THREE.Color('#6c9587')
  const history = new THREE.Color('#b6886e')
  for (let index = 0; index < position.count; index += 1) {
    const nx = position.getX(index)
    const ny = position.getY(index)
    const nz = position.getZ(index)
    const upper = THREE.MathUtils.smoothstep(ny, -0.2, 0.9)
    const lower = THREE.MathUtils.smoothstep(-ny, 0.03, 0.98)
    const cleftAxis = (nx + 0.02) * 0.92 + (nz - 0.06) * 0.26
    const cleft = Math.exp(-(cleftAxis * cleftAxis) / 0.023) * upper
    const leftLobe = Math.exp(-(((nx + 0.36) / 0.48) ** 2 + ((nz - 0.08) / 0.62) ** 2)) * upper
    const rightLobe = Math.exp(-(((nx - 0.3) / 0.56) ** 2 + ((nz + 0.08) / 0.64) ** 2)) * upper
    const taper = THREE.MathUtils.lerp(0.27, 1, THREE.MathUtils.smoothstep(ny, -0.95, -0.03))
    const surface = 1 + leftLobe * 0.17 + rightLobe * 0.08 + Math.sin(Math.atan2(nz, nx) * 4 + ny * 4.5) * 0.025
    let x = nx * 0.7 * taper * surface + ny * 0.12 - 0.08
    let z = nz * 0.68 * taper * surface
    const twist = (ny + 0.08) * 0.36
    const cos = Math.cos(twist)
    const sin = Math.sin(twist)
    const tx = x * cos - z * sin
    const tz = x * sin + z * cos
    x = tx - lower * 0.08
    z = tz
    const y = ny * 1.18 - cleft * 0.3 + leftLobe * 0.13 - lower * (0.15 + lower * 0.14)
    position.setXYZ(index, x, y, z)
    const scarInfluence = THREE.MathUtils.clamp(cleft + Math.exp(-(((x + 0.03) / 0.2) ** 2 + ((z - 0.52) / 0.2) ** 2)), 0, 1)
    const altitude = THREE.MathUtils.clamp((y + 1.3) / 2.45, 0, 1)
    const color = base.clone().lerp(tissue, 0.28 + altitude * 0.45).lerp(history, scarInfluence * 0.3)
    colors.set([color.r, color.g, color.b], index * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeScarGeometry() {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.04, 0.72, 0.68),
    new THREE.Vector3(-0.14, 0.48, 0.72),
    new THREE.Vector3(-0.04, 0.24, 0.75),
    new THREE.Vector3(-0.13, -0.04, 0.69),
    new THREE.Vector3(-0.05, -0.35, 0.57),
  ]), 30, 0.018, 6, false)
}

function makeOrbFieldGeometry() {
  const count = 110
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const cool = new THREE.Color('#8ad2c3')
  const warm = new THREE.Color('#e0ba91')
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.39996323
    const t = (index + 0.5) / count
    const radius = 0.82 + Math.pow(t, 0.7) * 0.24
    const y = -0.8 + ((index * 23) % count) / (count - 1) * 1.6
    positions.set([Math.cos(angle) * radius * 0.75, y, Math.sin(angle) * radius * 0.36], index * 3)
    const color = cool.clone().lerp(warm, 0.16 + 0.42 * ((index % 13) / 12))
    colors.set([color.r, color.g, color.b], index * 3)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const retainedModel = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const terrain = useMemo(makeTerrainGeometry, [])
  const path = useMemo(makePathGeometry, [])
  const clearing = useMemo(() => makeOrganicSlab(2.15, 28, 61), [])
  useEffect(() => () => { terrain.dispose(); path.dispose() }, [terrain, path])
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
    <primitive object={retainedModel} />
    <mesh name="home-natural-walkable-terrain" geometry={terrain} position={[0, 0, -4.8]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onWalk}>
      <meshStandardMaterial vertexColors color="#819073" roughness={0.97} metalness={0} envMapIntensity={0.72} />
    </mesh>
    <mesh name="home-authored-approach-path" geometry={path} receiveShadow onClick={onWalk}>
      <meshStandardMaterial color="#76776d" roughness={0.86} metalness={0.025} envMapIntensity={0.9} />
    </mesh>
    <mesh position={[0, terrainHeight(0, -2.65) + 0.015, -2.65]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <extrudeGeometry args={[clearing, { depth: 0.08, bevelEnabled: true, bevelSize: 0.04, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 3 }]} />
      <meshStandardMaterial color="#565b55" roughness={0.82} metalness={0.05} envMapIntensity={0.92} />
    </mesh>
    <mesh name="home-walkable-navigation-surface" position={[0, 0.35, -2]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}>
      <planeGeometry args={[22, 23]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={64} frames={1} background={false} environmentIntensity={0.9}>
    <Lightformer form="rect" intensity={4.4} color="#ffe0b0" position={[-7, 11, 8]} scale={[12, 6, 1]} target={[0, 1, -4]} />
    <Lightformer form="rect" intensity={1.8} color="#8ebbc1" position={[10, 6, -12]} scale={[8, 4, 1]} target={[0, 1, -5]} />
  </Environment>
}

function MountainRange() {
  const far = useMemo(() => makeRidgeStrip(110, 13, 31, 84), [])
  const middle = useMemo(() => makeRidgeStrip(88, 9, 17, 72), [])
  const near = useMemo(() => makeRidgeStrip(70, 6.8, 7, 64), [])
  useEffect(() => () => { far.dispose(); middle.dispose(); near.dispose() }, [far, middle, near])
  return <group name="home-distant-natural-horizon">
    <mesh geometry={far} position={[-5, 0, -72]} receiveShadow><meshStandardMaterial color="#273d3e" roughness={1} metalness={0} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={middle} position={[8, -0.6, -54]} receiveShadow><meshStandardMaterial color="#344a47" roughness={1} metalness={0} side={THREE.DoubleSide} /></mesh>
    <mesh geometry={near} position={[-8, -1.0, -40]} receiveShadow><meshStandardMaterial color="#42584f" roughness={0.98} metalness={0} side={THREE.DoubleSide} /></mesh>
  </group>
}

function SkyDome() {
  const material = useMemo(() => new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    toneMapped: false,
    vertexShader: 'varying vec3 v; void main(){v=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: `varying vec3 v; void main(){float h=clamp(v.y*.5+.5,0.,1.);vec3 horizon=vec3(.34,.43,.44);vec3 middle=vec3(.11,.25,.29);vec3 zenith=vec3(.025,.07,.1);vec3 c=mix(horizon,middle,smoothstep(.05,.44,h));c=mix(c,zenith,smoothstep(.44,.96,h));vec3 sun=normalize(vec3(-.58,.24,-.78));float g=pow(max(dot(normalize(v),sun),0.),88.);c+=vec3(.3,.16,.065)*g;gl_FragColor=vec4(c,1.);}`,
  }), [])
  useEffect(() => () => material.dispose(), [material])
  return <mesh name="home-atmospheric-sky" frustumCulled={false} renderOrder={-20}>
    <sphereGeometry args={[170, 32, 20]} />
    <primitive object={material} attach="material" />
  </mesh>
}

const FERN_PLACEMENTS: readonly [number, number, number, number][] = [
  [-4.6,6.1,0.82,0.2],[-3.7,4.6,0.62,1.1],[-4.5,2.3,0.78,-0.5],[-5.4,-0.5,0.7,1.8],[-6.0,-3.8,0.72,-0.8],[-7.0,-8.0,0.56,0.8],[-7.6,-10.2,0.44,2.3],
  [4.8,5.7,0.8,-0.3],[3.7,4.0,0.64,-1.2],[4.7,1.8,0.74,0.7],[5.6,-1.3,0.68,-1.9],[6.1,-4.3,0.76,1.2],[7.0,-8.0,0.54,-0.6],[7.6,-10.2,0.44,1.6],
  [-8.1,3.8,0.68,0.6],[-8.5,-2.4,0.62,-1.1],[8.4,3.1,0.68,-0.5],[8.6,-2.8,0.64,1.0],
]

function FernGarden({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color: '#355446', roughness: 0.98, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#456250', roughness: 0.97, metalness: 0, side: THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color: '#2d473d', roughness: 0.99, metalness: 0, side: THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material) => material.dispose()), [materials])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x, z, scale, yaw], index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x, terrainHeight(x, z) + 0.02, z)
    object.rotation.y = yaw
    object.scale.setScalar(scale)
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = materials[index % materials.length]
      child.castShadow = false
      child.receiveShadow = true
    })
    return object
  }), [fern.scene, materials])
  return <group userData={{ reducedMotion, treatment: 'scanned-natural-sanctuary-garden' }}>{plants.map((plant) => <primitive key={plant.name} object={plant} />)}</group>
}

function RockGarden() {
  const large = useMemo(() => makeRockGeometry(4), [])
  const small = useMemo(() => makeRockGeometry(11), [])
  useEffect(() => () => { large.dispose(); small.dispose() }, [large, small])
  const placements: readonly [number, number, number, number, number][] = [
    [-7.2,4.4,0.82,0.52,0.2],[-7.7,-3.2,0.92,0.56,-0.4],[-7.3,-10.0,0.58,0.4,0.6],
    [7.0,4.7,0.78,0.5,-0.3],[7.8,-3.8,0.9,0.56,0.5],[7.3,-10.0,0.58,0.4,-0.5],
  ]
  return <group name="home-authored-masonry-garden">{placements.map(([x,z,sx,sy,yaw], index) => <mesh key={index} geometry={index % 2 ? small : large} position={[x, terrainHeight(x,z)+sy*0.45, z]} scale={[sx,sy,sx*0.82]} rotation={[0.04,yaw,-0.03]} castShadow receiveShadow>
    <meshStandardMaterial color={index % 2 ? '#4c5650' : '#596159'} roughness={0.96} metalness={0.01} envMapIntensity={0.58} />
  </mesh>)}</group>
}

function FireflyField({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const geometry = useMemo(() => {
    const count = 90
    const positions = new Float32Array(count * 3)
    for (let index = 0; index < count; index += 1) {
      const x = (seededNoise(index,3,51)-0.5)*22
      const z = 7-seededNoise(index,7,71)*21
      const y = terrainHeight(x,z)+0.5+seededNoise(index,11,91)*2.4
      positions.set([x,y,z], index*3)
    }
    const out = new THREE.BufferGeometry()
    out.setAttribute('position', new THREE.BufferAttribute(positions,3))
    return out
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({clock}) => { if (ref.current && !reducedMotion) ref.current.rotation.y = Math.sin(clock.elapsedTime*0.04)*0.012 })
  return <points ref={ref} geometry={geometry}><pointsMaterial color="#d8c391" size={0.018} sizeAttenuation transparent opacity={0.34} depthWrite={false} /></points>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-16,10.7,-48]}>
        <mesh><sphereGeometry args={[0.72,28,28]} /><meshBasicMaterial color="#eadfc8" toneMapped={false} /></mesh>
        <mesh position={[0.27,0.05,0.18]}><sphereGeometry args={[0.72,28,28]} /><meshBasicMaterial color="#163139" /></mesh>
      </group>
    </group>
    <group name="home-living-vegetation"><FernGarden reducedMotion={reducedMotion} /><RockGarden /></group>
    <FireflyField reducedMotion={reducedMotion} />
  </>
}

function OrbPlatform() {
  const slab = useMemo(() => makeOrganicSlab(1.08, 26, 72), [])
  return <group name="home-sanctuary-pavilion" position={[0,terrainHeight(0,-2.65),-2.65]} userData={{ visualOwner: 'grounded-natural-sanctuary-aaa' }}>
    <mesh position={[0,0.16,0]} rotation={[Math.PI/2,0,0]} castShadow receiveShadow>
      <extrudeGeometry args={[slab,{depth:0.12,bevelEnabled:true,bevelSize:0.04,bevelThickness:0.03,bevelSegments:2,curveSegments:3}]} />
      <meshStandardMaterial color="#555a54" roughness={0.78} metalness={0.07} envMapIntensity={0.9} />
    </mesh>
    <mesh position={[0,0.205,0]} rotation={[Math.PI/2,0,0]}><torusGeometry args={[0.69,0.008,8,64]} /><meshStandardMaterial color="#bba16c" emissive="#705a32" emissiveIntensity={0.1} metalness={0.24} roughness={0.5} /></mesh>
  </group>
}

function SacredOrb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const fieldRef = useRef<THREE.Points>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state,reducedMotion])
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
  }, [actions,reducedMotion,state])
  useEffect(() => () => {
    Object.values(actions).forEach((action) => action?.stop())
    heart.dispose(); scar.dispose(); field.dispose()
  }, [actions,heart,scar,field])
  useFrame(({clock}) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = -0.24 + Math.sin(clock.elapsedTime*0.17)*0.028
    root.current.rotation.z = -0.07 + Math.sin(clock.elapsedTime*0.21)*0.01
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime*0.34)*0.018
    if (fieldRef.current) fieldRef.current.rotation.y = clock.elapsedTime*0.02
  })
  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event)=>{event.stopPropagation();onOpen()}} userData={{orbState:state,animation:sensory.animation,modelClip:ORB_CLIPS[state],runtimeAsset:ORB_MODEL}}>
    <primitive object={authoredOrb} visible={false} scale={0.08} />
    <group position={[0,0.12,-0.72]} scale={0.6} userData={{treatment:'living-memory-heart-clearance-framed'}}>
      <mesh geometry={heart} castShadow receiveShadow>
        <meshStandardMaterial vertexColors color="#5f877b" emissive="#244844" emissiveIntensity={state==='speaking'?0.24:0.13} roughness={0.74} metalness={0.01} />
      </mesh>
      <mesh geometry={scar}><meshStandardMaterial color="#d7b79b" emissive="#8c5d4d" emissiveIntensity={0.3} roughness={0.52} metalness={0} /></mesh>
      <points ref={fieldRef} geometry={field}><pointsMaterial vertexColors size={0.034} sizeAttenuation transparent opacity={0.4} depthWrite={false} /></points>
      <pointLight position={[-0.24,0.34,0.68]} color="#ddb68a" intensity={state==='speaking'?0.9:0.58} distance={4.2} decay={2} />
      <pointLight position={[0.42,-0.02,0.35]} color="#75c4b6" intensity={0.38} distance={3.6} decay={2} />
    </group>
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{presentation:'privacy-preserving-first-person-presence'}}>
    <primitive object={model} visible={false} scale={0.72} />
  </group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0,1.08,0.08]}>
    <mesh scale={[0.58,0.78,1]}><circleGeometry args={[1,40]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.14} transparent opacity={0.075} transmission={0.42} roughness={0.3} metalness={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <pointLight color={color} intensity={0.28} distance={3.5} decay={2} />
  </group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const color = tone === 'ground' ? '#62bdb8' : '#8d86cf'
  const stoneColor = tone === 'ground' ? '#465551' : '#4b4f5e'
  return <group position={[0,0,-1.4]} userData={{treatment:'authored-stone-environmental-threshold-clearance-v2'}}>
    <mesh position={[-0.82,0.82,0]} rotation={[0,0,0.035]} castShadow receiveShadow>
      <cylinderGeometry args={[0.14,0.22,1.64,20]} />
      <meshStandardMaterial color={stoneColor} roughness={0.84} metalness={0.06} envMapIntensity={0.86} />
    </mesh>
    <mesh position={[0.82,0.82,0]} rotation={[0,0,-0.035]} castShadow receiveShadow>
      <cylinderGeometry args={[0.14,0.22,1.64,20]} />
      <meshStandardMaterial color={stoneColor} roughness={0.84} metalness={0.06} envMapIntensity={0.86} />
    </mesh>
    <mesh position={[0,1.58,0]} castShadow receiveShadow>
      <torusGeometry args={[0.82,0.12,12,48,Math.PI]} />
      <meshStandardMaterial color={stoneColor} roughness={0.8} metalness={0.08} envMapIntensity={0.92} />
    </mesh>
    <mesh position={[0,1.58,0.035]}>
      <torusGeometry args={[0.81,0.022,8,48,Math.PI]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.72} roughness={0.36} metalness={0.18} />
    </mesh>
    <PortalMembrane color={color} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.08,0]} userData={{runtimeAsset:PORTAL_MODEL}}>
    <primitive object={model} visible={false} />
    <DestinationArch tone="life-map" />
    <mesh position={[0,1.3,0]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[3.2,3.4,2.6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND} rotation={[0,0.1,0]}>
      <DestinationArch tone="ground" />
      <mesh position={[0,1.3,0]} onClick={(event)=>{event.stopPropagation();onGround()}}><boxGeometry args={[3.2,3.4,2.6]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    </group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function MemoryShrines() {
  const placements: readonly [number,number,number,string][] = [
    [-4.0,2.1,-0.14,'#c9a66e'],[4.0,1.1,0.12,'#78aaa5'],[-4.4,-4.6,0.1,'#8793b4'],[4.4,-5.2,-0.08,'#c08370'],
  ]
  return <group name="home-spatial-memory-artifacts">{placements.map(([x,z,yaw,color],index)=><group key={index} position={[x,terrainHeight(x,z),z]} rotation={[0,yaw,0]}>
    <mesh position={[0,0.16,0]} castShadow receiveShadow><cylinderGeometry args={[0.34,0.42,0.3,20]} /><meshStandardMaterial color="#424a45" roughness={0.9} metalness={0.03} /></mesh>
    <mesh position={[0,0.72,0]} castShadow><icosahedronGeometry args={[0.23,1]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.16} roughness={0.42} metalness={0.04} clearcoat={0.18} /></mesh>
    <pointLight position={[0,0.78,0.18]} color={color} intensity={0.14} distance={2.2} decay={2} />
  </group>)}</group>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3|null>; avatar: MutableRefObject<THREE.Group|null>; onNearby:(value:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
  const { camera, size } = useThree()
  const pos = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const started = useRef<number|null>(null)
  const issued = useRef(false)
  const last = useRef<Nearby>(null)

  useLayoutEffect(()=>{
    camera.near = 0.1
    camera.far = 240
    camera.updateProjectionMatrix()
    camera.position.set(2.42,1.72,8.12)
    camera.lookAt(0.42,1.38,-2.9)
  },[camera])

  useFrame(({clock},delta)=>{
    if (transition !== 'none') {
      if (started.current===null) started.current=clock.elapsedTime
      const duration=reducedMotion?0.45:transition==='life-map'?3.4:2.6
      const t=THREE.MathUtils.smootherstep(THREE.MathUtils.clamp((clock.elapsedTime-started.current)/duration,0,1),0,1)
      if (transition==='life-map') {
        camera.position.lerp(new THREE.Vector3(0,34,-34),1-Math.pow(0.002,delta))
        camera.lookAt(0,10+t*22,-20-t*22)
        useSceneStore.getState().setProgress(t)
      } else {
        camera.position.lerp(new THREE.Vector3(-5.2,-2.2,-13.5),1-Math.pow(0.002,delta))
        camera.lookAt(-5.2,-1,-15)
      }
      if(t>=1&&!issued.current){issued.current=true;onTransitionComplete()}
      return
    }

    started.current=null
    issued.current=false
    stepEmbodiedMotion({delta,input,yaw:yaw.current,position:pos.current,velocity:velocity.current,target,bounds:BOUNDS,speed:2.7,acceleration:8,deceleration:11})
    if(avatar.current){avatar.current.position.copy(pos.current);avatar.current.rotation.y=yaw.current+Math.PI}
    const portrait=size.height>size.width
    const backDistance=portrait?0.14:0.24
    const eyeHeight=portrait?1.53:1.66
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.6,1.42+pitch.current,-Math.cos(yaw.current)*9.6))
    camera.lookAt(look)

    const candidates:readonly [Nearby,THREE.Vector3,number][]=[['orb',ORB,2.5],['ground',GROUND,2.8],['life-map',LIFE_MAP,2.8]]
    let next:Nearby=null,best=Infinity
    for(const [name,p,r] of candidates){const d=Math.hypot(pos.current.x-p.x,pos.current.z-p.z);if(d<r&&d<best){next=name;best=d}}
    if(next!==last.current){last.current=next;onNearby(next)}
  })
  return null
}

function SceneReady({ onReady }: { onReady: () => void }) {
  const {scene}=useThree()
  const done=useRef(false)
  useEffect(()=>{
    let timer:number|undefined
    const check=()=>{
      if(done.current)return
      if(SANCTUARY_REQUIRED_OBJECTS.every((name)=>scene.getObjectByName(name))){done.current=true;onReady();return}
      timer=window.setTimeout(check,60)
    }
    check()
    return()=>{if(timer!==undefined)window.clearTimeout(timer)}
  },[onReady,scene])
  return null
}

function SacredScene(props:{input:MovementInput;yaw:MutableRefObject<number>;pitch:MutableRefObject<number>;target:MutableRefObject<THREE.Vector3|null>;avatar:MutableRefObject<THREE.Group|null>;nearby:(value:Nearby)=>void;orbState:OrbState;reducedMotion:boolean;transition:'none'|'ground'|'life-map';onOrb:()=>void;onGround:()=>void;onLifeMap:()=>void;onTransitionComplete:()=>void;onReady:()=>void}){
  const cosmic=props.transition==='life-map'
  return <>
    <color attach="background" args={[cosmic?'#01030a':'#17333a']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#405b5b',cosmic?0.0022:0.008]} />
    {!cosmic?<SkyDome />:null}
    <Stars radius={185} depth={90} count={cosmic?2200:70} factor={cosmic?3:0.45} saturation={0.04} fade speed={props.reducedMotion?0:0.005} />
    <PhysicalEnvironment />
    <ambientLight intensity={0.54} color="#d5ddd2" />
    <hemisphereLight args={['#b9d4d6','#2d2a22',1.05]} />
    <directionalLight position={[-11,16,8]} intensity={3.1} color="#ffe0ad" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-bias={-0.00015} />
    <directionalLight position={[9,7,-12]} intensity={0.62} color="#83a7b7" />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <MemoryShrines />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.02,-2.8]} opacity={0.28} scale={14} blur={2.4} far={6} resolution={128} frames={1} color="#151a15" />
    <PlayerRig input={props.input} yaw={props.yaw} pitch={props.pitch} target={props.target} avatar={props.avatar} onNearby={props.nearby} transition={props.transition} reducedMotion={props.reducedMotion} onTransitionComplete={props.onTransitionComplete} />
    <SceneReady onReady={props.onReady} />
  </>
}

export function HomeWorldProductionSacred({onOrbOpen=requestUraiWorldOrbOpen,webglAvailable=true}:Props){
  const [canvasReady,setCanvasReady]=useState(false)
  const [sceneReady,setSceneReady]=useState(false)
  const [nearby,setNearby]=useState<Nearby>(null)
  const [dragging,setDragging]=useState(false)
  const [reducedMotion,setReducedMotion]=useState(false)
  const [mobile,setMobile]=useState(false)
  const [orbState,setOrbState]=useState<OrbState>('idle')
  const [transition,setTransition]=useState<'none'|'ground'|'life-map'>('none')
  const yaw=useRef(DEFAULT_YAW)
  const pitch=useRef(-0.035)
  const target=useRef<THREE.Vector3|null>(null)
  const avatar=useRef<THREE.Group|null>(null)
  const markSceneReady=useCallback(()=>setSceneReady(true),[])

  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition])
  const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('ground')},[transition])
  const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition])
  const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=DEFAULT_YAW;pitch.current=-0.035}})
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.46,maxPitch:0.5,onDragState:setDragging})

  useEffect(()=>{
    const rm=window.matchMedia('(prefers-reduced-motion: reduce)')
    const mobileQuery=window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply=()=>{setReducedMotion(rm.matches);setMobile(mobileQuery.matches)}
    apply()
    rm.addEventListener?.('change',apply)
    mobileQuery.addEventListener?.('change',apply)
    return()=>{rm.removeEventListener?.('change',apply);mobileQuery.removeEventListener?.('change',apply)}
  },[])

  useEffect(()=>{
    const listener=(event:CustomEvent<OrbStateEventDetail>)=>{if(transition==='none')setOrbState(event.detail.state)}
    window.addEventListener(URAI_ORB_STATE_EVENT,listener)
    return()=>window.removeEventListener(URAI_ORB_STATE_EVENT,listener)
  },[transition])

  useEffect(()=>{
    const cancel=(event:KeyboardEvent)=>{
      if(event.key!=='Escape'||transition==='none')return
      event.preventDefault()
      setTransition('none')
      setOrbState('idle')
      const store=useSceneStore.getState()
      store.setPhase('HOME')
      store.unlock()
    }
    window.addEventListener('keydown',cancel,true)
    return()=>window.removeEventListener('keydown',cancel,true)
  },[transition])

  if(!webglAvailable)return null
  const ready=canvasReady&&sceneReady
  const context=transition==='life-map'?'Ascending into your Life Map':transition==='ground'?'Descending into Ground':nearby==='orb'?'The Orb is here':nearby==='ground'?'The path descends':nearby==='life-map'?'Look to the sky':null
  const complete=()=>{
    if(transition==='ground')requestUraiWorldTravel({destination:'infrastructure-hub',href:'/ground/',entryPortal:'home-ground',cameraCheckpoint:'home-ground-descent'})
    else if(transition==='life-map')requestUraiWorldTravel({destination:'life-map',href:'/life-map/?from=home-sky',entryPortal:'home-sky',cameraCheckpoint:'home-sky-ascent-complete'})
  }

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-aaa-natural-sanctuary" data-home-visual-revision="aaa-sightline-clearance-20260913" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb generated-continuous-terrain authored-memory-shrines sculpted-stone-thresholds layered-ridge-horizon" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#17333a'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.15]} shadows camera={{position:[2.42,1.72,8.12],fov:43,near:0.1,far:240}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.2;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
      <SacredScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onReady={markSceneReady} />
    </Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}
    {transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The living-memory Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate in privacy-preserving first-person presentation.</span>
  </main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)
