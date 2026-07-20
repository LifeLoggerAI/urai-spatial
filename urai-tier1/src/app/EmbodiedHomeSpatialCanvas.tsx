'use client'

import { Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useRef, useState, type CSSProperties, type MutableRefObject } from 'react'
import * as THREE from 'three'
import HomeSanctuaryWorld from './HomeSanctuaryWorld'
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

type Props = { onOrbOpen: () => void; webglAvailable: true }
type Nearby = 'orb' | 'avatar' | 'ground' | 'life-map' | null

type SceneProps = {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  walkTarget: MutableRefObject<THREE.Vector3 | null>
  nearby: MutableRefObject<Nearby>
  nearbyState: Nearby
  reducedMotion: boolean
  shellRef: MutableRefObject<HTMLDivElement | null>
  onNearbyChange: (target: Nearby) => void
  onOrbOpen: () => void
  onTravel: (destination: 'life-map' | 'infrastructure-hub') => void
}

const HOME_BOUNDS = { minX: -8.4, maxX: 8.4, minZ: -10.2, maxZ: 8.4 }
const HOME_SPAWN = new THREE.Vector3(0, 0, 7.4)
const ORB_POSITION = new THREE.Vector3(0, 1.55, -1.15)
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, -1]} onClick={choose}>
        <planeGeometry args={[18, 19]} />
        <meshBasicMaterial transparent opacity={0.001} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}

function HomeOrb({ walkTarget, nearby, onOrbOpen }: Pick<SceneProps, 'walkTarget' | 'nearby' | 'onOrbOpen'>) {
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'orb') onOrbOpen()
    else walkTarget.current = new THREE.Vector3(0, 0, 0.4)
  }

  return (
    <group position={ORB_POSITION} name="home-authored-orb-physical-hit-target" data-testid="urai-home-webgl-orb">
      <mesh onClick={activate}>
        <sphereGeometry args={[0.82, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

function EmbodiedSelf({ walkTarget, nearby }: Pick<SceneProps, 'walkTarget' | 'nearby'>) {
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'avatar') {
      window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-sanctuary-walk' } }))
    } else {
      walkTarget.current = new THREE.Vector3(-2.2, 0, 1.3)
    }
  }

  return (
    <group position={AVATAR_POSITION} name="home-embodied-self" data-testid="urai-home-embodied-avatar">
      <mesh position={[0, 2.9, 0]} onClick={activate}>
        <sphereGeometry args={[0.25, 24, 24]} />
        <meshPhysicalMaterial color="#c9eef2" emissive="#9f91ff" emissiveIntensity={0.38} transparent opacity={0.36} transmission={0.5} depthWrite={false} />
      </mesh>
      <mesh position={[0, 1.62, 0]} onClick={activate}>
        <capsuleGeometry args={[0.32, 1.55, 10, 20]} />
        <meshPhysicalMaterial color="#81cbd1" emissive="#7cecf2" emissiveIntensity={0.2} transparent opacity={0.23} transmission={0.62} depthWrite={false} />
      </mesh>
    </group>
  )
}

function Threshold({ kind, position, walkTarget, active, onTravel }: {
  kind: 'ground' | 'life-map'
  position: THREE.Vector3
  active: boolean
} & Pick<SceneProps, 'walkTarget' | 'onTravel'>) {
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (active) onTravel(kind === 'ground' ? 'infrastructure-hub' : 'life-map')
    else walkTarget.current = new THREE.Vector3(position.x, 0, position.z + 1.4)
  }

  return (
    <group position={position} name={`home-${kind}-physical-threshold`} data-testid={`urai-home-${kind}-walk-threshold`}>
      <mesh onClick={activate} position={[0, kind === 'ground' ? 1.25 : 0.08, 0]} rotation={kind === 'ground' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}>
        {kind === 'ground' ? <torusGeometry args={[1.55, 0.055, 12, 96]} /> : <ringGeometry args={[1.25, 1.34, 96]} />}
        <meshBasicMaterial color={kind === 'ground' ? '#7cecf2' : '#c4b5fd'} transparent opacity={active ? 0.72 : 0.24} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  )
}

function PlayerCamera({ input, yaw, pitch, walkTarget, nearby, reducedMotion, shellRef, onNearbyChange }: Pick<SceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'nearby' | 'reducedMotion' | 'shellRef' | 'onNearbyChange'>) {
  const { camera } = useThree()
  const position = useRef(HOME_SPAWN.clone())
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const renderedFrames = useRef(0)

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target: walkTarget,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 2.4 : 3.4,
      acceleration: reducedMotion ? 16 : 10,
      deceleration: reducedMotion ? 20 : 12,
      bounds: HOME_BOUNDS,
      obstacles: HOME_OBSTACLES,
    })

    const candidates: Array<[Nearby, number]> = [
      ['orb', distance2D(position.current, ORB_POSITION)],
      ['avatar', distance2D(position.current, AVATAR_POSITION)],
      ['ground', distance2D(position.current, GROUND_GATE_POSITION)],
      ['life-map', distance2D(position.current, LIFE_MAP_POSITION)],
    ]
    candidates.sort((a, b) => a[1] - b[1])
    const nearest = candidates[0]
    const nextNearby = nearest[1] < (nearest[0] === 'ground' ? 1.9 : 1.65) ? nearest[0] : null
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
    camera.lookAt(lookAt.current.copy(camera.position).add(direction.current))

    renderedFrames.current += 1
    const shell = shellRef.current
    if (shell) {
      const distance = distance2D(position.current, HOME_SPAWN)
      shell.dataset.homeReady = renderedFrames.current >= 8 ? 'true' : 'warming'
      shell.dataset.homePlayerX = position.current.x.toFixed(3)
      shell.dataset.homePlayerZ = position.current.z.toFixed(3)
      shell.dataset.homeDistance = distance.toFixed(3)
      shell.dataset.homeMoving = motion.moving ? 'true' : 'false'
      shell.style.setProperty('--home-parallax-x', `${(-position.current.x * 8).toFixed(1)}px`)
      shell.style.setProperty('--home-parallax-y', `${((position.current.z - HOME_SPAWN.z) * 3.2).toFixed(1)}px`)
    }
  })

  return null
}

function HomeScene(props: SceneProps) {
  return (
    <>
      <PlayerCamera {...props} />
      <ambientLight intensity={0.5} color="#d7edf5" />
      <directionalLight position={[4, 8, 6]} intensity={0.7} color="#d9fbff" />
      <Stars radius={65} depth={38} count={620} factor={2.2} saturation={0.2} fade speed={props.reducedMotion ? 0 : 0.035} />
      <HomeSanctuaryWorld reducedMotion={props.reducedMotion} walkTarget={props.walkTarget} />
      <HomeFloor walkTarget={props.walkTarget} />
      <HomeOrb walkTarget={props.walkTarget} nearby={props.nearby} onOrbOpen={props.onOrbOpen} />
      <EmbodiedSelf walkTarget={props.walkTarget} nearby={props.nearby} />
      <Threshold kind="life-map" position={LIFE_MAP_POSITION} walkTarget={props.walkTarget} active={props.nearbyState === 'life-map'} onTravel={props.onTravel} />
      <Threshold kind="ground" position={GROUND_GATE_POSITION} walkTarget={props.walkTarget} active={props.nearbyState === 'ground'} onTravel={props.onTravel} />
    </>
  )
}

export default function EmbodiedHomeSpatialCanvas({ onOrbOpen, webglAvailable }: Props) {
  const reducedMotion = useMediaPreference('(prefers-reduced-motion: reduce)')
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const walkTarget = useRef<THREE.Vector3 | null>(null)
  const nearby = useRef<Nearby>(null)
  const [nearbyState, setNearbyState] = useState<Nearby>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => {
    if (!performance.getEntriesByName('urai:first-home-spatial-frame').length) {
      requestAnimationFrame(() => performance.mark('urai:first-home-spatial-frame'))
    }
  }, [])

  const travel = useCallback((destination: 'life-map' | 'infrastructure-hub') => requestUraiWorldTravel(destination === 'life-map'
    ? { destination: 'life-map', href: '/life-map?from=home-sky', entryPortal: 'home-sky', cameraCheckpoint: 'home-sky-ascent' }
    : { destination: 'infrastructure-hub', href: '/ground/', entryPortal: 'home-ground', cameraCheckpoint: 'home-ground-descent' }), [])

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
    '--home-parallax-x': '0px',
    '--home-parallax-y': '0px',
  } as CSSProperties

  const prompt = nearbyState === 'orb'
    ? 'Open the Orb companion'
    : nearbyState === 'avatar'
      ? 'Meet your embodied self'
      : nearbyState === 'ground'
        ? 'Descend into Ground'
        : nearbyState === 'life-map'
          ? 'Ascend into Life Map'
          : 'Walk the sanctuary'

  return (
    <div
      ref={shellRef}
      className="urai-home-embodied-shell"
      style={artStyle}
      data-home-spatial-renderer="webgl"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-visible-world="sanctuary-geometry-memory-vignettes"
      data-home-ready="warming"
      data-home-player-x="0.000"
      data-home-player-z="7.400"
      data-home-distance="0.000"
      data-home-moving="false"
      data-home-camera-mode={dragging ? 'look' : 'embodied'}
      aria-label="Walkable URAI personal sanctuary"
      {...look}
    >
      <div className="urai-home-embodied-art" aria-hidden="true" />
      <Canvas
        className="urai-home-spatial-canvas urai-home-embodied-canvas"
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.25]}
        frameloop="always"
        camera={{ position: [0, 1.68, 7.4], fov: 56, near: 0.08, far: 150 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <HomeScene
          input={input}
          yaw={yaw}
          pitch={pitch}
          walkTarget={walkTarget}
          nearby={nearby}
          nearbyState={nearbyState}
          reducedMotion={reducedMotion}
          shellRef={shellRef}
          onNearbyChange={setNearbyState}
          onOrbOpen={onOrbOpen}
          onTravel={travel}
        />
      </Canvas>
      <div className="urai-home-movement-prompt" role="status" aria-live="polite">
        <strong>{prompt}</strong>
        <span>{nearbyState ? 'Press Enter or tap again' : 'WASD / arrows · click ground · drag to look'}</span>
      </div>
      <MovementHelp
        realm="Home"
        summary="Walk through a real sanctuary of paths, architecture, memory worlds, the Orb, Ground doorway, and Life Map threshold."
        controls="WASD or arrows move. Click ground or a memory world to approach. Drag to look. Enter interacts. R resets."
      />
      <MobileMovementPad input={input} label="Home movement controls" />
      <nav className="urai-home-direct-controls" data-movement-ui="true" aria-label="Direct Home destinations">
        <button type="button" aria-label="Open Orb directly" onClick={onOrbOpen}>Orb</button>
        <button type="button" aria-label="Open Ground directly" onClick={() => travel('infrastructure-hub')}>Ground</button>
        <button type="button" aria-label="Open Life Map directly" onClick={() => travel('life-map')}>Life Map</button>
      </nav>
      <style jsx>{`
        .urai-home-embodied-shell{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;isolation:isolate;background:#01050d}.urai-home-embodied-shell[data-home-camera-mode='look']{cursor:grabbing}
        .urai-home-embodied-art{position:absolute;inset:-4%;z-index:0;background-image:linear-gradient(180deg,rgba(1,6,14,.28),rgba(1,7,14,.44) 52%,rgba(1,5,11,.82)),var(--home-authored-desktop);background-size:cover;background-position:calc(50% + var(--home-parallax-x,0px)) calc(48% + var(--home-parallax-y,0px));background-repeat:no-repeat;filter:saturate(.9) contrast(1.03) brightness(.58);transform:scale(1.08);pointer-events:none}
        :global(.urai-home-embodied-canvas){z-index:1;background:transparent!important}
        .urai-home-movement-prompt{position:absolute;left:50%;bottom:max(92px,calc(env(safe-area-inset-bottom) + 82px));z-index:27;transform:translateX(-50%);display:grid;gap:3px;min-width:min(390px,calc(100vw - 32px));padding:11px 16px;border:1px solid rgba(207,250,254,.18);border-radius:18px;background:rgba(2,10,22,.62);backdrop-filter:blur(16px);text-align:center;pointer-events:none}.urai-home-movement-prompt strong{font:800 11px/1.2 Inter,system-ui;letter-spacing:.08em;text-transform:uppercase;color:#eefcff}.urai-home-movement-prompt span{font:600 10px/1.3 Inter,system-ui;color:rgba(199,235,247,.66)}
        .urai-home-direct-controls{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:29;display:flex;gap:7px}.urai-home-direct-controls button{min-height:48px;padding:0 15px;border:1px solid rgba(207,250,254,.2);border-radius:999px;background:rgba(2,12,26,.7);color:#fff;font:750 11px/1 Inter,system-ui}
        @media(max-width:700px){.urai-home-embodied-art{background-image:linear-gradient(180deg,rgba(1,6,14,.3),rgba(1,7,14,.48) 50%,rgba(1,5,11,.84)),var(--home-authored-mobile)}.urai-home-movement-prompt{bottom:max(202px,calc(env(safe-area-inset-bottom) + 192px));min-width:min(310px,calc(100vw - 24px))}.urai-home-direct-controls{right:max(9px,env(safe-area-inset-right));bottom:max(9px,env(safe-area-inset-bottom))}}
        @media(prefers-reduced-motion:reduce){.urai-home-embodied-art{transform:none}}
      `}</style>
    </div>
  )
}
