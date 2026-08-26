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
const DEFAULT_YAW = 0.18

function seededNoise(x: number, y: number, seed: number) {
  const raw = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

function smoothstep01(value: number) {
  const x = THREE.MathUtils.clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

function cloneAuthoredMaterial(material: THREE.Material) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    const materialName = `${material.name} ${clone.name}`.toLowerCase()
    const hasEmission = clone.emissive.r > 0 || clone.emissive.g > 0 || clone.emissive.b > 0
    if (hasEmission) clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.68)
    if (/eye|cornea|iris/.test(materialName)) {
      clone.roughness = 0.06
      clone.metalness = 0
      clone.envMapIntensity = 1.25
      if (clone instanceof THREE.MeshPhysicalMaterial) { clone.clearcoat = 1; clone.clearcoatRoughness = 0.05 }
    } else if (/skin|body|face|head|ear|hand|foot/.test(materialName)) {
      clone.roughness = 0.62
      clone.metalness = 0
      clone.envMapIntensity = 0.44
      if (clone instanceof THREE.MeshPhysicalMaterial) { clone.clearcoat = 0.025; clone.clearcoatRoughness = 0.8 }
    } else if (/cloth|shirt|pants|garment|fabric|shoe/.test(materialName)) {
      clone.roughness = 0.86
      clone.metalness = 0
      clone.envMapIntensity = 0.32
    } else if (/hair|brow|lash/.test(materialName)) {
      clone.roughness = 0.66
      clone.metalness = 0
      clone.envMapIntensity = 0.36
    } else if (/metal|steel|chrome|bronze|gold|alloy/.test(materialName)) {
      clone.roughness = THREE.MathUtils.clamp(clone.roughness, 0.34, 0.62)
      clone.metalness = Math.max(clone.metalness, 0.5)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 0.94)
    } else {
      clone.roughness = THREE.MathUtils.clamp(Math.max(0.56, clone.roughness), 0.56, 0.96)
      clone.metalness = Math.min(clone.metalness, 0.18)
      clone.envMapIntensity = THREE.MathUtils.clamp(clone.envMapIntensity, 0.58, 0.82)
    }
    clone.needsUpdate = true
  }
  return clone
}

function cloneAuthoredModel(source: THREE.Object3D) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    object.material = Array.isArray(object.material) ? object.material.map(cloneAuthoredMaterial) : cloneAuthoredMaterial(object.material)
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

function cloneSanctuary(source: THREE.Object3D) {
  const root = cloneAuthoredModel(source)
  root.visible = false
  root.userData.retainedForGovernedCompatibilityOnly = true
  root.userData.visibleWorldOwner = 'home-grounded-obsidian-sanctuary-v14'
  return root
}

function makeObsidianGroundGeometry() {
  const geometry = new THREE.PlaneGeometry(52, 64, 96, 112)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const deep = new THREE.Color('#161c1b')
  const mid = new THREE.Color('#27302d')
  const mineral = new THREE.Color('#3b403a')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = -position.getY(index) - 4
    const broad = Math.sin(x * 0.18 + z * 0.11) * 0.045 + Math.cos(z * 0.17 - x * 0.08) * 0.032
    const grain = (seededNoise(index, 17, 71) - 0.5) * 0.045
    const edgeRise = smoothstep01((Math.abs(x) - 7.5) / 14) * 0.22
    const farRise = smoothstep01((-z - 12) / 24) * 0.26
    const clearing = Math.exp(-((x * x) / 24 + ((z + 2.7) * (z + 2.7)) / 28))
    const height = -0.12 + broad + grain + edgeRise + farRise - clearing * 0.035
    position.setZ(index, height)
    const shade = THREE.MathUtils.clamp((height + 0.18) / 0.46, 0, 1)
    const mineralMix = seededNoise(index, 5, 101) * 0.18
    const tint = deep.clone().lerp(mid, shade).lerp(mineral, mineralMix)
    colors[index * 3] = tint.r
    colors[index * 3 + 1] = tint.g
    colors[index * 3 + 2] = tint.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

function makeRidgeGeometry(width: number, depth: number, seed: number, amplitude: number) {
  const geometry = new THREE.PlaneGeometry(width, depth, 112, 56)
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const valley = new THREE.Color('#182326')
  const slope = new THREE.Color('#293638')
  const crown = new THREE.Color('#465152')
  const peaks = [
    { x: -width * 0.32, spread: width * 0.17, scale: 0.72 },
    { x: -width * 0.06, spread: width * 0.2, scale: 1 },
    { x: width * 0.24, spread: width * 0.18, scale: 0.78 },
  ]
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = -position.getY(index)
    const depthEnvelope = smoothstep01((z + depth * 0.5) / (depth * 0.72))
    let peak = 0
    for (const candidate of peaks) {
      const dx = (x - candidate.x) / candidate.spread
      peak += Math.exp(-dx * dx * 1.7) * candidate.scale
    }
    const macro = Math.sin(x * 0.095 + z * 0.07 + seed) * 0.32 + Math.cos(x * 0.043 - z * 0.11 - seed) * 0.22
    const erosion = Math.abs(Math.sin(x * 0.21 + z * 0.16 + seed)) * 0.19 + (seededNoise(index, seed, 97) - 0.5) * 0.2
    const height = -2.25 + depthEnvelope * amplitude * (0.18 + peak * 0.58) + macro + erosion
    position.setZ(index, height)
    const elevation = THREE.MathUtils.clamp((height + 1.9) / (amplitude * 0.86), 0, 1)
    const tint = valley.clone().lerp(slope, elevation).lerp(crown, smoothstep01((elevation - 0.7) / 0.3) * 0.28)
    colors[index * 3] = tint.r
    colors[index * 3 + 1] = tint.g
    colors[index * 3 + 2] = tint.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

const APPROACH_STONES: readonly [number, number, number, number][] = [
  [0.08,6.65,0.82,0.02],[-0.04,5.72,0.88,-0.025],[0.1,4.75,0.9,0.02],[-0.08,3.76,0.94,-0.02],
  [0.06,2.74,0.96,0.018],[-0.03,1.7,0.98,-0.014],[0.04,0.64,1,0.012],[-0.02,-0.44,1.02,-0.01],
]

function ApproachPath() {
  return <group name="home-sanctuary-approach">
    {APPROACH_STONES.map(([x,z,width,yaw], index) => <mesh key={index} position={[x,0.035,z]} rotation={[0,yaw,0]} castShadow receiveShadow>
      <boxGeometry args={[width,0.09,0.72]} />
      <meshPhysicalMaterial color={index % 2 ? '#343a38' : '#2d3432'} roughness={0.86} metalness={0.05} clearcoat={0.04} clearcoatRoughness={0.8} envMapIntensity={0.62} />
    </mesh>)}
  </group>
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const retainedModel = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const terrain = useMemo(() => makeObsidianGroundGeometry(), [])
  useEffect(() => () => terrain.dispose(), [terrain])
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'weathered-obsidian-ground-v14' }}>
    <primitive object={retainedModel} />
    <mesh name="home-obsidian-walkable-terrain" geometry={terrain} position={[0,-0.035,-4]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <meshPhysicalMaterial color="#27302d" vertexColors roughness={0.92} metalness={0.035} clearcoat={0.06} clearcoatRoughness={0.84} envMapIntensity={0.58} />
    </mesh>
    <ApproachPath />
    <mesh name="home-walkable-navigation-surface" position={[0,0.24,-1.8]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[21,21]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={0.78}>
    <Lightformer form="rect" intensity={2.8} color="#dbe4e3" position={[-7,12,7]} scale={[12,5,1]} target={[0,0.8,-4]} />
    <Lightformer form="rect" intensity={1.5} color="#7997a2" position={[10,6,-11]} scale={[8,4,1]} target={[0,1,-5]} />
    <Lightformer form="rect" intensity={0.8} color="#b49a72" position={[-8,4,4]} scale={[5,3,1]} target={[0,0.7,-2]} />
  </Environment>
}

function Lantern({ position, scale = 1, yaw = 0 }: { position: Vec3; scale?: number; yaw?: number }) {
  return <group position={position as [number,number,number]} scale={scale} rotation={[0,yaw,0]}>
    <mesh castShadow receiveShadow position={[0,0.13,0]}><cylinderGeometry args={[0.105,0.14,0.24,24]} /><meshStandardMaterial color="#171b1a" roughness={0.66} metalness={0.42} /></mesh>
    <mesh position={[0,0.37,0]} castShadow><cylinderGeometry args={[0.09,0.09,0.32,24]} /><meshPhysicalMaterial color="#8a765d" transparent opacity={0.2} transmission={0.7} roughness={0.28} metalness={0} clearcoat={0.35} clearcoatRoughness={0.3} /></mesh>
    <mesh position={[0,0.37,0]}><sphereGeometry args={[0.032,20,20]} /><meshBasicMaterial color="#dcb77b" toneMapped={false} /></mesh>
    <mesh position={[0,0.58,0]} castShadow><cylinderGeometry args={[0.13,0.09,0.07,24]} /><meshStandardMaterial color="#171b1a" roughness={0.64} metalness={0.44} /></mesh>
    <pointLight position={[0,0.37,0]} color="#c6975b" intensity={0.24} distance={3.4} decay={2} />
  </group>
}

function ArchitecturalPracticals() {
  const fixtures = [
    { p: [-2.8,0.14,3.95] as Vec3, s: 0.78, y: 0.08 }, { p: [2.9,0.14,3.7] as Vec3, s: 0.76, y: -0.1 },
    { p: [-3.45,0.16,-0.65] as Vec3, s: 0.82, y: -0.06 }, { p: [3.55,0.16,-1.05] as Vec3, s: 0.8, y: 0.1 },
  ]
  return <group name="home-cinematic-practical-lighting">{fixtures.map((fixture,index)=><Lantern key={index} position={fixture.p} scale={fixture.s} yaw={fixture.y} />)}</group>
}

function MountainRange() {
  const near = useMemo(() => makeRidgeGeometry(78,40,11,9.7), [])
  const far = useMemo(() => makeRidgeGeometry(112,52,29,12.8), [])
  useEffect(() => () => { near.dispose(); far.dispose() }, [far,near])
  return <group name="home-distant-natural-horizon" userData={{ geometry: 'dense-atmospheric-ridges-v14' }}>
    <mesh geometry={far} position={[-10,-3.4,-67]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <meshStandardMaterial color="#314043" vertexColors roughness={1} metalness={0} envMapIntensity={0.2} side={THREE.DoubleSide} />
    </mesh>
    <mesh geometry={near} position={[7,-2.8,-45]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <meshStandardMaterial color="#263235" vertexColors roughness={1} metalness={0} envMapIntensity={0.24} side={THREE.DoubleSide} />
    </mesh>
  </group>
}

const FERN_PLACEMENTS: readonly [number,number,number,number][] = [
  [-4.9,5.9,0.74,0.2],[-4.25,3.25,0.62,-0.65],[-6.9,1.6,0.52,2.3],[-8.5,-2.1,0.58,0.5],[-6.2,-7.4,0.48,0.8],
  [4.9,5.7,0.7,-0.25],[4.4,2.55,0.6,0.72],[7.2,0.7,0.48,-2.2],[8.8,-3.5,0.56,1.2],[6.1,-7.8,0.46,0.7],
  [-9.2,4.2,0.56,1.5],[9.3,3.8,0.54,-1.7],[-4.4,-4.8,0.42,0.4],[4.7,-5.2,0.42,-1.1],
]

function FernGarden({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color:'#273b31', roughness:0.99, metalness:0, side:THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color:'#304438', roughness:0.98, metalness:0, side:THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color:'#22342d', roughness:1, metalness:0, side:THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material)=>material.dispose()), [materials])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,yaw],index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x,0.04 + Math.sin(x * 0.21 + z * 0.13) * 0.025,z)
    object.rotation.y = yaw
    object.rotation.z = (seededNoise(index,9,3)-0.5) * 0.045
    object.scale.setScalar(scale * (0.92 + seededNoise(index,5,13) * 0.14))
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = materials[index % materials.length]
      child.castShadow = true
      child.receiveShadow = true
    })
    return object
  }), [fern.scene,materials])
  return <group userData={{ reducedMotion, treatment:'sparse-scanned-perimeter-growth-v14' }}>{plants.map((plant)=><primitive key={plant.name} object={plant} />)}</group>
}

const SKY_VERTEX = `
  varying vec3 vSkyDirection;
  void main() {
    vSkyDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const SKY_FRAGMENT = `
  varying vec3 vSkyDirection;
  void main() {
    vec3 direction = normalize(vSkyDirection);
    float height = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 horizon = vec3(0.24, 0.30, 0.31);
    vec3 middle = vec3(0.095, 0.17, 0.20);
    vec3 zenith = vec3(0.025, 0.065, 0.095);
    vec3 color = mix(horizon, middle, smoothstep(0.03, 0.46, height));
    color = mix(color, zenith, smoothstep(0.46, 0.98, height));
    float haze = 1.0 - smoothstep(0.02, 0.18, abs(direction.y));
    color += vec3(0.035, 0.028, 0.022) * haze;
    gl_FragColor = vec4(color, 1.0);
  }
`

function SkyDome() {
  return <mesh name="home-atmospheric-sky" frustumCulled={false} renderOrder={-10} userData={{ treatment:'premium-blue-hour-obsidian-v14' }}>
    <sphereGeometry args={[170,64,40]} />
    <shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
  </mesh>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <MountainRange />
      <group position={[-14.5,10.8,-48]}>
        <mesh name="home-physical-moon" castShadow>
          <sphereGeometry args={[0.72,56,56]} />
          <meshStandardMaterial color="#d7d5cc" emissive="#807b6d" emissiveIntensity={0.08} roughness={0.94} metalness={0} envMapIntensity={0.42} />
        </mesh>
      </group>
    </group>
    <group name="home-living-vegetation"><FernGarden reducedMotion={reducedMotion} /></group>
  </>
}

const ORB_FRAGMENT_LAYOUT: readonly [Vec3, Vec3, number][] = [
  [[0.31,0.12,0.08],[0.4,0.1,0.7],0.08],
  [[-0.27,0.18,0.12],[-0.3,0.7,0.2],0.07],
  [[0.16,-0.24,0.2],[0.8,0.2,-0.4],0.065],
  [[-0.18,-0.2,-0.22],[-0.5,0.3,0.9],0.06],
  [[0.05,0.29,-0.18],[0.2,-0.6,0.4],0.055],
  [[-0.04,-0.31,0.15],[-0.7,-0.2,0.1],0.052],
]

function SacredOrb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state, reducedMotion])

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
  useEffect(() => () => { Object.values(actions).forEach((action) => action?.stop()) }, [actions])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.018
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.62) * 0.025
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 0.3 : state === 'listening' ? 0.292 : 0.286 + Math.sin(clock.elapsedTime * 0.95) * 0.004
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  const stateIntensity = state === 'speaking' ? 1.75 : state === 'listening' ? 1.48 : state === 'warning' ? 1.28 : 1.08
  const stateColor = state === 'warning' ? '#d3a06a' : state === 'thinking' || state === 'reflecting' ? '#929bd0' : '#82d8dc'

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState:state, animation:sensory.animation, modelClip:ORB_CLIPS[state], runtimeAsset:ORB_MODEL, treatment:'premium-moonlit-relic-machine-v14' }}>
    <mesh castShadow scale={[1,1.05,0.94]}>
      <sphereGeometry args={[0.5,64,64]} />
      <meshPhysicalMaterial color="#a9d6d5" transparent opacity={0.055} transmission={0.92} thickness={0.07} roughness={0.2} metalness={0} clearcoat={0.68} clearcoatRoughness={0.22} ior={1.17} envMapIntensity={0.92} depthWrite={false} />
    </mesh>
    <group ref={authoredCore} scale={0.286} name="home-orb-authored-core"><primitive object={authoredOrb} /></group>
    <mesh name="home-orb-non-spherical-core" scale={[0.17,0.29,0.135]} rotation={[0.16,0.38,-0.08]} castShadow>
      <octahedronGeometry args={[1,2]} />
      <meshPhysicalMaterial color="#d4ebe5" emissive={stateColor} emissiveIntensity={stateIntensity} roughness={0.33} metalness={0.1} clearcoat={0.35} clearcoatRoughness={0.34} envMapIntensity={0.96} />
    </mesh>
    <mesh name="home-orb-stabilizer-ring-1" rotation={[0.28,0.5,0.14]} castShadow><torusGeometry args={[0.49,0.012,12,128]} /><meshStandardMaterial color="#737f7c" emissive="#527b7d" emissiveIntensity={0.055} metalness={0.8} roughness={0.31} envMapIntensity={1.05} /></mesh>
    <mesh name="home-orb-stabilizer-ring-2" rotation={[1.38,-0.22,0.64]} castShadow><torusGeometry args={[0.44,0.011,12,128]} /><meshStandardMaterial color="#7d7564" emissive="#735f43" emissiveIntensity={0.045} metalness={0.74} roughness={0.35} envMapIntensity={0.98} /></mesh>
    <mesh name="home-orb-stabilizer-ring-3" rotation={[0.78,1.1,-0.44]} castShadow><torusGeometry args={[0.395,0.009,12,128]} /><meshStandardMaterial color="#607173" emissive="#4b787b" emissiveIntensity={0.05} metalness={0.72} roughness={0.36} envMapIntensity={0.98} /></mesh>
    <group name="home-orb-crystalline-fragments">
      {ORB_FRAGMENT_LAYOUT.map(([position,rotation,scale],index)=><mesh key={index} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale} castShadow>
        <tetrahedronGeometry args={[1,0]} />
        <meshPhysicalMaterial color={index % 2 === 0 ? '#9db6b0' : '#8e9da2'} emissive={stateColor} emissiveIntensity={0.08} roughness={0.36} metalness={0.3} clearcoat={0.42} clearcoatRoughness={0.32} envMapIntensity={1.04} />
      </mesh>)}
    </group>
    <mesh name="home-orb-state-light" position={[0,-0.025,0.285]}><sphereGeometry args={[0.032,24,24]} /><meshStandardMaterial color="#ece8db" emissive={stateColor} emissiveIntensity={stateIntensity * 1.15} roughness={0.32} metalness={0.05} /></mesh>
    <pointLight color={stateColor} intensity={stateIntensity * 0.82} distance={5.2} decay={2} />
  </group>
}

function OrbPlatform() {
  return <group name="home-sanctuary-pavilion" position={[0,0,-2.65]} userData={{ visualOwner:'obsidian-ritual-platform-v14' }}>
    <mesh position={[0,0.12,0]} castShadow receiveShadow><cylinderGeometry args={[2.3,2.34,0.22,96]} /><meshPhysicalMaterial color="#202725" roughness={0.62} metalness={0.16} clearcoat={0.12} clearcoatRoughness={0.55} envMapIntensity={0.8} /></mesh>
    <mesh position={[0,0.245,0]} rotation={[Math.PI/2,0,0]}><ringGeometry args={[1.62,1.64,128]} /><meshStandardMaterial color="#9b8b6a" emissive="#5e5036" emissiveIntensity={0.06} metalness={0.52} roughness={0.46} /></mesh>
    <mesh position={[0,0.247,0]} rotation={[Math.PI/2,0,0]}><ringGeometry args={[0.82,0.835,128]} /><meshStandardMaterial color="#7db4b6" emissive="#56898b" emissiveIntensity={0.08} metalness={0.42} roughness={0.42} /></mesh>
    <mesh position={[0,0.19,0]} castShadow receiveShadow><cylinderGeometry args={[1.04,1.08,0.14,96]} /><meshPhysicalMaterial color="#313735" roughness={0.7} metalness={0.12} clearcoat={0.08} clearcoatRoughness={0.65} envMapIntensity={0.72} /></mesh>
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{ presentation:'privacy-preserving-first-person-presence' }}><primitive object={model} visible={false} scale={0.72} /></group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0,1.34,0.1]}>
    <mesh scale={[0.78,1.12,1]}><circleGeometry args={[1,64]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.035} transparent opacity={0.018} transmission={0.78} roughness={0.32} metalness={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <pointLight color={color} intensity={0.12} distance={3.5} decay={2} />
  </group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const color = tone === 'ground' ? '#6ca9ac' : '#7770b5'
  return <group userData={{ treatment:'grounded-basalt-descent-v14' }}>
    <mesh position={[-0.72,0.72,0.08]} rotation={[0.03,0.08,-0.035]} castShadow receiveShadow><cylinderGeometry args={[0.21,0.28,1.42,7,2]} /><meshPhysicalMaterial color="#252c2b" roughness={0.9} metalness={0.05} clearcoat={0.025} clearcoatRoughness={0.9} envMapIntensity={0.48} /></mesh>
    <mesh position={[0.72,0.66,-0.03]} rotation={[-0.02,-0.09,0.04]} castShadow receiveShadow><cylinderGeometry args={[0.2,0.27,1.3,7,2]} /><meshPhysicalMaterial color="#222928" roughness={0.92} metalness={0.045} clearcoat={0.02} clearcoatRoughness={0.92} envMapIntensity={0.46} /></mesh>
    <mesh position={[-0.715,0.78,0.25]}><boxGeometry args={[0.065,0.44,0.025]} /><meshStandardMaterial color="#88babc" emissive={color} emissiveIntensity={0.16} metalness={0.22} roughness={0.48} /></mesh>
    <mesh position={[0.715,0.72,0.16]}><boxGeometry args={[0.065,0.4,0.025]} /><meshStandardMaterial color="#88babc" emissive={color} emissiveIntensity={0.14} metalness={0.22} roughness={0.48} /></mesh>
    <PortalMembrane color={color} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.12,0]} userData={{ runtimeAsset:PORTAL_MODEL, treatment:'authored-portal-physical-threshold-v14' }}>
    <group name="home-life-map-portal-authored-visible" position={[0,1.55,0]} scale={0.62}><primitive object={model} /></group>
    <PortalMembrane color="#7770b5" />
    <mesh position={[0,1.55,0]} onClick={(event)=>{event.stopPropagation();onActivate()}}><boxGeometry args={[4.2,4.2,3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Thresholds({ onGround, onLifeMap }: { onGround: () => void; onLifeMap: () => void }) {
  return <>
    <group name="home-ground-environmental-threshold" position={GROUND} rotation={[0,0.12,0]}><DestinationArch tone="ground" /><mesh position={[0,1.55,0]} onClick={(event)=>{event.stopPropagation();onGround()}}><boxGeometry args={[4.2,4.2,3]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh></group>
    <group name="home-life-map-sky-lookout"><LifeMapPortal onActivate={onLifeMap} /></group>
  </>
}

function PlayerRig({ input, yaw, pitch, target, avatar, onNearby, transition, reducedMotion, onTransitionComplete }: { input:MovementInput; yaw:MutableRefObject<number>; pitch:MutableRefObject<number>; target:MutableRefObject<THREE.Vector3|null>; avatar:MutableRefObject<THREE.Group|null>; onNearby:(value:Nearby)=>void; transition:'none'|'ground'|'life-map'; reducedMotion:boolean; onTransitionComplete:()=>void }) {
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
    <color attach="background" args={[cosmic?'#01030a':'#0f1b20']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#243236',cosmic?0.0022:0.0062]} />
    {!cosmic?<SkyDome />:null}
    {cosmic?<Stars radius={190} depth={100} count={2800} factor={3} saturation={0.05} fade speed={props.reducedMotion?0:0.008} />:null}
    <PhysicalEnvironment />
    <ambientLight intensity={0.4} color="#cad2cf" />
    <hemisphereLight args={['#aebfc5','#171814',0.78]} />
    <directionalLight position={[-12,17,9]} intensity={2.15} color="#dce5e8" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.00012} />
    <directionalLight position={[11,7,-13]} intensity={0.34} color="#6f8d98" />
    <directionalLight position={[-5,5,10]} intensity={0.22} color="#b5966a" />
    <spotLight position={[1,10,7]} intensity={0.52} color="#e9e6dd" distance={32} angle={0.5} penumbra={0.98} decay={2} castShadow />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.04,-2.2]} opacity={0.32} scale={18} blur={3.1} far={6.5} resolution={256} frames={1} color="#090c0b" />
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
  const look=useDragLook({yaw,pitch,enabled:transition==='none',sensitivity:0.003,minPitch:-0.48,maxPitch:0.52,onDragState:setDragging})

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

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v14-obsidian-blue-hour" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb weathered-obsidian-ground-v14 dense-atmospheric-ridges-v14" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#0f1b20'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.35]} shadows camera={{position:[2.42,1.72,8.12],fov:43,near:0.1,far:240}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.18;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
      <SacredScene input={input} yaw={yaw} pitch={pitch} target={target} avatar={avatar} nearby={setNearby} orbState={orbState} reducedMotion={reducedMotion} transition={transition} onOrb={openOrb} onGround={ground} onLifeMap={lifeMap} onTransitionComplete={complete} onReady={markSceneReady} />
    </Canvas>
    {context?<div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div>:null}
    {transition==='none'&&mobile?<MobileMovementPad input={input} label="Home movement controls" />:null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The sacred-tech Orb companion is physically present in the Home sanctuary and consumes the final authored Orb GLB.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your embodied Home presence uses the real skinned V4 human candidate.</span>
  </main>
}

useGLTF.preload(SANCTUARY)
useGLTF.preload(ORB_MODEL)
useGLTF.preload(PORTAL_MODEL)
useGLTF.preload(HUMAN)
useGLTF.preload(FERN_MODEL)
