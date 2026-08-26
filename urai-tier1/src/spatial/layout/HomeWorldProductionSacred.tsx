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
type SurfacePack = { color: THREE.DataTexture; height: THREE.DataTexture; roughness: THREE.DataTexture }
const DEFAULT_YAW = 0.13

function seededNoise(x: number, y: number, seed: number) {
  const raw = Math.sin((x + seed * 17.17) * 12.9898 + (y + seed * 31.31) * 78.233) * 43758.5453123
  return raw - Math.floor(raw)
}

function smoothstep01(value: number) {
  const x = THREE.MathUtils.clamp(value, 0, 1)
  return x * x * (3 - 2 * x)
}

function configureSurfaceTexture(texture: THREE.DataTexture, repeat: number, color = false) {
  texture.wrapS = THREE.RepeatWrapping
  texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(repeat, repeat)
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.magFilter = THREE.LinearFilter
  texture.generateMipmaps = true
  texture.anisotropy = 4
  texture.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  texture.needsUpdate = true
  return texture
}

function makeWeatheredStonePack(repeat = 7.5, seed = 211): SurfacePack {
  const size = 384
  const colorBytes = new Uint8Array(size * size * 4)
  const heightBytes = new Uint8Array(size * size * 4)
  const roughBytes = new Uint8Array(size * size * 4)
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const broad = Math.sin(x * 0.045 + seed) * 0.26 + Math.cos(y * 0.039 - seed * 0.8) * 0.22
      const cross = Math.sin((x + y) * 0.11) * 0.1 + Math.cos((x - y) * 0.087) * 0.08
      const grain = seededNoise(x, y, seed + 17) - 0.5
      const pores = seededNoise(x * 3, y * 3, seed + 73)
      const veinA = Math.abs(Math.sin(x * 0.024 + Math.sin(y * 0.019) * 1.8 + seed))
      const veinB = Math.abs(Math.cos(y * 0.031 + Math.sin(x * 0.015) * 1.5 - seed * 0.4))
      const mineral = smoothstep01((0.16 - Math.min(veinA, veinB)) / 0.16)
      const pitting = pores > 0.965 ? 1 : 0
      const tone = broad + cross + grain * 0.44
      const index = (y * size + x) * 4
      const base = 30 + tone * 10 - pitting * 8
      colorBytes[index] = THREE.MathUtils.clamp(Math.round(base + mineral * 7), 14, 58)
      colorBytes[index + 1] = THREE.MathUtils.clamp(Math.round(base + 5 + mineral * 9), 16, 64)
      colorBytes[index + 2] = THREE.MathUtils.clamp(Math.round(base + 5 + mineral * 8), 17, 66)
      colorBytes[index + 3] = 255
      const height = THREE.MathUtils.clamp(0.52 + tone * 0.055 + mineral * 0.025 - pitting * 0.18, 0, 1)
      const roughness = THREE.MathUtils.clamp(0.79 + grain * 0.08 - mineral * 0.08 + pitting * 0.08, 0.62, 0.98)
      const h = Math.round(height * 255)
      const r = Math.round(roughness * 255)
      heightBytes[index] = h; heightBytes[index + 1] = h; heightBytes[index + 2] = h; heightBytes[index + 3] = 255
      roughBytes[index] = r; roughBytes[index + 1] = r; roughBytes[index + 2] = r; roughBytes[index + 3] = 255
    }
  }
  return {
    color: configureSurfaceTexture(new THREE.DataTexture(colorBytes, size, size, THREE.RGBAFormat), repeat, true),
    height: configureSurfaceTexture(new THREE.DataTexture(heightBytes, size, size, THREE.RGBAFormat), repeat),
    roughness: configureSurfaceTexture(new THREE.DataTexture(roughBytes, size, size, THREE.RGBAFormat), repeat),
  }
}

function useWeatheredStonePack(repeat = 7.5, seed = 211) {
  const pack = useMemo(() => makeWeatheredStonePack(repeat, seed), [repeat, seed])
  useEffect(() => () => { pack.color.dispose(); pack.height.dispose(); pack.roughness.dispose() }, [pack])
  return pack
}

function cloneAuthoredMaterial(material: THREE.Material) {
  const clone = material.clone()
  if (clone instanceof THREE.MeshStandardMaterial) {
    const materialName = `${material.name} ${clone.name}`.toLowerCase()
    const hasEmission = clone.emissive.r > 0 || clone.emissive.g > 0 || clone.emissive.b > 0
    if (hasEmission) clone.emissiveIntensity = Math.max(clone.emissiveIntensity, 0.54)
    if (/eye|cornea|iris/.test(materialName)) {
      clone.roughness = 0.07; clone.metalness = 0; clone.envMapIntensity = 1.2
      if (clone instanceof THREE.MeshPhysicalMaterial) { clone.clearcoat = 1; clone.clearcoatRoughness = 0.05 }
    } else if (/skin|body|face|head|ear|hand|foot/.test(materialName)) {
      clone.roughness = 0.64; clone.metalness = 0; clone.envMapIntensity = 0.4
      if (clone instanceof THREE.MeshPhysicalMaterial) { clone.clearcoat = 0.02; clone.clearcoatRoughness = 0.82 }
    } else if (/cloth|shirt|pants|garment|fabric|shoe/.test(materialName)) {
      clone.roughness = 0.88; clone.metalness = 0; clone.envMapIntensity = 0.3
    } else if (/metal|steel|chrome|bronze|gold|alloy/.test(materialName)) {
      clone.roughness = THREE.MathUtils.clamp(clone.roughness, 0.36, 0.64)
      clone.metalness = Math.max(clone.metalness, 0.48)
      clone.envMapIntensity = Math.max(clone.envMapIntensity, 0.88)
    } else {
      clone.roughness = THREE.MathUtils.clamp(Math.max(0.58, clone.roughness), 0.58, 0.97)
      clone.metalness = Math.min(clone.metalness, 0.16)
      clone.envMapIntensity = THREE.MathUtils.clamp(clone.envMapIntensity, 0.54, 0.78)
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
  root.userData.visibleWorldOwner = 'home-photographic-obsidian-sanctuary-v15'
  return root
}

function makeGroundGeometry() {
  const geometry = new THREE.PlaneGeometry(58, 78, 120, 156)
  const position = geometry.getAttribute('position')
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index)
    const z = -position.getY(index) - 9
    const broad = Math.sin(x * 0.12 + z * 0.06) * 0.028 + Math.cos(z * 0.095 - x * 0.04) * 0.022
    const grain = (seededNoise(index, 17, 91) - 0.5) * 0.025
    const edge = smoothstep01((Math.abs(x) - 9) / 18) * 0.11
    const distance = smoothstep01((-z - 15) / 36) * 0.14
    const clearing = Math.exp(-((x * x) / 28 + ((z + 2.7) * (z + 2.7)) / 34))
    position.setZ(index, -0.11 + broad + grain + edge + distance - clearing * 0.025)
  }
  geometry.computeVertexNormals()
  return geometry
}

function StoneMaterial({ pack, color = '#363c3a', bumpScale = 0.065 }: { pack: SurfacePack; color?: string; bumpScale?: number }) {
  return <meshPhysicalMaterial
    color={color}
    map={pack.color}
    bumpMap={pack.height}
    bumpScale={bumpScale}
    roughnessMap={pack.roughness}
    roughness={0.84}
    metalness={0.035}
    clearcoat={0.055}
    clearcoatRoughness={0.82}
    envMapIntensity={0.68}
  />
}

const APPROACH_SLABS: readonly [number, number, number, number, number][] = [
  [0.18,7.0,1.18,0.82,0.015],[-0.03,5.95,1.28,0.86,-0.018],[0.11,4.86,1.34,0.89,0.012],
  [-0.09,3.73,1.42,0.92,-0.014],[0.07,2.56,1.48,0.94,0.009],[-0.03,1.36,1.54,0.96,-0.008],
  [0.03,0.12,1.58,0.98,0.006],[-0.02,-1.13,1.62,1,-0.004],
]

function ApproachPath() {
  const pack = useWeatheredStonePack(1.7, 263)
  return <group name="home-sanctuary-approach" userData={{ treatment: 'hand-laid-weathered-stone-v15' }}>
    {APPROACH_SLABS.map(([x,z,width,depth,yaw], index) => <mesh key={index} position={[x,0.015,z]} rotation={[0,yaw,0]} castShadow receiveShadow>
      <boxGeometry args={[width,0.075,depth]} />
      <StoneMaterial pack={pack} color={index % 2 ? '#393e3b' : '#313735'} bumpScale={0.045} />
    </mesh>)}
  </group>
}

function RitualFloor({ target }: { target: MutableRefObject<THREE.Vector3 | null> }) {
  const sanctuary = useGLTF(SANCTUARY)
  const retainedModel = useMemo(() => cloneSanctuary(sanctuary.scene), [sanctuary.scene])
  const terrain = useMemo(() => makeGroundGeometry(), [])
  const groundPack = useWeatheredStonePack(9.5, 211)
  useEffect(() => () => terrain.dispose(), [terrain])
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (useSceneStore.getState().inputLocked) return
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <group name="home-authored-terrain" userData={{ treatment: 'weathered-obsidian-microdetail-v15' }}>
    <primitive object={retainedModel} />
    <mesh name="home-obsidian-walkable-terrain" geometry={terrain} position={[0,-0.02,-4.5]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <StoneMaterial pack={groundPack} color="#303735" bumpScale={0.075} />
    </mesh>
    <ApproachPath />
    <mesh name="home-walkable-navigation-surface" position={[0,0.24,-1.8]} rotation={[-Math.PI/2,0,0]} onClick={onWalk}>
      <planeGeometry args={[21,21]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} />
    </mesh>
  </group>
}

function PhysicalEnvironment() {
  return <Environment resolution={128} frames={1} background={false} environmentIntensity={0.72}>
    <Lightformer form="rect" intensity={2.2} color="#cbd8da" position={[-8,12,8]} scale={[12,5,1]} target={[0,0.6,-4]} />
    <Lightformer form="rect" intensity={1.05} color="#627e88" position={[10,6,-12]} scale={[9,4,1]} target={[0,0.8,-5]} />
    <Lightformer form="rect" intensity={0.48} color="#a8895d" position={[-6,3,5]} scale={[4,2,1]} target={[0,0.3,-1]} />
  </Environment>
}

function RecessedPractical({ position, yaw = 0 }: { position: Vec3; yaw?: number }) {
  return <group position={position as [number,number,number]} rotation={[0,yaw,0]}>
    <mesh position={[0,0.025,0]} castShadow receiveShadow><boxGeometry args={[0.34,0.05,0.12]} /><meshStandardMaterial color="#141918" roughness={0.58} metalness={0.5} /></mesh>
    <mesh position={[0,0.054,0]}><boxGeometry args={[0.22,0.008,0.045]} /><meshStandardMaterial color="#d8bb83" emissive="#b48a50" emissiveIntensity={0.42} roughness={0.36} metalness={0.28} /></mesh>
    <pointLight position={[0,0.16,0]} color="#c89b62" intensity={0.12} distance={2.8} decay={2} />
  </group>
}

function ArchitecturalPracticals() {
  const fixtures = [
    { p: [-1.15,0.03,4.75] as Vec3, y: 0.02 }, { p: [1.12,0.03,3.7] as Vec3, y: -0.02 },
    { p: [-1.08,0.03,1.9] as Vec3, y: -0.01 }, { p: [1.02,0.03,0.25] as Vec3, y: 0.01 },
  ]
  return <group name="home-cinematic-practical-lighting">{fixtures.map((fixture,index)=><RecessedPractical key={index} position={fixture.p} yaw={fixture.y} />)}</group>
}

function AtmosphericHorizon() {
  return <group name="home-distant-natural-horizon" userData={{ geometry: 'fog-carried-horizon-without-procedural-ridges-v15' }}>
    <mesh position={[0,-0.27,-49]} rotation={[-Math.PI/2,0,0]} receiveShadow>
      <planeGeometry args={[90,90,1,1]} />
      <meshStandardMaterial color="#151b1a" roughness={1} metalness={0} envMapIntensity={0.12} />
    </mesh>
  </group>
}

const FERN_PLACEMENTS: readonly [number,number,number,number][] = [
  [-7.8,4.2,0.42,1.2],[-8.6,-1.4,0.46,-0.5],[-7.4,-7.4,0.38,2.1],[-4.8,-10.4,0.34,-1.1],
  [7.9,3.5,0.4,-1.4],[8.7,-2.6,0.44,0.8],[7.2,-7.8,0.36,-2],[4.6,-10.7,0.33,1.5],
]

function FernGarden({ reducedMotion }: { reducedMotion: boolean }) {
  const fern = useGLTF(FERN_MODEL)
  const materials = useMemo(() => [
    new THREE.MeshStandardMaterial({ color:'#1d2c27', roughness:1, metalness:0, side:THREE.DoubleSide }),
    new THREE.MeshStandardMaterial({ color:'#24342d', roughness:0.99, metalness:0, side:THREE.DoubleSide }),
  ], [])
  useEffect(() => () => materials.forEach((material)=>material.dispose()), [materials])
  const plants = useMemo(() => FERN_PLACEMENTS.map(([x,z,scale,yaw],index) => {
    const object = fern.scene.clone(true)
    object.name = `home-scanned-fern-${index + 1}`
    object.position.set(x,0.02,z)
    object.rotation.y = yaw
    object.rotation.z = (seededNoise(index,9,3)-0.5) * 0.035
    object.scale.setScalar(scale * (0.94 + seededNoise(index,5,13) * 0.1))
    object.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return
      child.material = materials[index % materials.length]
      child.castShadow = true
      child.receiveShadow = true
    })
    return object
  }), [fern.scene,materials])
  return <group userData={{ reducedMotion, treatment:'perimeter-only-scanned-growth-v15' }}>{plants.map((plant)=><primitive key={plant.name} object={plant} />)}</group>
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
    vec3 horizon = vec3(0.115, 0.15, 0.16);
    vec3 middle = vec3(0.045, 0.09, 0.115);
    vec3 zenith = vec3(0.012, 0.032, 0.052);
    vec3 color = mix(horizon, middle, smoothstep(0.02, 0.48, height));
    color = mix(color, zenith, smoothstep(0.48, 0.98, height));
    float horizonHaze = 1.0 - smoothstep(0.015, 0.16, abs(direction.y));
    color += vec3(0.018, 0.019, 0.018) * horizonHaze;
    float dither = fract(sin(dot(direction.xz, vec2(91.17, 37.41))) * 43758.5453) - 0.5;
    color += dither * 0.0012;
    gl_FragColor = vec4(color, 1.0);
  }
`

function SkyDome() {
  return <mesh name="home-atmospheric-sky" frustumCulled={false} renderOrder={-10} userData={{ treatment:'photographic-blue-hour-haze-v15' }}>
    <sphereGeometry args={[170,64,40]} />
    <shaderMaterial vertexShader={SKY_VERTEX} fragmentShader={SKY_FRAGMENT} side={THREE.BackSide} depthWrite={false} toneMapped={false} />
  </mesh>
}

const MIST_VERTEX = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const MIST_FRAGMENT = `
  uniform float uTime;
  varying vec2 vUv;
  void main() {
    vec2 p = vUv * vec2(8.0, 12.0);
    float n = sin(p.x + uTime * 0.035) * 0.5 + sin(p.y * 1.27 - uTime * 0.021) * 0.28 + sin((p.x + p.y) * 0.63) * 0.22;
    n = n * 0.5 + 0.5;
    float edge = smoothstep(0.02, 0.22, vUv.y) * (1.0 - smoothstep(0.78, 0.99, vUv.y));
    float side = smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));
    float alpha = (0.012 + n * 0.026) * edge * side;
    gl_FragColor = vec4(0.34, 0.41, 0.42, alpha);
  }
`

function GroundMist({ reducedMotion }: { reducedMotion: boolean }) {
  const material = useRef<THREE.ShaderMaterial>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])
  useFrame(({clock}) => { if (!reducedMotion && material.current) material.current.uniforms.uTime.value = clock.elapsedTime })
  return <group name="home-ground-mist" userData={{ treatment:'low-density-depth-mist-v15' }}>
    <mesh position={[0,0.16,-13]} rotation={[-Math.PI/2,0,0]} renderOrder={3}>
      <planeGeometry args={[30,46]} />
      <shaderMaterial ref={material} uniforms={uniforms} vertexShader={MIST_VERTEX} fragmentShader={MIST_FRAGMENT} transparent depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  </group>
}

function MoonAndMist({ reducedMotion }: { reducedMotion: boolean }) {
  return <>
    <group name="home-mountain-horizon">
      <AtmosphericHorizon />
      <group position={[-18,15,-88]}>
        <mesh name="home-physical-moon" castShadow>
          <sphereGeometry args={[0.72,56,56]} />
          <meshStandardMaterial color="#c9c7bc" roughness={0.98} metalness={0} envMapIntensity={0.3} />
        </mesh>
      </group>
    </group>
    <GroundMist reducedMotion={reducedMotion} />
    <group name="home-living-vegetation"><FernGarden reducedMotion={reducedMotion} /></group>
  </>
}

const ORB_FRAGMENT_LAYOUT: readonly [Vec3, Vec3, number][] = [
  [[0.31,0.12,0.08],[0.4,0.1,0.7],0.075], [[-0.27,0.18,0.12],[-0.3,0.7,0.2],0.066],
  [[0.16,-0.24,0.2],[0.8,0.2,-0.4],0.06], [[-0.18,-0.2,-0.22],[-0.5,0.3,0.9],0.056],
  [[0.05,0.29,-0.18],[0.2,-0.6,0.4],0.052], [[-0.04,-0.31,0.15],[-0.7,-0.2,0.1],0.048],
]

function SacredOrb({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  const authoredCore = useRef<THREE.Group>(null)
  const activeAction = useRef<THREE.AnimationAction | null>(null)
  const orb = useGLTF(ORB_MODEL)
  const authoredOrb = useMemo(() => cloneAuthoredModel(orb.scene), [orb.scene])
  const { actions } = useAnimations(orb.animations, authoredOrb)
  const sensory = useMemo(() => resolveOrbSensoryOutput(state, reducedMotion, true), [state,reducedMotion])

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

  useFrame(({clock}) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.015
    root.current.position.y = ORB.y + Math.sin(clock.elapsedTime * 0.58) * 0.018
    if (authoredCore.current) {
      const pulse = state === 'speaking' ? 0.352 : state === 'listening' ? 0.344 : 0.338 + Math.sin(clock.elapsedTime * 0.9) * 0.003
      authoredCore.current.scale.setScalar(pulse)
    }
  })

  const stateIntensity = state === 'speaking' ? 1.42 : state === 'listening' ? 1.22 : state === 'warning' ? 1.12 : 0.92
  const stateColor = state === 'warning' ? '#cf9b65' : state === 'thinking' || state === 'reflecting' ? '#8f98c8' : '#7fcbd0'

  return <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event) => { event.stopPropagation(); onOpen() }} userData={{ orbState:state, animation:sensory.animation, modelClip:ORB_CLIPS[state], runtimeAsset:ORB_MODEL, treatment:'premium-moonlit-relic-machine-v15' }}>
    <mesh castShadow scale={[1,1.04,0.95]}>
      <sphereGeometry args={[0.5,64,64]} />
      <meshPhysicalMaterial color="#9cc6c5" transparent opacity={0.032} transmission={0.94} thickness={0.055} roughness={0.23} metalness={0} clearcoat={0.58} clearcoatRoughness={0.25} ior={1.16} envMapIntensity={0.82} depthWrite={false} />
    </mesh>
    <group ref={authoredCore} scale={0.338} name="home-orb-authored-core"><primitive object={authoredOrb} /></group>
    <mesh name="home-orb-non-spherical-core" scale={[0.13,0.225,0.105]} rotation={[0.16,0.38,-0.08]} castShadow>
      <octahedronGeometry args={[1,2]} />
      <meshPhysicalMaterial color="#c8dcda" emissive={stateColor} emissiveIntensity={stateIntensity * 0.62} roughness={0.38} metalness={0.16} clearcoat={0.28} clearcoatRoughness={0.38} envMapIntensity={0.88} />
    </mesh>
    <mesh name="home-orb-stabilizer-ring-1" rotation={[0.28,0.5,0.14]} castShadow><torusGeometry args={[0.49,0.014,16,128]} /><meshStandardMaterial color="#66716f" emissive="#456c6e" emissiveIntensity={0.035} metalness={0.84} roughness={0.32} envMapIntensity={1.02} /></mesh>
    <mesh name="home-orb-stabilizer-ring-2" rotation={[1.38,-0.22,0.64]} castShadow><torusGeometry args={[0.44,0.013,16,128]} /><meshStandardMaterial color="#766d5e" emissive="#66553d" emissiveIntensity={0.03} metalness={0.8} roughness={0.36} envMapIntensity={0.96} /></mesh>
    <mesh name="home-orb-stabilizer-ring-3" rotation={[0.78,1.1,-0.44]} castShadow><torusGeometry args={[0.395,0.011,16,128]} /><meshStandardMaterial color="#59686a" emissive="#42686b" emissiveIntensity={0.03} metalness={0.78} roughness={0.37} envMapIntensity={0.96} /></mesh>
    <group name="home-orb-crystalline-fragments">
      {ORB_FRAGMENT_LAYOUT.map(([position,rotation,scale],index)=><mesh key={index} position={position as [number,number,number]} rotation={rotation as [number,number,number]} scale={scale} castShadow>
        <tetrahedronGeometry args={[1,0]} />
        <meshPhysicalMaterial color={index % 2 === 0 ? '#8fa7a3' : '#858f92'} emissive={stateColor} emissiveIntensity={0.045} roughness={0.42} metalness={0.36} clearcoat={0.34} clearcoatRoughness={0.36} envMapIntensity={0.98} />
      </mesh>)}
    </group>
    <mesh name="home-orb-state-light" position={[0,-0.025,0.285]}><sphereGeometry args={[0.026,20,20]} /><meshStandardMaterial color="#e3dfd2" emissive={stateColor} emissiveIntensity={stateIntensity} roughness={0.36} metalness={0.05} /></mesh>
    <pointLight color={stateColor} intensity={stateIntensity * 0.58} distance={4.4} decay={2} />
  </group>
}

function OrbPlatform() {
  const outerPack = useWeatheredStonePack(2.15, 337)
  const innerPack = useWeatheredStonePack(1.45, 389)
  return <group name="home-sanctuary-pavilion" position={[0,0,-2.65]} userData={{ visualOwner:'photographic-obsidian-ritual-platform-v15' }}>
    <mesh position={[0,0.085,0]} castShadow receiveShadow><cylinderGeometry args={[2.26,2.34,0.17,128]} /><StoneMaterial pack={outerPack} color="#292f2d" bumpScale={0.052} /></mesh>
    <mesh position={[0,0.18,0]} rotation={[Math.PI/2,0,0]}><ringGeometry args={[1.66,1.68,160]} /><meshStandardMaterial color="#85765a" emissive="#54462f" emissiveIntensity={0.035} metalness={0.64} roughness={0.42} /></mesh>
    <mesh position={[0,0.184,0]} rotation={[Math.PI/2,0,0]}><ringGeometry args={[0.84,0.855,160]} /><meshStandardMaterial color="#719c9e" emissive="#476f72" emissiveIntensity={0.045} metalness={0.58} roughness={0.4} /></mesh>
    <mesh position={[0,0.145,0]} castShadow receiveShadow><cylinderGeometry args={[1.05,1.09,0.12,128]} /><StoneMaterial pack={innerPack} color="#353a38" bumpScale={0.042} /></mesh>
  </group>
}

function HumanPresence({ root }: { root: MutableRefObject<THREE.Group | null> }) {
  const human = useGLTF(HUMAN)
  const model = useMemo(() => cloneAuthoredModel(human.scene), [human.scene])
  return <group ref={root} name="home-authored-embodied-self" position={SPAWN} rotation={[0,Math.PI,0]} userData={{ presentation:'privacy-preserving-first-person-presence' }}><primitive object={model} visible={false} scale={0.72} /></group>
}

function PortalMembrane({ color }: { color: string }) {
  return <group position={[0,1.34,0.1]}>
    <mesh scale={[0.78,1.12,1]}><circleGeometry args={[1,64]} /><meshPhysicalMaterial color={color} emissive={color} emissiveIntensity={0.025} transparent opacity={0.012} transmission={0.82} roughness={0.34} metalness={0} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    <pointLight color={color} intensity={0.08} distance={3.2} decay={2} />
  </group>
}

function DestinationArch({ tone }: { tone: 'ground' | 'life-map' }) {
  const color = tone === 'ground' ? '#72a6a8' : '#7770b5'
  return <group userData={{ treatment:'recessed-obsidian-descent-v15' }}>
    <mesh position={[0,0.045,0]} castShadow receiveShadow><boxGeometry args={[1.9,0.09,1.16]} /><meshPhysicalMaterial color="#202725" roughness={0.86} metalness={0.08} clearcoat={0.04} clearcoatRoughness={0.8} envMapIntensity={0.48} /></mesh>
    <mesh position={[0,0.096,-0.08]}><boxGeometry args={[1.18,0.012,0.5]} /><meshBasicMaterial color="#070a0a" /></mesh>
    <mesh position={[-0.66,0.102,0.12]}><boxGeometry args={[0.035,0.014,0.52]} /><meshStandardMaterial color="#799a98" emissive={color} emissiveIntensity={0.14} metalness={0.36} roughness={0.44} /></mesh>
    <mesh position={[0.66,0.102,0.12]}><boxGeometry args={[0.035,0.014,0.52]} /><meshStandardMaterial color="#799a98" emissive={color} emissiveIntensity={0.14} metalness={0.36} roughness={0.44} /></mesh>
    <PortalMembrane color={color} />
  </group>
}

function LifeMapPortal({ onActivate }: { onActivate: () => void }) {
  const portal = useGLTF(PORTAL_MODEL)
  const model = useMemo(() => cloneAuthoredModel(portal.scene), [portal.scene])
  return <group name="home-life-map-physical-portal" position={LIFE_MAP} rotation={[0,-0.12,0]} userData={{ runtimeAsset:PORTAL_MODEL, treatment:'authored-portal-physical-threshold-v15' }}>
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
    camera.far = 180
    camera.updateProjectionMatrix()
    camera.position.set(2.42,1.64,8.12)
    camera.lookAt(0.25,1.22,-2.9)
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
    const backDistance=portrait?0.11:0.2
    const eyeHeight=portrait?1.5:1.6
    const desired=pos.current.clone().add(new THREE.Vector3(Math.sin(yaw.current)*backDistance,eyeHeight,Math.cos(yaw.current)*backDistance))
    camera.position.lerp(desired,1-Math.pow(0.00065,delta))
    const look=pos.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current)*9.2,1.24+pitch.current,-Math.cos(yaw.current)*9.2))
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
    <color attach="background" args={[cosmic?'#01030a':'#0a1217']} />
    <fogExp2 attach="fog" args={[cosmic?'#060918':'#182326',cosmic?0.0022:0.016]} />
    {!cosmic?<SkyDome />:null}
    {cosmic?<Stars radius={190} depth={100} count={2800} factor={3} saturation={0.05} fade speed={props.reducedMotion?0:0.008} />:null}
    <PhysicalEnvironment />
    <ambientLight intensity={0.25} color="#bdc8c7" />
    <hemisphereLight args={['#8da1a8','#11120f',0.48]} />
    <directionalLight position={[-14,18,10]} intensity={1.55} color="#d2dfe1" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-bias={-0.0001} />
    <directionalLight position={[11,7,-13]} intensity={0.22} color="#5a747f" />
    <directionalLight position={[-5,4,9]} intensity={0.16} color="#9e8059" />
    <spotLight position={[0,8,5]} intensity={0.34} color="#e2ded4" distance={26} angle={0.48} penumbra={0.98} decay={2} castShadow />
    <ArchitecturalPracticals />
    <RitualFloor target={props.target} />
    <MoonAndMist reducedMotion={props.reducedMotion} />
    <OrbPlatform />
    <SacredOrb state={props.orbState} reducedMotion={props.reducedMotion} onOpen={props.onOrb} />
    <HumanPresence root={props.avatar} />
    <Thresholds onGround={props.onGround} onLifeMap={props.onLifeMap} />
    <ContactShadows position={[0,0.02,-2.3]} opacity={0.42} scale={17} blur={2.2} far={6} resolution={256} frames={1} color="#050706" />
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
  const pitch=useRef(-0.055)
  const target=useRef<THREE.Vector3|null>(null)
  const avatar=useRef<THREE.Group|null>(null)
  const markSceneReady=useCallback(()=>setSceneReady(true),[])

  const openOrb=useCallback(()=>{if(!useSceneStore.getState().inputLocked&&transition==='none'){setOrbState('attention');onOrbOpen()}},[onOrbOpen,transition])
  const ground=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('ground')},[transition])
  const lifeMap=useCallback(()=>{if(transition!=='none')return;target.current=null;setOrbState('transition');setTransition('life-map');useSceneStore.getState().enterLifeMap()},[transition])
  const interact=useCallback(()=>{if(nearby==='orb')openOrb();else if(nearby==='ground')ground();else if(nearby==='life-map')lifeMap()},[nearby,openOrb,ground,lifeMap])
  const input=useMovementInput({enabled:transition==='none',onInteract:interact,onReset:()=>{target.current=SPAWN.clone();yaw.current=DEFAULT_YAW;pitch.current=-0.055}})
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

  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="moonlit-sacred-tech-sanctuary" data-home-world-character="premium-cinematic-sacred-tech" data-home-physical-base="authored-obsidian-ritual-platform" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="makehuman-v4" data-home-presence-presentation="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-audio="production-opus-consent-controlled" data-home-visual-grade="cinematic-pbr-v15-photographic-sanctuary" data-home-pbr-environment="local-lightformer-ibl" data-home-assets-ready={ready?'true':'false'} data-home-runtime-assets="home-entry-chamber-v1.glb home-human-makehuman-v4.glb urai-orb-avatar-v1.glb portal-ring-master-v1.glb authored-sacred-tech-composite" data-home-scenery-assets="polyhaven-fern-02-geometry-v1.glb weathered-obsidian-microdetail-v15 fog-carried-horizon-v15 low-density-depth-mist-v15" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby??'none'} data-home-camera-mode={transition!=='none'?transition:dragging?'look':'embodied-third-person'} data-home-scene-phase={transition==='none'?'HOME':transition.toUpperCase()} data-home-input-locked={transition!=='none'?'true':'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState,reducedMotion,true).animation} data-home-orb-model-clip={reducedMotion?'stopped-reduced-motion':ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{position:'relative',overflow:'hidden',background:'#0a1217'}} {...look}>
    <Canvas className={styles.canvas} dpr={[1,1.5]} shadows camera={{position:[2.42,1.64,8.12],fov:39,near:0.1,far:180}} gl={{antialias:true,alpha:false,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;gl.toneMappingExposure=1.22;gl.shadowMap.type=THREE.PCFSoftShadowMap;setCanvasReady(true)}}>
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
