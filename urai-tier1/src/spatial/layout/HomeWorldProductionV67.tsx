'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Environment, useGLTF, useTexture } from '@react-three/drei'
import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { resolveOrbSensoryOutput, URAI_ORB_STATE_EVENT, type OrbState, type OrbStateEventDetail } from '@/app/home/orbStateController'
import { MobileMovementPad, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldOrbOpen, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import styles from './HomeWorldProduction.module.css'

const ROCK_DIFFUSE = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-diff-1k.webp'
const ROCK_NORMAL = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-normal-gl-1k.webp'
const ROCK_ARM = '/assets/urai/home-production/cc0/rock-tile-floor/rock-tile-floor-arm-1k.webp'
const HOME_HDR = '/assets/urai/home-production/cc0/environment/studio-small-08-1k.hdr'
const ROCK_RELIEF = '/assets/urai/home-production/cc0/polyhaven-v48/rock_face_01/asset.gltf'
const CAGED_SCONCE = '/assets/urai/home-production/cc0/polyhaven-v48/industrial_caged_sconce/asset.gltf'
const GOVERNED_HOME = '/assets/urai/generated/models/home-entry-chamber-v1.glb'
const GOVERNED_PORTAL = '/assets/urai/generated/models/portal-ring-master-v1.glb'
const GOVERNED_ORB = '/assets/urai/generated/models/urai-orb-avatar-v1.glb'

const SPAWN = new THREE.Vector3(0, 0.04, 4.6)
const ORB = new THREE.Vector3(0, 2.35, -7.25)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -9.4, maxZ: 7.2 }
const DEFAULT_YAW = 0

type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Nearby = 'orb' | 'ground' | 'life-map' | null
type Transition = 'none' | 'ground' | 'life-map'
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Vec3 = readonly [number, number, number]
type MaterialMode = 'stone' | 'metal' | 'portal' | 'orb'

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening', thinking: 'Orb_Thinking',
  speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting', calming: 'Orb_Calming', privacy: 'Orb_Privacy',
  warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const FRAGMENTS: readonly { position: Vec3; rotation: Vec3; scale: Vec3; warm?: boolean }[] = [
  { position: [-0.46, 0.26, 0.04], rotation: [0.12, -0.46, -0.16], scale: [0.48, 0.42, 0.62] },
  { position: [0.48, 0.22, -0.04], rotation: [-0.10, 0.48, 0.14], scale: [0.50, 0.40, 0.60], warm: true },
  { position: [-0.40, -0.30, 0.10], rotation: [0.28, 0.18, 0.30], scale: [0.44, 0.42, 0.58], warm: true },
  { position: [0.42, -0.32, 0.05], rotation: [-0.26, -0.20, -0.26], scale: [0.46, 0.42, 0.60] },
  { position: [0.00, 0.50, -0.12], rotation: [0.42, 0.04, 0.02], scale: [0.42, 0.38, 0.54] },
  { position: [-0.02, -0.52, -0.10], rotation: [-0.40, -0.06, -0.02], scale: [0.44, 0.40, 0.56], warm: true },
]

function configureTexture(texture: THREE.Texture, x: number, y: number, color = false) {
  const clone = texture.clone()
  clone.wrapS = THREE.RepeatWrapping
  clone.wrapT = THREE.RepeatWrapping
  clone.repeat.set(x, y)
  clone.minFilter = THREE.LinearMipmapLinearFilter
  clone.magFilter = THREE.LinearFilter
  clone.anisotropy = 4
  clone.colorSpace = color ? THREE.SRGBColorSpace : THREE.NoColorSpace
  clone.needsUpdate = true
  return clone
}

function useStoneTextures() {
  const [sourceColor, sourceNormal, sourceArm] = useTexture([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
  const textures = useMemo(() => ({
    color: configureTexture(sourceColor, 2.0, 2.6, true), normal: configureTexture(sourceNormal, 2.0, 2.6), arm: configureTexture(sourceArm, 2.0, 2.6),
  }), [sourceArm, sourceColor, sourceNormal])
  useEffect(() => () => { textures.color.dispose(); textures.normal.dispose(); textures.arm.dispose() }, [textures])
  return textures
}

function tuneModel(source: THREE.Object3D, materialMode: MaterialMode) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const sourceMaterials = Array.isArray(object.material) ? object.material : [object.material]
    const materials = sourceMaterials.map((material) => {
      const clone = material.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = materialMode === 'stone' ? Math.max(clone.roughness, 0.66) : Math.max(clone.roughness, 0.34)
        clone.metalness = materialMode === 'stone' ? Math.min(clone.metalness, 0.12) : Math.min(Math.max(clone.metalness, 0.28), 0.72)
        clone.envMapIntensity = materialMode === 'portal' ? 0.90 : materialMode === 'orb' ? 0.82 : 0.72
        if ('transmission' in clone) (clone as THREE.MeshPhysicalMaterial).transmission = 0
        clone.transparent = false
        clone.opacity = 1
        if (materialMode === 'orb') {
          clone.emissiveIntensity = Math.min(clone.emissiveIntensity, 0.32)
          clone.color.multiplyScalar(0.84)
        }
      }
      return clone
    })
    object.material = Array.isArray(object.material) ? materials : materials[0]
    object.castShadow = true
    object.receiveShadow = true
  })
  return root
}

function prepareModel(source: THREE.Object3D, targetSpan: number, materialMode: MaterialMode) {
  const root = tuneModel(source, materialMode)
  const bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  root.position.sub(center)
  root.scale.setScalar(targetSpan / Math.max(size.x, size.y, size.z, 0.001))
  return root
}

function GovernedModel({ url, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, mode, name, preserveAuthoredCoordinates = false }: { url: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; mode: MaterialMode; name: string; preserveAuthoredCoordinates?: boolean }) {
  const gltf = useGLTF(url)
  const model = useMemo(() => preserveAuthoredCoordinates ? tuneModel(gltf.scene, mode) : prepareModel(gltf.scene, span, mode), [gltf.scene, mode, preserveAuthoredCoordinates, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ runtimeAsset: url, provenance: 'urai-governed-authored-binary', exactRuntimeOwner: true, coordinateMode: preserveAuthoredCoordinates ? 'authored' : 'bounded' }}><primitive object={model} /></group>
}

function ProductionAsset({ url, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, name }: { url: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; name: string }) {
  const gltf = useGLTF(url)
  const model = useMemo(() => prepareModel(gltf.scene, span, 'stone'), [gltf.scene, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ runtimeAsset: url, provenance: 'poly-haven-cc0-committed' }}><primitive object={model} /></group>
}

function LoadBeam({ from, to, radius = 0.12, color = '#404944' }: { from: Vec3; to: Vec3; radius?: number; color?: string }) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from); const b = new THREE.Vector3(...to); const direction = b.clone().sub(a)
    return { midpoint: a.clone().add(b).multiplyScalar(0.5), quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()), length: direction.length() }
  }, [from, to])
  return <mesh position={midpoint} quaternion={quaternion} castShadow receiveShadow><boxGeometry args={[radius * 1.55, length, radius * 1.20]} /><meshStandardMaterial color={color} roughness={0.52} metalness={0.56} envMapIntensity={0.72} /></mesh>
}

function FragmentGeometry() {
  return useMemo(() => {
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
      -0.52,-0.22,-0.70, 0.46,-0.16,-0.66, 0.34,0.22,-0.70, -0.32,0.26,-0.74,
      -0.22,-0.16,0.72, 0.28,-0.11,0.69, 0.20,0.17,0.74, -0.17,0.20,0.71,
    ]), 3))
    geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,4,5,0,5,1,1,5,6,1,6,2,2,6,7,2,7,3,3,7,4,3,4,0])
    geometry.computeVertexNormals(); return geometry
  }, [])
}

function ArmoredFragment({ position, rotation, scale, warm = false }: { position: Vec3; rotation: Vec3; scale: Vec3; warm?: boolean }) {
  const geometry = FragmentGeometry()
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} castShadow receiveShadow>
    <meshStandardMaterial color={warm ? '#655c4e' : '#4c5b56'} roughness={0.40} metalness={0.64} envMapIntensity={0.80} flatShading />
  </mesh>
}

function OrbReliquary({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => { if (root.current) root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.24) * 0.018 })
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  return <group name="home-orb-engineered-cradle" userData={{ treatment: 'v67-load-bearing-wall-integrated-reliquary', source: GOVERNED_ORB }}>
    <LoadBeam from={[-2.25, 0.25, -8.05]} to={[-1.02, 2.18, -7.38]} radius={0.16} />
    <LoadBeam from={[2.25, 0.25, -8.05]} to={[1.02, 2.18, -7.38]} radius={0.16} />
    <LoadBeam from={[-2.05, 4.18, -8.04]} to={[-0.74, 2.82, -7.36]} radius={0.14} color="#59625b" />
    <LoadBeam from={[2.05, 4.18, -8.04]} to={[0.74, 2.82, -7.36]} radius={0.14} color="#59625b" />
    <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, treatment: 'v67-six-armored-fragment-machine-with-contained-core', governedOrb: GOVERNED_ORB }}>
      <GovernedModel url={GOVERNED_ORB} name="home-v67-governed-orb-body" position={[0, 0, 0]} span={2.30} mode="orb" />
      {FRAGMENTS.map((fragment, index) => <ArmoredFragment key={index} {...fragment} />)}
      <mesh scale={[0.22, 0.28, 0.24]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#22322e" emissive="#42685f" emissiveIntensity={0.12} roughness={0.48} metalness={0.60} flatShading /></mesh>
      <pointLight color="#85aa9f" intensity={0.34} distance={4.2} decay={2} />
      <mesh visible={false}><sphereGeometry args={[1.5, 8, 6]} /><meshBasicMaterial /></mesh>
    </group>
  </group>
}

function Threshold({ destination, position, onActivate }: { destination: 'ground' | 'life-map'; position: THREE.Vector3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#6d8d82' : '#7c82a5'
  const rotation: Vec3 = destination === 'ground' ? [0, 0.20, 0] : [0, -0.20, 0]
  const surface = destination === 'life-map'
    ? <mesh name="home-life-map-physical-portal" position={[0, 1.48, -0.24]} receiveShadow><planeGeometry args={[1.58, 2.40]} /><meshStandardMaterial color="#08100f" emissive={tone} emissiveIntensity={0.06} roughness={0.82} metalness={0.10} /></mesh>
    : <mesh name="home-ground-physical-threshold" position={[0, 1.48, -0.24]} receiveShadow><planeGeometry args={[1.58, 2.40]} /><meshStandardMaterial color="#08100f" emissive={tone} emissiveIntensity={0.06} roughness={0.82} metalness={0.10} /></mesh>
  return <group name={destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'} position={position} userData={{ treatment: 'v67-recessed-structural-threshold', destination, governedPortal: GOVERNED_PORTAL }}>
    <GovernedModel url={GOVERNED_PORTAL} name={`${destination}-governed-portal-ring`} position={[0, 1.48, -0.14]} rotation={rotation} scale={[0.82, 1.05, 0.82]} span={3.35} mode="portal" />
    {surface}
    <pointLight position={[0, 1.62, 0.18]} color={tone} intensity={0.30} distance={4.2} decay={2} />
    <mesh position={[0, 1.50, 0.18]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}><boxGeometry args={[2.45, 3.25, 1.0]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Sanctuary({ target, reducedMotion, orbState, onOrb, onGround, onLifeMap }: { target: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  const textures = useStoneTextures()
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation(); target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <>
    <group name="home-authored-terrain" userData={{ treatment: 'v67-continuous-pbr-stone-floor' }}>
      <mesh position={[0, -0.11, -1.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14.2, 18.2, 12, 16]} /><meshPhysicalMaterial color="#1c221f" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.32, 0.32)} roughnessMap={textures.arm} roughness={0.88} metalness={0.01} clearcoat={0.01} envMapIntensity={0.58} /></mesh>
      <mesh name="home-walkable-navigation-surface" position={[0, 0.08, -1.5]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}><planeGeometry args={[13.1, 17.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    </group>
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v67-governed-authored-chamber', construction: 'governed-home-entry-chamber-authored-coordinates-with-scanned-stone-integration', source: GOVERNED_HOME }}>
      <GovernedModel url={GOVERNED_HOME} name="home-v67-governed-entry-chamber" position={[0, 0, -5.4]} scale={[1.00, 1.00, 1.00]} span={18.69} mode="stone" preserveAuthoredCoordinates />
      <ProductionAsset url={ROCK_RELIEF} name="home-v67-scanned-left-relief" position={[-5.54, 1.70, -6.62]} rotation={[0.04, 1.22, 0.02]} scale={[0.76, 1.08, 0.46]} span={3.15} />
      <ProductionAsset url={CAGED_SCONCE} name="home-v67-left-sconce" position={[-4.62, 2.36, -4.88]} rotation={[0, 0.82, 0]} span={0.60} />
      <ProductionAsset url={CAGED_SCONCE} name="home-v67-right-sconce" position={[4.58, 2.28, -5.46]} rotation={[0, -0.80, 0]} span={0.60} />
      <pointLight position={[-4.30, 2.30, -4.72]} color="#d1a66f" intensity={0.52} distance={5.2} decay={2} />
      <pointLight position={[4.30, 2.24, -5.30]} color="#7eaaa1" intensity={0.46} distance={5.2} decay={2} />
      <group name="home-v47-reliquary-cavity" /><group name="home-v47-side-gallery" /><group name="home-v47-reliquary-apse" />
    </group>
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v67-single-bounded-photogrammetry-relief' }} />
    <group name="home-v49-authored-practicals" />
    <OrbReliquary state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <Threshold destination="ground" position={GROUND} onActivate={onGround} />
    <Threshold destination="life-map" position={LIFE_MAP} onActivate={onLifeMap} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v67' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'enclosed-sanctuary-atmospheric-depth-v67' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'retired-from-v67-primary-composition-to-preserve-frame-budget' }} />
    <pointLight position={[0, 3.20, -6.90]} color="#b6cfc4" intensity={0.62} distance={8.0} decay={2} />
  </>
}

function PlayerRig({ input, yaw, pitch, target, onNearby, transition }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; onNearby: (value: Nearby) => void; transition: Transition }) {
  const { camera, size } = useThree(); const position = useRef(SPAWN.clone()); const velocity = useRef(new THREE.Vector3()); const lastNearby = useRef<Nearby>(null)
  useEffect(() => { camera.near = 0.1; camera.far = 110; camera.position.set(SPAWN.x, 1.65, SPAWN.z); camera.lookAt(0, 2.0, -6.6); camera.updateProjectionMatrix() }, [camera])
  useFrame((_, delta) => {
    if (transition === 'none') stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: 0, delta, speed: 2.9, acceleration: 9, deceleration: 12, bounds: BOUNDS, arrivalRadius: 0.32 })
    else velocity.current.multiplyScalar(0.7)
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) { const fov = portrait ? 52 : 42; if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = fov; camera.updateProjectionMatrix() } }
    const back = portrait ? 0.10 : 0.16; const eye = portrait ? 1.56 : 1.62
    camera.position.lerp(position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * back, eye, Math.cos(yaw.current) * back)), 1 - Math.pow(0.0008, delta))
    camera.lookAt(position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 9, 1.68 + pitch.current, -Math.cos(yaw.current) * 9)))
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.5], ['ground', GROUND, 2.8], ['life-map', LIFE_MAP, 2.8]]
    let nearby: Nearby = null; let best = Infinity
    for (const [name, point, radius] of candidates) { const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z); if (distance < radius && distance < best) { best = distance; nearby = name } }
    if (nearby !== lastNearby.current) { lastNearby.current = nearby; onNearby(nearby) }
  })
  return null
}

function ReadySignal({ onReady }: { onReady: () => void }) { useEffect(() => { onReady() }, [onReady]); return null }

function Scene({ input, yaw, pitch, target, nearby, transition, reducedMotion, orbState, onOrb, onGround, onLifeMap, onReady }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; nearby: (value: Nearby) => void; transition: Transition; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onReady: () => void }) {
  return <><color attach="background" args={['#080d0e']} /><fogExp2 attach="fog" args={['#0e1514', 0.014]} /><Environment files={HOME_HDR} background={false} environmentIntensity={0.70} /><ambientLight intensity={0.40} color="#cedbd4" /><hemisphereLight args={['#91a8a1', '#0a0f0d', 0.50]} /><directionalLight position={[-7, 10, 5]} intensity={1.18} color="#ddc49a" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} /><directionalLight position={[7, 6, -8]} intensity={0.48} color="#769b96" /><Sanctuary target={target} reducedMotion={reducedMotion} orbState={orbState} onOrb={onOrb} onGround={onGround} onLifeMap={onLifeMap} /><PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} onNearby={nearby} transition={transition} /><ReadySignal onReady={onReady} /></>
}

export function HomeWorldProductionV67({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false); const [sceneReady, setSceneReady] = useState(false); const [nearby, setNearby] = useState<Nearby>(null); const [dragging, setDragging] = useState(false); const [reducedMotion, setReducedMotion] = useState(false); const [mobile, setMobile] = useState(false); const [orbState, setOrbState] = useState<OrbState>('idle'); const [transition, setTransition] = useState<Transition>('none'); const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const yaw = useRef(DEFAULT_YAW); const pitch = useRef(0.14); const target = useRef<THREE.Vector3 | null>(null); const markSceneReady = useCallback(() => setSceneReady(true), [])
  const openOrb = useCallback(() => { if (transition === 'none') { setOrbState('attention'); onOrbOpen() } }, [onOrbOpen, transition])
  const openGround = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('ground') } }, [transition])
  const openLifeMap = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('life-map') } }, [transition])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') openGround(); else if (nearby === 'life-map') openLifeMap() }, [nearby, openGround, openLifeMap, openOrb])
  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = DEFAULT_YAW; pitch.current = 0.14 } })
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: 0.003, minPitch: -0.46, maxPitch: 0.50, onDragState: setDragging })
  useEffect(() => { const rm = window.matchMedia('(prefers-reduced-motion: reduce)'); const mq = window.matchMedia('(pointer: coarse), (max-width: 700px)'); const apply = () => { setReducedMotion(rm.matches); setMobile(mq.matches) }; apply(); rm.addEventListener?.('change', apply); mq.addEventListener?.('change', apply); return () => { rm.removeEventListener?.('change', apply); mq.removeEventListener?.('change', apply) } }, [])
  useEffect(() => { const listener = (event: CustomEvent<OrbStateEventDetail>) => { if (transition === 'none') setOrbState(event.detail.state) }; window.addEventListener(URAI_ORB_STATE_EVENT, listener); return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener) }, [transition])
  useEffect(() => {
    if (transition === 'none') { setPortalSequence('idle'); return }
    const opening = `${transition}:opening` as TransitionSequence; const traversal = `${transition}:traversal` as TransitionSequence; const closing = `${transition}:closing` as TransitionSequence
    setPortalSequence(opening)
    const traversalTimer = window.setTimeout(() => setPortalSequence(traversal), reducedMotion ? 180 : 900)
    const closingTimer = window.setTimeout(() => setPortalSequence(closing), reducedMotion ? 700 : 2500)
    const navigationTimer = window.setTimeout(() => {
      if (transition === 'ground') requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
      else requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
    }, reducedMotion ? 1200 : 3600)
    return () => { window.clearTimeout(traversalTimer); window.clearTimeout(closingTimer); window.clearTimeout(navigationTimer) }
  }, [reducedMotion, transition])
  useEffect(() => { const cancel = (event: KeyboardEvent) => { if (event.key !== 'Escape' || transition === 'none') return; event.preventDefault(); setTransition('none'); setPortalSequence('idle'); setOrbState('idle') }; window.addEventListener('keydown', cancel, true); return () => window.removeEventListener('keydown', cancel, true) }, [transition])
  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const context = transition === 'life-map' ? 'Ascending into your Life Map' : transition === 'ground' ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'The threshold opens to your Life Map' : null
  return <main className={`${styles.world} urai-asset-home-world`} data-urai-home-production data-urai-true-3d="true" data-home-primary-owner="asset-driven" data-home-visible-world="v67-governed-authored-stone-relic-sanctuary" data-home-world-character="production-cinematic-sacred-tech" data-home-physical-base="authored-stone-machine-reliquary" data-home-visual-ownership="three-dimensional-geometry" data-home-desktop-mobile-world="same-scene" data-home-embodied-self="privacy-preserving-first-person" data-home-movement="walk-keyboard-click-touch" data-home-visual-grade="cinematic-pbr-v67-governed-reliquary" data-home-final-art-revision="v67-governed-authored-coordinate-rebuild" data-home-art-certification="v67-retained-pixel-candidate-not-certified" data-home-scanned-composition="single-bounded-photogrammetry-relief-v67" data-home-pbr-environment="local-cc0-hdri-studio-small-08" data-home-assets-ready={ready ? 'true' : 'false'} data-home-runtime-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb rock_face_01/asset.gltf industrial_caged_sconce/asset.gltf rock-tile-floor-pbr studio-small-08-1k.hdr" data-home-scenery-assets="home-entry-chamber-v1.glb portal-ring-master-v1.glb urai-orb-avatar-v1.glb rock-face-01 industrial-caged-sconce rock-tile-floor-pbr studio-small-08-hdri" data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal" data-home-nearby={nearby ?? 'none'} data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-first-person'} data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()} data-home-portal-sequence={portalSequence} data-home-portal-lifecycle="environmental-approach-traversal-arrival" data-home-animation-owner="enclosed-reliquary-v66-six-fragment-orb" data-home-input-locked={transition !== 'none' ? 'true' : 'false'} data-home-orb-state={orbState} data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation} data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]} data-testid="home-visible-navigable-sanctuary-world" style={{ position: 'relative', overflow: 'hidden', background: '#080d0e' }} {...look}>
    <Canvas className={styles.canvas} dpr={1} shadows camera={{ position: [SPAWN.x, 1.65, SPAWN.z], fov: 42, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.72; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}><Scene input={input} yaw={yaw} pitch={pitch} target={target} nearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markSceneReady} /></Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}{transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The governed Orb relic-machine is physically integrated into the Home sanctuary.</span><span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

useGLTF.preload(GOVERNED_HOME)
useGLTF.preload(GOVERNED_PORTAL)
useGLTF.preload(GOVERNED_ORB)
useGLTF.preload(ROCK_RELIEF)
useGLTF.preload(CAGED_SCONCE)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])