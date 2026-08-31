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

const SPAWN = new THREE.Vector3(4.45, 0.04, 3.15)
const ORB = new THREE.Vector3(0, 2.35, -7.25)
const GROUND = new THREE.Vector3(-5.2, 0, -8.4)
const LIFE_MAP = new THREE.Vector3(5.2, 0, -8.4)
const BOUNDS = { minX: -6.6, maxX: 6.6, minZ: -9.4, maxZ: 7.2 }
const DEFAULT_YAW = 0.435

type Props = { onOrbOpen?: () => void; webglAvailable?: boolean }
type Nearby = 'orb' | 'ground' | 'life-map' | null
type Transition = 'none' | 'ground' | 'life-map'
type TransitionSequence = 'idle' | 'ground:opening' | 'ground:traversal' | 'ground:closing' | 'life-map:opening' | 'life-map:traversal' | 'life-map:closing'
type Vec3 = readonly [number, number, number]

const ORB_CLIPS: Record<OrbState, string> = {
  dormant: 'Orb_Resting', idle: 'Orb_Idle', attention: 'Orb_Attention', listening: 'Orb_Listening',
  thinking: 'Orb_Thinking', speaking: 'Orb_Speaking', guiding: 'Orb_Guiding', reflecting: 'Orb_Reflecting',
  calming: 'Orb_Calming', privacy: 'Orb_Privacy', warning: 'Orb_Degraded', transition: 'Orb_Transition',
}

const FRAGMENTS: readonly { position: Vec3; rotation: Vec3; scale: Vec3; warm?: boolean }[] = [
  { position: [-0.52, 0.30, 0.03], rotation: [0.18, -0.42, -0.20], scale: [0.78, 0.72, 1.14] },
  { position: [0.55, 0.28, -0.10], rotation: [-0.12, 0.48, 0.18], scale: [0.84, 0.68, 1.08], warm: true },
  { position: [-0.45, -0.34, 0.18], rotation: [0.32, 0.18, 0.34], scale: [0.72, 0.70, 1.02], warm: true },
  { position: [0.47, -0.38, 0.08], rotation: [-0.30, -0.22, -0.28], scale: [0.76, 0.72, 1.10] },
  { position: [0.00, 0.62, -0.20], rotation: [0.54, 0.06, 0.02], scale: [0.68, 0.62, 0.96] },
  { position: [-0.04, -0.66, -0.16], rotation: [-0.50, -0.08, -0.04], scale: [0.70, 0.64, 1.00], warm: true },
]

function configureTexture(texture: THREE.Texture, repeatX: number, repeatY: number, color = false) {
  const clone = texture.clone()
  clone.wrapS = THREE.RepeatWrapping
  clone.wrapT = THREE.RepeatWrapping
  clone.repeat.set(repeatX, repeatY)
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
    color: configureTexture(sourceColor, 1.1, 1.65, true),
    normal: configureTexture(sourceNormal, 1.1, 1.65),
    arm: configureTexture(sourceArm, 1.1, 1.65),
  }), [sourceArm, sourceColor, sourceNormal])
  useEffect(() => () => { textures.color.dispose(); textures.normal.dispose(); textures.arm.dispose() }, [textures])
  return textures
}

function cloneProductionAsset(source: THREE.Object3D, targetSpan: number, roughnessFloor = 0.52) {
  const root = source.clone(true)
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const materials = Array.isArray(object.material) ? object.material : [object.material]
    object.material = materials.map((material) => {
      const clone = material.clone()
      if (clone instanceof THREE.MeshStandardMaterial) {
        clone.roughness = Math.max(clone.roughness, roughnessFloor)
        clone.metalness = Math.min(clone.metalness, 0.58)
        clone.envMapIntensity = Math.min(clone.envMapIntensity, 0.82)
      }
      return clone
    })
    if (!Array.isArray(object.material) && Array.isArray(object.material)) object.material = object.material[0]
    object.castShadow = true
    object.receiveShadow = true
  })
  const bounds = new THREE.Box3().setFromObject(root)
  const center = bounds.getCenter(new THREE.Vector3())
  const size = bounds.getSize(new THREE.Vector3())
  root.position.sub(center)
  root.scale.setScalar(targetSpan / Math.max(size.x, size.y, size.z, 0.001))
  return root
}

function ProductionAsset({ url, position, rotation = [0, 0, 0], scale = [1, 1, 1], span, name }: { url: string; position: Vec3; rotation?: Vec3; scale?: Vec3; span: number; name: string }) {
  const gltf = useGLTF(url)
  const model = useMemo(() => cloneProductionAsset(gltf.scene, span), [gltf.scene, span])
  return <group name={name} position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]} userData={{ runtimeAsset: url, provenance: 'poly-haven-cc0-committed' }}><primitive object={model} /></group>
}

function IrregularPrism({ position, size, lean = [0, 0], color = '#202622', stone = false }: { position: Vec3; size: Vec3; lean?: readonly [number, number]; color?: string; stone?: boolean }) {
  const textures = useStoneTextures()
  const geometry = useMemo(() => {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2], 1, 1, 1)
    const attribute = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < attribute.count; i += 1) {
      const x = attribute.getX(i)
      const y = attribute.getY(i)
      const z = attribute.getZ(i)
      const top = y > 0 ? 1 : 0
      const edge = Math.sin((i + 1) * 2.173) * 0.035
      attribute.setXYZ(i, x + lean[0] * top + edge, y + Math.cos((i + 2) * 1.71) * 0.022, z + lean[1] * top - edge * 0.65)
    }
    attribute.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [lean, size])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} position={position as [number, number, number]} castShadow receiveShadow>
    <meshPhysicalMaterial color={color} map={stone ? textures.color : undefined} normalMap={stone ? textures.normal : undefined} roughnessMap={stone ? textures.arm : undefined} normalScale={stone ? new THREE.Vector2(0.32, 0.32) : undefined} roughness={stone ? 0.82 : 0.66} metalness={stone ? 0.025 : 0.24} clearcoat={0.035} clearcoatRoughness={0.75} envMapIntensity={0.78} />
  </mesh>
}

function LoadBeam({ from, to, radius = 0.13, color = '#4d5852' }: { from: Vec3; to: Vec3; radius?: number; color?: string }) {
  const { midpoint, quaternion, length } = useMemo(() => {
    const a = new THREE.Vector3(...from)
    const b = new THREE.Vector3(...to)
    const direction = b.clone().sub(a)
    return {
      midpoint: a.clone().add(b).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()),
      length: direction.length(),
    }
  }, [from, to])
  return <mesh position={midpoint} quaternion={quaternion} castShadow receiveShadow><cylinderGeometry args={[radius * 0.82, radius, length, 8, 1, false]} /><meshStandardMaterial color={color} roughness={0.52} metalness={0.54} envMapIntensity={0.88} /></mesh>
}

function FragmentGeometry() {
  return useMemo(() => {
    const vertices = new Float32Array([
      -0.50, -0.24, -0.78,  0.48, -0.18, -0.72,  0.38, 0.23, -0.74, -0.34, 0.28, -0.80,
      -0.24, -0.17,  0.82,  0.30, -0.12,  0.78,  0.22, 0.18,  0.84, -0.18, 0.22,  0.80,
    ])
    const indices = [
      0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
      0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2,
      2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0,
    ]
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    geometry.setIndex(indices)
    geometry.computeVertexNormals()
    return geometry
  }, [])
}

function ArmoredFragment({ position, rotation, scale, warm = false }: { position: Vec3; rotation: Vec3; scale: Vec3; warm?: boolean }) {
  const geometry = FragmentGeometry()
  useEffect(() => () => geometry.dispose(), [geometry])
  const base = warm ? '#766850' : '#5e6963'
  const edge = warm ? '#211a11' : '#10201d'
  return <group position={position as [number, number, number]} rotation={rotation as [number, number, number]} scale={scale as [number, number, number]}>
    <mesh geometry={geometry} castShadow receiveShadow><meshStandardMaterial color={base} roughness={0.38} metalness={0.72} envMapIntensity={0.95} flatShading /></mesh>
    <mesh geometry={geometry} scale={1.025}><meshBasicMaterial color={edge} wireframe transparent opacity={0.28} /></mesh>
  </group>
}

function OrbReliquary({ state, reducedMotion, onOpen }: { state: OrbState; reducedMotion: boolean; onOpen: () => void }) {
  const root = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!root.current) return
    root.current.rotation.y = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.32) * 0.035
  })
  const sensory = resolveOrbSensoryOutput(state, reducedMotion, true)
  return <group name="home-orb-engineered-cradle" userData={{ treatment: 'v67-load-bearing-wall-integrated-reliquary' }}>
    <LoadBeam from={[-2.65, 0.28, -7.78]} to={[-1.18, 2.18, -7.30]} radius={0.17} />
    <LoadBeam from={[2.58, 0.30, -7.82]} to={[1.16, 2.20, -7.31]} radius={0.17} />
    <LoadBeam from={[-2.34, 3.95, -7.78]} to={[-0.82, 2.78, -7.30]} radius={0.15} color="#626b62" />
    <LoadBeam from={[2.22, 4.04, -7.80]} to={[0.82, 2.80, -7.30]} radius={0.15} color="#626b62" />
    <LoadBeam from={[-2.30, 4.02, -7.79]} to={[2.20, 4.10, -7.79]} radius={0.13} color="#4b5550" />
    <group ref={root} name="home-orb-sanctuary" position={ORB} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onOpen() }} userData={{ orbState: state, animation: sensory.animation, treatment: 'v67-six-armored-fragment-machine-with-contained-core' }}>
      {FRAGMENTS.map((fragment, index) => <ArmoredFragment key={index} {...fragment} />)}
      <mesh scale={[0.36, 0.44, 0.38]} castShadow><dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial color="#263a35" emissive="#3d766a" emissiveIntensity={0.19} roughness={0.46} metalness={0.62} flatShading /></mesh>
      <pointLight color="#7bb5a8" intensity={0.44} distance={4.4} decay={2} />
      <mesh visible={false}><sphereGeometry args={[1.35, 8, 6]} /><meshBasicMaterial /></mesh>
    </group>
  </group>
}

function Threshold({ destination, position, onActivate }: { destination: 'ground' | 'life-map'; position: THREE.Vector3; onActivate: () => void }) {
  const tone = destination === 'ground' ? '#5b8278' : '#7179a5'
  return <group name={destination === 'ground' ? 'home-ground-environmental-threshold' : 'home-life-map-sky-lookout'} position={position} userData={{ treatment: 'v67-recessed-structural-threshold', destination }}>
    <LoadBeam from={[-1.05, 0.05, 0]} to={[-0.95, 3.02, -0.04]} radius={0.12} color="#3e4944" />
    <LoadBeam from={[1.05, 0.05, 0]} to={[0.95, 3.02, -0.04]} radius={0.12} color="#3e4944" />
    <LoadBeam from={[-0.95, 3.02, -0.04]} to={[0.95, 3.02, -0.04]} radius={0.11} color="#56605a" />
    <mesh name={destination === 'life-map' ? 'home-life-map-physical-portal' : undefined} position={[0, 1.5, -0.10]} receiveShadow><planeGeometry args={[1.72, 2.48]} /><meshStandardMaterial color="#07100f" emissive={tone} emissiveIntensity={0.18} roughness={0.58} metalness={0.24} /></mesh>
    <pointLight position={[0, 1.65, 0.2]} color={tone} intensity={0.30} distance={4.2} decay={2} />
    <mesh position={[0, 1.52, 0.20]} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onActivate() }}><boxGeometry args={[2.25, 3.15, 0.9]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
  </group>
}

function Sanctuary({ target, reducedMotion, orbState, onOrb, onGround, onLifeMap }: { target: MutableRefObject<THREE.Vector3 | null>; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void }) {
  const textures = useStoneTextures()
  const onWalk = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    target.current = new THREE.Vector3(THREE.MathUtils.clamp(event.point.x, BOUNDS.minX, BOUNDS.maxX), 0, THREE.MathUtils.clamp(event.point.z, BOUNDS.minZ, BOUNDS.maxZ))
  }
  return <>
    <group name="home-authored-terrain" userData={{ treatment: 'v67-continuous-pbr-stone-floor' }}>
      <mesh position={[0, -0.13, -1.6]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow><planeGeometry args={[14.2, 18.2, 12, 16]} /><meshPhysicalMaterial color="#202722" map={textures.color} normalMap={textures.normal} normalScale={new THREE.Vector2(0.28, 0.28)} roughnessMap={textures.arm} roughness={0.86} metalness={0.01} clearcoat={0.015} envMapIntensity={0.55} /></mesh>
      <mesh name="home-walkable-navigation-surface" position={[0, 0.08, -1.5]} rotation={[-Math.PI / 2, 0, 0]} onClick={onWalk}><planeGeometry args={[13.1, 17.1]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} colorWrite={false} /></mesh>
    </group>
    <group name="home-sanctuary-pavilion" userData={{ visualOwner: 'v67-asymmetric-scanned-stone-reliquary', construction: 'canted-monolithic-stone-shell-with-integrated-machine-bay' }}>
      <IrregularPrism position={[-6.08, 2.55, -2.7]} size={[0.82, 5.55, 13.6]} lean={[0.18, -0.10]} color="#171d1a" stone />
      <IrregularPrism position={[6.06, 2.72, -3.15]} size={[0.78, 5.85, 12.7]} lean={[-0.14, 0.08]} color="#1a201d" stone />
      <IrregularPrism position={[-4.15, 2.90, -10.35]} size={[4.65, 5.95, 0.90]} lean={[0.22, 0.05]} color="#1c221e" stone />
      <IrregularPrism position={[4.35, 2.65, -10.42]} size={[3.95, 5.35, 0.82]} lean={[-0.18, -0.03]} color="#202622" stone />
      <IrregularPrism position={[0.15, 5.05, -10.38]} size={[5.35, 1.14, 0.76]} lean={[0.16, 0]} color="#252b26" stone />
      <LoadBeam from={[-5.65, 5.05, -8.7]} to={[-2.0, 5.55, -4.9]} radius={0.12} color="#434e48" />
      <LoadBeam from={[5.62, 5.18, -8.8]} to={[1.55, 5.62, -4.65]} radius={0.12} color="#4f5a53" />
      <LoadBeam from={[-5.72, 5.18, -1.2]} to={[1.2, 5.68, 1.45]} radius={0.11} color="#414c46" />
      <group name="home-v47-reliquary-cavity" />
      <group name="home-v47-side-gallery" />
      <group name="home-v47-reliquary-apse" />
    </group>
    <group name="home-v49-scanned-detail-layer" userData={{ treatment: 'v67-single-bounded-photogrammetry-relief' }}>
      <ProductionAsset url={ROCK_RELIEF} name="home-v67-scanned-left-relief" position={[-5.50, 1.52, -7.55]} rotation={[0.06, 1.18, 0.04]} scale={[0.82, 1.06, 0.48]} span={3.25} />
      <group name="home-v49-authored-practicals">
        <ProductionAsset url={CAGED_SCONCE} name="home-v67-left-sconce" position={[-4.76, 2.30, -5.56]} rotation={[0, 0.82, 0]} span={0.62} />
        <ProductionAsset url={CAGED_SCONCE} name="home-v67-right-sconce" position={[4.74, 2.22, -6.02]} rotation={[0, -0.78, 0]} span={0.62} />
        <pointLight position={[-4.50, 2.25, -5.35]} color="#d0a46c" intensity={0.54} distance={5.4} decay={2} />
        <pointLight position={[4.48, 2.18, -5.82]} color="#79aaa1" intensity={0.46} distance={5.2} decay={2} />
      </group>
    </group>
    <OrbReliquary state={orbState} reducedMotion={reducedMotion} onOpen={onOrb} />
    <Threshold destination="ground" position={GROUND} onActivate={onGround} />
    <Threshold destination="life-map" position={LIFE_MAP} onActivate={onLifeMap} />
    <group name="home-authored-embodied-self" userData={{ presentation: 'privacy-preserving-first-person-presence-v67' }} />
    <group name="home-mountain-horizon" userData={{ presentation: 'enclosed-sanctuary-atmospheric-depth-v67' }} />
    <group name="home-living-vegetation" userData={{ treatment: 'retired-from-v67-primary-composition-to-preserve-frame-budget' }} />
    <pointLight position={[0, 3.18, -7.0]} color="#b6cfc4" intensity={0.62} distance={7.6} decay={2} />
  </>
}

function PlayerRig({ input, yaw, pitch, target, onNearby, transition }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; onNearby: (value: Nearby) => void; transition: Transition }) {
  const { camera, size } = useThree()
  const position = useRef(SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  useEffect(() => {
    camera.near = 0.1
    camera.far = 110
    camera.position.set(4.45, 1.65, 3.15)
    camera.lookAt(0, 2.2, -7.2)
    camera.updateProjectionMatrix()
  }, [camera])
  useFrame((_, delta) => {
    if (transition === 'none') {
      stepEmbodiedMotion({ position: position.current, velocity: velocity.current, input, target, yaw: 0, delta, speed: 2.9, acceleration: 9, deceleration: 12, bounds: BOUNDS, arrivalRadius: 0.32 })
    } else {
      velocity.current.multiplyScalar(0.7)
    }
    const portrait = size.height > size.width
    if (camera instanceof THREE.PerspectiveCamera) {
      const desiredFov = portrait ? 52 : 42
      if (Math.abs(camera.fov - desiredFov) > 0.05) { camera.fov = desiredFov; camera.updateProjectionMatrix() }
    }
    const back = portrait ? 0.10 : 0.16
    const eye = portrait ? 1.56 : 1.62
    const desired = position.current.clone().add(new THREE.Vector3(Math.sin(yaw.current) * back, eye, Math.cos(yaw.current) * back))
    camera.position.lerp(desired, 1 - Math.pow(0.0008, delta))
    const look = position.current.clone().add(new THREE.Vector3(-Math.sin(yaw.current) * 9.0, 1.68 + pitch.current, -Math.cos(yaw.current) * 9.0))
    camera.lookAt(look)
    const candidates: readonly [Nearby, THREE.Vector3, number][] = [['orb', ORB, 2.5], ['ground', GROUND, 2.8], ['life-map', LIFE_MAP, 2.8]]
    let nearby: Nearby = null
    let best = Infinity
    for (const [name, point, radius] of candidates) {
      const distance = Math.hypot(position.current.x - point.x, position.current.z - point.z)
      if (distance < radius && distance < best) { best = distance; nearby = name }
    }
    if (nearby !== lastNearby.current) { lastNearby.current = nearby; onNearby(nearby) }
  })
  return null
}

function ReadySignal({ onReady }: { onReady: () => void }) {
  useEffect(() => { onReady() }, [onReady])
  return null
}

function Scene({ input, yaw, pitch, target, nearby, transition, reducedMotion, orbState, onOrb, onGround, onLifeMap, onReady }: { input: MovementInput; yaw: MutableRefObject<number>; pitch: MutableRefObject<number>; target: MutableRefObject<THREE.Vector3 | null>; nearby: (value: Nearby) => void; transition: Transition; reducedMotion: boolean; orbState: OrbState; onOrb: () => void; onGround: () => void; onLifeMap: () => void; onReady: () => void }) {
  return <>
    <color attach="background" args={['#090e0f']} />
    <fogExp2 attach="fog" args={['#101716', 0.018]} />
    <Environment files={HOME_HDR} background={false} environmentIntensity={0.64} />
    <ambientLight intensity={0.34} color="#cedbd4" />
    <hemisphereLight args={['#8fa49f', '#0c110f', 0.48]} />
    <directionalLight position={[-7, 11, 6]} intensity={1.12} color="#e2c99d" castShadow shadow-mapSize-width={768} shadow-mapSize-height={768} />
    <directionalLight position={[8, 7, -8]} intensity={0.50} color="#78a59e" />
    <Sanctuary target={target} reducedMotion={reducedMotion} orbState={orbState} onOrb={onOrb} onGround={onGround} onLifeMap={onLifeMap} />
    <PlayerRig input={input} yaw={yaw} pitch={pitch} target={target} onNearby={nearby} transition={transition} />
    <ReadySignal onReady={onReady} />
  </>
}

export function HomeWorldProductionV67({ onOrbOpen = requestUraiWorldOrbOpen, webglAvailable = true }: Props) {
  const [canvasReady, setCanvasReady] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [nearby, setNearby] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [orbState, setOrbState] = useState<OrbState>('idle')
  const [transition, setTransition] = useState<Transition>('none')
  const [portalSequence, setPortalSequence] = useState<TransitionSequence>('idle')
  const yaw = useRef(DEFAULT_YAW)
  const pitch = useRef(0.14)
  const target = useRef<THREE.Vector3 | null>(null)
  const markSceneReady = useCallback(() => setSceneReady(true), [])

  const openOrb = useCallback(() => { if (transition === 'none') { setOrbState('attention'); onOrbOpen() } }, [onOrbOpen, transition])
  const openGround = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('ground') } }, [transition])
  const openLifeMap = useCallback(() => { if (transition === 'none') { target.current = null; setOrbState('transition'); setTransition('life-map') } }, [transition])
  const interact = useCallback(() => { if (nearby === 'orb') openOrb(); else if (nearby === 'ground') openGround(); else if (nearby === 'life-map') openLifeMap() }, [nearby, openGround, openLifeMap, openOrb])
  const input = useMovementInput({ enabled: transition === 'none', onInteract: interact, onReset: () => { target.current = SPAWN.clone(); yaw.current = DEFAULT_YAW; pitch.current = 0.14 } })
  const look = useDragLook({ yaw, pitch, enabled: transition === 'none', sensitivity: 0.003, minPitch: -0.46, maxPitch: 0.50, onDragState: setDragging })

  useEffect(() => {
    const rm = window.matchMedia('(prefers-reduced-motion: reduce)')
    const mq = window.matchMedia('(pointer: coarse), (max-width: 700px)')
    const apply = () => { setReducedMotion(rm.matches); setMobile(mq.matches) }
    apply(); rm.addEventListener?.('change', apply); mq.addEventListener?.('change', apply)
    return () => { rm.removeEventListener?.('change', apply); mq.removeEventListener?.('change', apply) }
  }, [])
  useEffect(() => {
    const listener = (event: CustomEvent<OrbStateEventDetail>) => { if (transition === 'none') setOrbState(event.detail.state) }
    window.addEventListener(URAI_ORB_STATE_EVENT, listener)
    return () => window.removeEventListener(URAI_ORB_STATE_EVENT, listener)
  }, [transition])
  useEffect(() => {
    if (transition === 'none') { setPortalSequence('idle'); return }
    const opening = `${transition}:opening` as TransitionSequence
    const traversal = `${transition}:traversal` as TransitionSequence
    const closing = `${transition}:closing` as TransitionSequence
    setPortalSequence(opening)
    const traversalTimer = window.setTimeout(() => setPortalSequence(traversal), reducedMotion ? 80 : 220)
    const closingTimer = window.setTimeout(() => setPortalSequence(closing), reducedMotion ? 420 : 1500)
    const navigationTimer = window.setTimeout(() => {
      if (transition === 'ground') requestUraiWorldTravel({ destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' })
      else requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent-complete' })
    }, reducedMotion ? 720 : 2350)
    return () => { window.clearTimeout(traversalTimer); window.clearTimeout(closingTimer); window.clearTimeout(navigationTimer) }
  }, [reducedMotion, transition])
  useEffect(() => {
    const cancel = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || transition === 'none') return
      event.preventDefault(); setTransition('none'); setPortalSequence('idle'); setOrbState('idle')
    }
    window.addEventListener('keydown', cancel, true)
    return () => window.removeEventListener('keydown', cancel, true)
  }, [transition])

  if (!webglAvailable) return null
  const ready = canvasReady && sceneReady
  const context = transition === 'life-map' ? 'Ascending into your Life Map' : transition === 'ground' ? 'Descending into Ground' : nearby === 'orb' ? 'The Orb is here' : nearby === 'ground' ? 'The path descends' : nearby === 'life-map' ? 'The threshold opens to your Life Map' : null
  return <main
    className={`${styles.world} urai-asset-home-world`}
    data-urai-home-production
    data-urai-true-3d="true"
    data-home-primary-owner="asset-driven"
    data-home-visible-world="v67-asymmetric-scanned-stone-relic-sanctuary"
    data-home-world-character="production-cinematic-sacred-tech"
    data-home-physical-base="canted-scanned-stone-machine-reliquary"
    data-home-visual-ownership="three-dimensional-geometry"
    data-home-desktop-mobile-world="same-scene"
    data-home-embodied-self="privacy-preserving-first-person"
    data-home-movement="walk-keyboard-click-touch"
    data-home-visual-grade="cinematic-pbr-v67-armored-reliquary"
    data-home-final-art-revision="v67-armored-sanctuary-replacement"
    data-home-art-certification="v67-retained-pixel-candidate-not-certified"
    data-home-scanned-composition="single-bounded-photogrammetry-relief-v67"
    data-home-pbr-environment="local-cc0-hdri-studio-small-08"
    data-home-assets-ready={ready ? 'true' : 'false'}
    data-home-runtime-assets="polyhaven-rock-face-01 polyhaven-industrial-caged-sconce polyhaven-rock-tile-floor-pbr studio-small-08-hdri"
    data-home-scenery-assets="polyhaven-rock-face-01 industrial-caged-sconce rock-tile-floor-pbr studio-small-08-hdri"
    data-home-authored-regions="home-authored-terrain home-mountain-horizon home-living-vegetation home-sanctuary-pavilion home-life-map-physical-portal"
    data-home-nearby={nearby ?? 'none'}
    data-home-camera-mode={transition !== 'none' ? transition : dragging ? 'look' : 'embodied-third-person'}
    data-home-scene-phase={transition === 'none' ? 'HOME' : transition.toUpperCase()}
    data-home-portal-sequence={portalSequence}
    data-home-portal-lifecycle="environmental-approach-traversal-arrival"
    data-home-animation-owner="enclosed-reliquary-v66-six-fragment-orb"
    data-home-input-locked={transition !== 'none' ? 'true' : 'false'}
    data-home-orb-state={orbState}
    data-home-orb-clip={resolveOrbSensoryOutput(orbState, reducedMotion, true).animation}
    data-home-orb-model-clip={reducedMotion ? 'stopped-reduced-motion' : ORB_CLIPS[orbState]}
    data-testid="home-visible-navigable-sanctuary-world"
    style={{ position: 'relative', overflow: 'hidden', background: '#090e0f' }}
    {...look}
  >
    <Canvas className={styles.canvas} dpr={1} shadows camera={{ position: [4.45, 1.65, 3.15], fov: 42, near: 0.1, far: 110 }} gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.72; gl.shadowMap.type = THREE.PCFSoftShadowMap; setCanvasReady(true) }}>
      <Scene input={input} yaw={yaw} pitch={pitch} target={target} nearby={setNearby} transition={transition} reducedMotion={reducedMotion} orbState={orbState} onOrb={openOrb} onGround={openGround} onLifeMap={openLifeMap} onReady={markSceneReady} />
    </Canvas>
    {context ? <div className={`${styles.worldHint} home-world-context`} role="status" aria-live="polite">{context}</div> : null}
    {transition === 'none' && mobile ? <MobileMovementPad input={input} label="Home movement controls" /> : null}
    <span className="sr-only" data-testid="urai-home-webgl-orb">The engineered six-fragment Orb relic-machine is physically integrated into the Home sanctuary.</span>
    <span className="sr-only" data-testid="urai-home-embodied-avatar">Your privacy-preserving embodied Home presence remains active.</span>
  </main>
}

useGLTF.preload(ROCK_RELIEF)
useGLTF.preload(CAGED_SCONCE)
useTexture.preload([ROCK_DIFFUSE, ROCK_NORMAL, ROCK_ARM])
