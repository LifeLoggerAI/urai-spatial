'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { assetCssStack, homeAssets } from '@/spatial/assets/uraiAssets'
import {
  MobileMovementPad,
  MovementHelp,
  stepEmbodiedMotion,
  useDragLook,
  useMovementInput,
  type MovementInput,
} from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'

type EmbodiedHomeSpatialCanvasProps = {
  onOrbOpen: () => void
  webglAvailable: true
}

type NearbyHomeTarget = 'orb' | 'avatar' | 'ground' | 'life-map' | null

type HomeSceneProps = {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearby: MutableRefObject<NearbyHomeTarget>
  reducedMotion: boolean
  shellRef: MutableRefObject<HTMLDivElement | null>
  onNearbyChange: (target: NearbyHomeTarget) => void
  onOrbOpen: () => void
  onAvatarOpen: () => void
  onTravel: (destination: 'life-map' | 'infrastructure-hub') => void
}

const HOME_BOUNDS = { minX: -8.4, maxX: 8.4, minZ: -10.2, maxZ: 8.4 }
const HOME_SPAWN = new THREE.Vector3(0, 0, 7.4)
const ORB_POSITION = new THREE.Vector3(2.45, 1.55, -1.15)
const AVATAR_POSITION = new THREE.Vector3(-2.2, 0, -0.25)
const GROUND_GATE_POSITION = new THREE.Vector3(0, 0, -8.7)
const LIFE_MAP_POSITION = new THREE.Vector3(0, 0, -5.45)
const HOME_OBSTACLES = [
  { x: AVATAR_POSITION.x, z: AVATAR_POSITION.z, radius: 0.95 },
  { x: ORB_POSITION.x, z: ORB_POSITION.z, radius: 0.82 },
]

function useMediaPreference(query: string) {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const media = window.matchMedia(query)
    const update = () => setMatches(media.matches)
    update()
    media.addEventListener?.('change', update)
    return () => media.removeEventListener?.('change', update)
  }, [query])
  return matches
}

function distance2D(a: THREE.Vector3, b: THREE.Vector3) {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

function approachPoint(target: THREE.Vector3, offsetZ = 1.35) {
  return new THREE.Vector3(target.x, 0, target.z + offsetZ)
}

function HomeFloor({ walkTarget }: { walkTarget: MutableRefObject<THREE.Vector3 | null> }) {
  const choose = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (event.delta > 6) return
    walkTarget.current = new THREE.Vector3(
      THREE.MathUtils.clamp(event.point.x, HOME_BOUNDS.minX, HOME_BOUNDS.maxX),
      0,
      THREE.MathUtils.clamp(event.point.z, HOME_BOUNDS.minZ, HOME_BOUNDS.maxZ),
    )
  }
  return (
    <group name="home-walkable-sanctuary-floor" data-testid="urai-home-walkable-surface">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -1]} onClick={choose}>
        <planeGeometry args={[18, 19, 1, 1]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} colorWrite={false} />
      </mesh>
      {[2.7, 4.7, 7].map((radius, index) => (
        <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01 + index * 0.002, -2.2]}>
          <ringGeometry args={[radius, radius + 0.025, 96]} />
          <meshBasicMaterial color={index % 2 ? '#9f91ff' : '#7cecf2'} transparent opacity={0.075 - index * 0.014} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </group>
  )
}

function HomeOrb({ walkTarget, nearby, onOrbOpen }: {
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearby: MutableRefObject<NearbyHomeTarget>
  onOrbOpen: () => void
}) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.position.y = ORB_POSITION.y + Math.sin(clock.elapsedTime * 0.8) * 0.045
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'orb') onOrbOpen()
    else walkTarget.current = approachPoint(ORB_POSITION, 1.4)
  }
  return (
    <group ref={group} position={ORB_POSITION} name="home-only-companion" data-testid="urai-home-webgl-orb">
      <mesh onClick={activate} onPointerOver={() => setHovered(true)} onPointerOut={() => setHovered(false)}>
        <sphereGeometry args={[0.34, 40, 40]} />
        <meshPhysicalMaterial color="#ecffff" emissive="#7cecf2" emissiveIntensity={hovered ? 3.5 : 2.45} roughness={0.04} metalness={0.14} clearcoat={1} transmission={0.18} />
      </mesh>
      <mesh scale={1.36}>
        <sphereGeometry args={[0.34, 30, 30]} />
        <meshBasicMaterial color="#9f91ff" transparent opacity={0.075} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <pointLight color="#7cecf2" intensity={hovered ? 7 : 5} distance={7.5} decay={2} />
    </group>
  )
}

function EmbodiedSelf({ walkTarget, nearby, onAvatarOpen }: {
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearby: MutableRefObject<NearbyHomeTarget>
  onAvatarOpen: () => void
}) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current) return
    group.current.scale.y = 0.82 * (1 + Math.sin(clock.elapsedTime * 1.1) * 0.01)
  })
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'avatar') onAvatarOpen()
    else walkTarget.current = approachPoint(AVATAR_POSITION, 1.55)
  }
  return (
    <group ref={group} position={AVATAR_POSITION} rotation={[0, -0.18, 0]} scale={0.82} name="home-embodied-self" data-testid="urai-home-embodied-avatar">
      <mesh position={[0, 2.9, 0]} onClick={activate}>
        <sphereGeometry args={[0.25, 30, 30]} />
        <meshPhysicalMaterial color="#c9eef2" emissive="#9f91ff" emissiveIntensity={0.38} transparent opacity={0.36} roughness={0.14} transmission={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.62, 0]} onClick={activate}>
        <capsuleGeometry args={[0.32, 1.55, 10, 20]} />
        <meshPhysicalMaterial color="#81cbd1" emissive="#7cecf2" emissiveIntensity={0.2} transparent opacity={0.23} roughness={0.12} transmission={0.62} depthWrite={false} />
      </mesh>
      <pointLight position={[0, 1.7, 0.2]} color="#9f91ff" intensity={0.8} distance={4.2} />
    </group>
  )
}

function Threshold({
  kind,
  position,
  walkTarget,
  nearby,
  onTravel,
}: {
  kind: 'ground' | 'life-map'
  position: THREE.Vector3
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearby: MutableRefObject<NearbyHomeTarget>
  onTravel: (destination: 'life-map' | 'infrastructure-hub') => void
}) {
  const active = nearby.current === kind
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === kind) onTravel(kind === 'ground' ? 'infrastructure-hub' : 'life-map')
    else walkTarget.current = approachPoint(position, kind === 'ground' ? 1.25 : 1.5)
  }
  return (
    <group position={position} name={`home-${kind}-physical-threshold`} data-testid={`urai-home-${kind}-walk-threshold`}>
      <mesh onClick={activate} position={[0, kind === 'ground' ? 1.25 : 0.08, 0]} rotation={kind === 'ground' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}>
        {kind === 'ground' ? <torusGeometry args={[1.55, 0.055, 12, 96]} /> : <ringGeometry args={[1.25, 1.34, 96]} />}
        <meshBasicMaterial color={kind === 'ground' ? '#7cecf2' : '#c4b5fd'} transparent opacity={active ? 0.72 : 0.24} depthWrite={false} toneMapped={false} />
      </mesh>
      {kind === 'ground' ? (
        <>
          <mesh position={[-1.55, 1.25, 0]}><cylinderGeometry args={[0.055, 0.055, 2.5, 12]} /><meshBasicMaterial color="#7cecf2" transparent opacity={0.32} /></mesh>
          <mesh position={[1.55, 1.25, 0]}><cylinderGeometry args={[0.055, 0.055, 2.5, 12]} /><meshBasicMaterial color="#7cecf2" transparent opacity={0.32} /></mesh>
        </>
      ) : null}
      <pointLight position={[0, kind === 'ground' ? 1.4 : 0.45, 0.5]} color={kind === 'ground' ? '#7cecf2' : '#c4b5fd'} intensity={active ? 4.5 : 1.2} distance={6} />
    </group>
  )
}

function PlayerCamera({
  input,
  yaw,
  pitch,
  walkTarget,
  nearby,
  reducedMotion,
  shellRef,
  onNearbyChange,
}: Pick<HomeSceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'nearby' | 'reducedMotion' | 'shellRef' | 'onNearbyChange'>) {
  const { camera } = useThree()
  const position = useRef(HOME_SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<NearbyHomeTarget>(null)
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())

  useFrame((_, delta) => {
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target: walkTarget,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.65 : 2.35,
      acceleration: reducedMotion ? 14 : 7,
      deceleration: reducedMotion ? 18 : 9,
      bounds: HOME_BOUNDS,
      obstacles: HOME_OBSTACLES,
    })

    const dOrb = distance2D(position.current, ORB_POSITION)
    const dAvatar = distance2D(position.current, AVATAR_POSITION)
    const dGround = distance2D(position.current, GROUND_GATE_POSITION)
    const dLifeMap = distance2D(position.current, LIFE_MAP_POSITION)
    let minTarget: NearbyHomeTarget = null
    let minDistance = Number.POSITIVE_INFINITY
    if (dOrb < minDistance) { minDistance = dOrb; minTarget = 'orb' }
    if (dAvatar < minDistance) { minDistance = dAvatar; minTarget = 'avatar' }
    if (dGround < minDistance) { minDistance = dGround; minTarget = 'ground' }
    if (dLifeMap < minDistance) { minDistance = dLifeMap; minTarget = 'life-map' }

    const nextNearby = minTarget && minDistance < (minTarget === 'ground' ? 1.9 : 1.65) ? minTarget : null
    nearby.current = nextNearby
    if (nextNearby !== lastNearby.current) {
      lastNearby.current = nextNearby
      onNearbyChange(nextNearby)
    }

    camera.position.set(position.current.x, 1.68, position.current.z)
    direction.current.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    lookAt.current.copy(camera.position).add(direction.current)
    camera.lookAt(lookAt.current)

    if (camera instanceof THREE.PerspectiveCamera) {
      camera.fov = THREE.MathUtils.damp(camera.fov, 56, reducedMotion ? 100 : 6, delta)
      camera.updateProjectionMatrix()
    }

    const shell = shellRef.current
    if (shell) {
      shell.style.setProperty('--home-walk-x', `${position.current.x.toFixed(3)}`)
      shell.style.setProperty('--home-walk-z', `${position.current.z.toFixed(3)}`)
    }
  })
  return null
}

function HomeScene(props: HomeSceneProps) {
  return (
    <>
      <PlayerCamera {...props} />
      <ambientLight intensity={0.42} color="#d7edf5" />
      <Stars radius={65} depth={38} count={620} factor={2.2} saturation={0.2} fade speed={props.reducedMotion ? 0 : 0.035} />
      <HomeFloor walkTarget={props.walkTarget} />
      <HomeOrb walkTarget={props.walkTarget} nearby={props.nearby} onOrbOpen={props.onOrbOpen} />
      <EmbodiedSelf walkTarget={props.walkTarget} nearby={props.nearby} onAvatarOpen={props.onAvatarOpen} />
      <Threshold kind="life-map" position={LIFE_MAP_POSITION} walkTarget={props.walkTarget} nearby={props.nearby} onTravel={props.onTravel} />
      <Threshold kind="ground" position={GROUND_GATE_POSITION} walkTarget={props.walkTarget} nearby={props.nearby} onTravel={props.onTravel} />
      {[-5.8, -3.1, 3.1, 5.8].map((x, index) => <pointLight key={x} position={[x, 0.8, -7.6 - Math.abs(x) * 0.22]} color={index % 2 ? '#9f91ff' : '#7cecf2'} intensity={0.32} distance={4.2} />)}
      {[-1, 1, -1, 1].map((side, index) => (
        <mesh key={index} position={[side * (4.5 + Math.floor(index / 2) * 1.2), 2.1 + Math.floor(index / 2) * 0.2, -7.8 - Math.floor(index / 2) * 1.4]}>
          <sphereGeometry args={[0.09, 16, 16]} />
          <meshBasicMaterial color={index % 2 ? '#9f91ff' : '#7cecf2'} transparent opacity={0.24} depthWrite={false} toneMapped={false} />
        </mesh>
      ))}
    </>
  )
}

export default function EmbodiedHomeSpatialCanvas({ onOrbOpen, webglAvailable }: EmbodiedHomeSpatialCanvasProps) {
  const reducedMotion = useMediaPreference('(prefers-reduced-motion: reduce)')
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const walkTarget = useRef<THREE.Vector3 | null>(null)
  const nearby = useRef<NearbyHomeTarget>(null)
  const [nearbyState, setNearbyState] = useState<NearbyHomeTarget>(null)
  const [dragging, setDragging] = useState(false)

  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => {
    requestUraiWorldTravel(destination === 'life-map' ? {
      destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent',
    } : {
      destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent',
    })
  }, [])

  const activateNearby = useCallback(() => {
    if (nearby.current === 'orb') onOrbOpen()
    if (nearby.current === 'avatar') window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-sanctuary-walk' } }))
    if (nearby.current === 'ground') travel('infrastructure-hub')
    if (nearby.current === 'life-map') travel('life-map')
  }, [onOrbOpen, travel])

  const reset = useCallback(() => {
    walkTarget.current = HOME_SPAWN.clone()
    yaw.current = 0
    pitch.current = -0.04
  }, [])

  const input = useMovementInput({ onInteract: activateNearby, onEscape: reset, onReset: reset })
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? 0.0024 : 0.0038, onDragState: setDragging })

  if (!webglAvailable) return null

  const artStyle = {
    '--home-authored-desktop': assetCssStack(homeAssets.primary),
    '--home-authored-mobile': assetCssStack(homeAssets.mobile),
  } as CSSProperties
  const prompt = nearbyState === 'orb' ? 'Open the Orb companion'
    : nearbyState === 'avatar' ? 'Meet your embodied self'
      : nearbyState === 'ground' ? 'Descend into Ground'
        : nearbyState === 'life-map' ? 'Ascend into Life Map'
          : 'Walk the sanctuary'

  return (
    <div
      ref={shellRef}
      className="urai-home-embodied-shell"
      style={artStyle}
      data-home-spatial-renderer="webgl"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-camera-mode={dragging ? 'look' : walkTarget.current ? 'walking' : 'embodied-idle'}
      aria-label="Walkable URAI personal sanctuary"
      {...look}
    >
      <div className="urai-home-embodied-art" aria-hidden="true" />
      <Canvas
        className="urai-home-spatial-canvas urai-home-embodied-canvas"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
        dpr={[1, 1.5]}
        camera={{ position: [0, 1.68, 7.4], fov: 56, near: 0.08, far: 150 }}
        gl={{ antialias: true, alpha: true, premultipliedAlpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.outputColorSpace = THREE.SRGBColorSpace
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.02
          gl.setClearColor(0x000000, 0)
        }}
      >
        <HomeScene
          input={input}
          yaw={yaw}
          pitch={pitch}
          walkTarget={walkTarget}
          nearby={nearby}
          reducedMotion={reducedMotion}
          shellRef={shellRef}
          onNearbyChange={setNearbyState}
          onOrbOpen={onOrbOpen}
          onAvatarOpen={() => window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-sanctuary-walk' } }))}
          onTravel={travel}
        />
      </Canvas>
      <div className="urai-home-movement-prompt" role="status" aria-live="polite"><strong>{prompt}</strong><span>{nearbyState ? 'Press Enter or tap again' : 'WASD / arrows · click ground · drag to look'}</span></div>
      <MovementHelp realm="Home" summary="Walk slowly through the sanctuary. Approach the Orb, embodied self, Ground doorway, or Life Map threshold." controls="WASD or arrows move. Click ground to walk. Drag to look. Enter interacts. R resets orientation. No pointer lock." />
      <MobileMovementPad input={input} label="Home movement controls" />
      <nav className="urai-home-direct-controls" data-movement-ui="true" aria-label="Direct Home destinations">
        <button type="button" aria-label="Open Orb directly" onClick={onOrbOpen}>Orb</button>
        <button type="button" aria-label="Open Ground directly" onClick={() => travel('infrastructure-hub')}>Ground</button>
        <button type="button" aria-label="Open Life Map directly" onClick={() => travel('life-map')}>Life Map</button>
      </nav>
      <style jsx>{`
        .urai-home-embodied-shell{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;isolation:isolate;background:#01050d}.urai-home-embodied-shell[data-home-camera-mode='look']{cursor:grabbing}
        .urai-home-embodied-art{position:absolute;inset:-2%;z-index:0;background-image:linear-gradient(180deg,rgba(1,6,14,.04),rgba(1,7,14,.12) 52%,rgba(1,5,11,.68)),radial-gradient(circle at 52% 42%,rgba(126,239,245,.08),transparent 34%),var(--home-authored-desktop);background-size:cover;background-position:calc(50% + var(--home-walk-x,0) * -0.45%) calc(48% + var(--home-walk-z,0) * .18%);background-repeat:no-repeat;filter:saturate(1.08) contrast(1.04) brightness(.92);transform:scale(1.035);transition:background-position .12s linear;pointer-events:none}
        .urai-home-embodied-art::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,rgba(0,0,0,.3),transparent 24%,transparent 76%,rgba(0,0,0,.3)),radial-gradient(ellipse at 50% 48%,transparent 40%,rgba(0,0,0,.38) 100%)}
        :global(.urai-home-embodied-canvas){z-index:1;background:transparent!important}
        .urai-home-movement-prompt{position:absolute;left:50%;bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px));z-index:27;transform:translateX(-50%);display:grid;gap:3px;min-width:min(390px,calc(100vw - 32px));padding:11px 16px;border:1px solid rgba(207,250,254,.18);border-radius:18px;background:rgba(2,10,22,.62);backdrop-filter:blur(16px);text-align:center;pointer-events:none}.urai-home-movement-prompt strong{font:800 11px/1.2 Inter,system-ui;letter-spacing:.08em;text-transform:uppercase;color:#eefcff}.urai-home-movement-prompt span{font:600 10px/1.3 Inter,system-ui;color:rgba(199,235,247,.66)}
        .urai-home-direct-controls{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:29;display:flex;gap:7px}.urai-home-direct-controls button{min-height:48px;padding:0 15px;border:1px solid rgba(207,250,254,.2);border-radius:999px;background:rgba(2,12,26,.7);backdrop-filter:blur(15px);color:#fff;font:750 11px/1 Inter,system-ui;cursor:pointer}.urai-home-direct-controls button:focus-visible{outline:3px solid #fff;outline-offset:3px}
        @media(max-width:700px){.urai-home-embodied-art{background-image:linear-gradient(180deg,rgba(1,6,14,.04),rgba(1,7,14,.16) 50%,rgba(1,5,11,.74)),radial-gradient(circle at 50% 38%,rgba(126,239,245,.08),transparent 32%),var(--home-authored-mobile);background-position:calc(50% + var(--home-walk-x,0) * -.32%) calc(44% + var(--home-walk-z,0) * .14%)}.urai-home-movement-prompt{bottom:max(142px,calc(env(safe-area-inset-bottom) + 132px));min-width:min(310px,calc(100vw - 24px))}.urai-home-direct-controls{left:auto;right:max(9px,env(safe-area-inset-right));bottom:max(9px,env(safe-area-inset-bottom));max-width:calc(100vw - 18px);overflow-x:auto}.urai-home-direct-controls button{min-height:48px;padding:0 12px}}
        @media(prefers-reduced-motion:reduce){.urai-home-embodied-art{transition:none;transform:none}}
      `}</style>
    </div>
  )
}
