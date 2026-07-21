'use client'

import { ContactShadows, Stars } from '@react-three/drei'
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
  playerPosition: MutableRefObject<THREE.Vector3>
  nearby: MutableRefObject<Nearby>
  nearbyState: Nearby
  reducedMotion: boolean
  shellRef: MutableRefObject<HTMLDivElement | null>
  onNearbyChange: (target: Nearby) => void
  onOrbOpen: () => void
  onTravel: (destination: 'life-map' | 'infrastructure-hub') => void
  onMemoryOpen: (memoryId: string) => void
}

const HOME_BOUNDS = { minX: -8.1, maxX: 8.1, minZ: -9.35, maxZ: 8.2 }
const HOME_SPAWN = new THREE.Vector3(0, 0, 7.35)
const ORB_POSITION = new THREE.Vector3(0, 1.36, -1.15)
const AVATAR_POSITION = new THREE.Vector3(-2.15, 0, -.2)
const GROUND_GATE_POSITION = new THREE.Vector3(0, 0, -8.72)
const LIFE_MAP_POSITION = new THREE.Vector3(0, 0, -5.48)
const HOME_OBSTACLES = [
  { x: AVATAR_POSITION.x, z: AVATAR_POSITION.z, radius: .86 },
  { x: ORB_POSITION.x, z: ORB_POSITION.z, radius: .76 },
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .018, -1]} onClick={choose}>
        <planeGeometry args={[18, 19.5]} />
        <meshBasicMaterial transparent opacity={.001} depthWrite={false} colorWrite={false} />
      </mesh>
    </group>
  )
}

function HomeOrb({ walkTarget, nearby, onOrbOpen, reducedMotion }: Pick<SceneProps, 'walkTarget' | 'nearby' | 'onOrbOpen' | 'reducedMotion'>) {
  const core = useRef<THREE.Mesh>(null)
  const outer = useRef<THREE.Mesh>(null)
  const light = useRef<THREE.PointLight>(null)

  useFrame(({ clock }, delta) => {
    if (!core.current || !outer.current || !light.current) return
    const near = nearby.current === 'orb'
    const breathe = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.15) * .035
    const target = (near ? 1.12 : 1) * breathe
    core.current.scale.setScalar(THREE.MathUtils.damp(core.current.scale.x, target, 6, delta))
    outer.current.rotation.y += reducedMotion ? 0 : delta * .13
    outer.current.rotation.x += reducedMotion ? 0 : delta * .035
    light.current.intensity = THREE.MathUtils.damp(light.current.intensity, near ? 4.8 : 3.1, 6, delta)
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'orb') onOrbOpen()
    else walkTarget.current = new THREE.Vector3(0, 0, .42)
  }

  return (
    <group position={ORB_POSITION} name="home-authored-orb-physical-hit-target" data-testid="urai-home-webgl-orb">
      <mesh ref={core} onClick={activate} castShadow>
        <sphereGeometry args={[.52, 48, 48]} />
        <meshPhysicalMaterial color="#baf7f5" emissive="#62dfe5" emissiveIntensity={1.15} roughness={.14} metalness={.06} transmission={.16} clearcoat={1} clearcoatRoughness={.12} />
      </mesh>
      <mesh ref={outer} onClick={activate} rotation={[.35, 0, .14]}>
        <torusGeometry args={[.76, .018, 8, 128]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={.42} toneMapped={false} depthWrite={false} />
      </mesh>
      <mesh onClick={activate} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[.67, .012, 8, 128]} />
        <meshBasicMaterial color="#7cecf2" transparent opacity={.38} toneMapped={false} depthWrite={false} />
      </mesh>
      <pointLight ref={light} color="#78e8ed" intensity={3.1} distance={8} decay={2} />
      <mesh position={[0, -.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.05, 64]} />
        <meshBasicMaterial color="#69dfe5" transparent opacity={.09} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh onClick={activate}>
        <sphereGeometry args={[.9, 24, 24]} />
        <meshBasicMaterial transparent opacity={0} colorWrite={false} depthWrite={false} />
      </mesh>
    </group>
  )
}

function EmbodiedSelf({ walkTarget, nearby, reducedMotion }: Pick<SceneProps, 'walkTarget' | 'nearby' | 'reducedMotion'>) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.y = Math.sin(clock.elapsedTime * .9) * .018
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (nearby.current === 'avatar') {
      window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-sanctuary-walk' } }))
    } else {
      walkTarget.current = new THREE.Vector3(-2.15, 0, 1.2)
    }
  }

  return (
    <group ref={group} position={AVATAR_POSITION} name="home-embodied-self" data-testid="urai-home-embodied-avatar">
      <mesh position={[0, 2.55, 0]} onClick={activate} castShadow>
        <sphereGeometry args={[.24, 32, 32]} />
        <meshPhysicalMaterial color="#d5edf0" emissive="#a9a1df" emissiveIntensity={.22} transparent opacity={.82} roughness={.34} metalness={.05} />
      </mesh>
      <mesh position={[0, 1.32, 0]} onClick={activate} castShadow>
        <capsuleGeometry args={[.3, 1.46, 12, 24]} />
        <meshPhysicalMaterial color="#8bcbd0" emissive="#6dbdc4" emissiveIntensity={.14} transparent opacity={.7} roughness={.46} transmission={.08} />
      </mesh>
      {[-.48, .48].map((x, index) => (
        <group key={x} position={[x, 1.28, .42 + index * .06]} scale={.8 - index * .08}>
          <mesh position={[0, .68, 0]}><sphereGeometry args={[.13, 20, 20]} /><meshStandardMaterial color="#647f8d" transparent opacity={.24} /></mesh>
          <mesh><capsuleGeometry args={[.13, .62, 8, 16]} /><meshStandardMaterial color="#4f6979" transparent opacity={.2} /></mesh>
        </group>
      ))}
      <spotLight position={[0, 4.1, 2.3]} target-position={[0, 1.2, 0]} color="#d9fbff" intensity={1.25} distance={7} angle={.45} penumbra={.8} />
    </group>
  )
}

function Threshold({ kind, position, walkTarget, active, onTravel, reducedMotion }: {
  kind: 'ground' | 'life-map'
  position: THREE.Vector3
  active: boolean
  reducedMotion: boolean
} & Pick<SceneProps, 'walkTarget' | 'onTravel'>) {
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }, delta) => {
    if (!ring.current) return
    const target = active ? 1.1 : 1
    ring.current.scale.setScalar(THREE.MathUtils.damp(ring.current.scale.x, target, 5, delta))
    if (!reducedMotion) ring.current.rotation.z = Math.sin(clock.elapsedTime * .28) * .035
  })

  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    if (active) onTravel(kind === 'ground' ? 'infrastructure-hub' : 'life-map')
    else walkTarget.current = new THREE.Vector3(position.x, 0, position.z + 1.38)
  }

  return (
    <group position={position} name={`home-${kind}-physical-threshold`} data-testid={`urai-home-${kind}-walk-threshold`}>
      <mesh ref={ring} onClick={activate} position={[0, kind === 'ground' ? 2.28 : .08, 0]} rotation={kind === 'ground' ? [0, 0, 0] : [-Math.PI / 2, 0, 0]}>
        {kind === 'ground' ? <torusGeometry args={[1.69, .062, 14, 128]} /> : <ringGeometry args={[1.34, 1.43, 128]} />}
        <meshBasicMaterial color={kind === 'ground' ? '#7cecf2' : '#c4b5fd'} transparent opacity={active ? .78 : .3} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {kind === 'life-map' ? (
        <mesh position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={activate}>
          <circleGeometry args={[1.32, 96]} />
          <meshBasicMaterial color="#7667b8" transparent opacity={active ? .22 : .09} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  )
}

function PlayerCamera({ input, yaw, pitch, walkTarget, playerPosition, nearby, reducedMotion, shellRef, onNearbyChange }: Pick<SceneProps, 'input' | 'yaw' | 'pitch' | 'walkTarget' | 'playerPosition' | 'nearby' | 'reducedMotion' | 'shellRef' | 'onNearbyChange'>) {
  const { camera } = useThree()
  const velocity = useRef(new THREE.Vector3())
  const lastNearby = useRef<Nearby>(null)
  const direction = useRef(new THREE.Vector3())
  const lookAt = useRef(new THREE.Vector3())
  const renderedFrames = useRef(0)
  const explored = useRef(false)

  useFrame((_, delta) => {
    const motion = stepEmbodiedMotion({
      position: playerPosition.current,
      velocity: velocity.current,
      input,
      target: walkTarget,
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 2.35 : 3.25,
      acceleration: reducedMotion ? 16 : 10,
      deceleration: reducedMotion ? 20 : 12,
      bounds: HOME_BOUNDS,
      obstacles: HOME_OBSTACLES,
    })

    const candidates: Array<[Nearby, number]> = [
      ['orb', distance2D(playerPosition.current, ORB_POSITION)],
      ['avatar', distance2D(playerPosition.current, AVATAR_POSITION)],
      ['ground', distance2D(playerPosition.current, GROUND_GATE_POSITION)],
      ['life-map', distance2D(playerPosition.current, LIFE_MAP_POSITION)],
    ]
    candidates.sort((a, b) => a[1] - b[1])
    const nearest = candidates[0]
    const nextNearby = nearest[1] < (nearest[0] === 'ground' ? 1.95 : 1.62) ? nearest[0] : null
    nearby.current = nextNearby
    if (nextNearby !== lastNearby.current) {
      lastNearby.current = nextNearby
      onNearbyChange(nextNearby)
    }

    const bob = reducedMotion || !motion.moving ? 0 : Math.sin(performance.now() * .012) * .012
    camera.position.set(playerPosition.current.x, 1.66 + bob, playerPosition.current.z)
    direction.current.set(
      -Math.sin(yaw.current) * Math.cos(pitch.current),
      Math.sin(pitch.current),
      -Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(lookAt.current.copy(camera.position).add(direction.current))

    renderedFrames.current += 1
    const shell = shellRef.current
    if (shell) {
      const distance = distance2D(playerPosition.current, HOME_SPAWN)
      if (!explored.current && distance > .5) explored.current = true
      shell.dataset.homeReady = renderedFrames.current >= 8 ? 'true' : 'warming'
      shell.dataset.homeExplored = explored.current ? 'true' : 'false'
      shell.dataset.homePlayerX = playerPosition.current.x.toFixed(3)
      shell.dataset.homePlayerZ = playerPosition.current.z.toFixed(3)
      shell.dataset.homeDistance = distance.toFixed(3)
      shell.dataset.homeMoving = motion.moving ? 'true' : 'false'
      shell.style.setProperty('--home-parallax-x', `${(-playerPosition.current.x * 3.2).toFixed(1)}px`)
      shell.style.setProperty('--home-parallax-y', `${((playerPosition.current.z - HOME_SPAWN.z) * 1.35).toFixed(1)}px`)
    }
  })

  return null
}

function HomeScene(props: SceneProps) {
  return (
    <>
      <PlayerCamera {...props} />
      <ambientLight intensity={.34} color="#d7edf5" />
      <hemisphereLight args={['#a9dbe4', '#06111b', .58]} />
      <directionalLight position={[4, 8, 6]} intensity={.72} color="#d9fbff" castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <Stars radius={68} depth={42} count={760} factor={2.15} saturation={.18} fade speed={props.reducedMotion ? 0 : .025} />
      <HomeSanctuaryWorld reducedMotion={props.reducedMotion} walkTarget={props.walkTarget} playerPosition={props.playerPosition} onMemoryOpen={props.onMemoryOpen} />
      <HomeFloor walkTarget={props.walkTarget} />
      <HomeOrb walkTarget={props.walkTarget} nearby={props.nearby} onOrbOpen={props.onOrbOpen} reducedMotion={props.reducedMotion} />
      <EmbodiedSelf walkTarget={props.walkTarget} nearby={props.nearby} reducedMotion={props.reducedMotion} />
      <Threshold kind="life-map" position={LIFE_MAP_POSITION} walkTarget={props.walkTarget} active={props.nearbyState === 'life-map'} onTravel={props.onTravel} reducedMotion={props.reducedMotion} />
      <Threshold kind="ground" position={GROUND_GATE_POSITION} walkTarget={props.walkTarget} active={props.nearbyState === 'ground'} onTravel={props.onTravel} reducedMotion={props.reducedMotion} />
      <ContactShadows position={[0, .02, -1.1]} opacity={.34} scale={18} blur={2.8} far={9} resolution={props.reducedMotion ? 256 : 512} color="#00040a" />
    </>
  )
}

export default function EmbodiedHomeSpatialCanvas({ onOrbOpen, webglAvailable }: Props) {
  const reducedMotion = useMediaPreference('(prefers-reduced-motion: reduce)')
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-.035)
  const walkTarget = useRef<THREE.Vector3 | null>(null)
  const playerPosition = useRef(HOME_SPAWN.clone())
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

  const openMemory = useCallback((memoryId: string) => {
    const query = new URLSearchParams({ memoryId, node: memoryId, from: 'home-memory-sanctuary' })
    requestUraiWorldTravel({
      destination: 'life-map',
      href: `/life-map?${query.toString()}`,
      entryPortal: 'home-memory',
      cameraCheckpoint: 'selected-memory-arrival',
      context: { memoryId },
    })
  }, [])

  const activateNearby = useCallback(() => {
    if (nearby.current === 'orb') onOrbOpen()
    if (nearby.current === 'avatar') window.dispatchEvent(new CustomEvent('urai:home-avatar-open', { detail: { source: 'home-sanctuary-walk' } }))
    if (nearby.current === 'ground') travel('infrastructure-hub')
    if (nearby.current === 'life-map') travel('life-map')
  }, [onOrbOpen, travel])

  const reset = useCallback(() => {
    playerPosition.current.copy(HOME_SPAWN)
    walkTarget.current = null
    yaw.current = 0
    pitch.current = -.035
  }, [])

  const input = useMovementInput({ onInteract: activateNearby, onEscape: reset, onReset: reset })
  const look = useDragLook({ yaw, pitch, sensitivity: reducedMotion ? .0024 : .0037, onDragState: setDragging })
  if (!webglAvailable) return null

  const artStyle = {
    '--home-authored-desktop': assetCssStack(homeAssets.desktop),
    '--home-authored-mobile': assetCssStack(homeAssets.mobile),
    '--home-parallax-x': '0px',
    '--home-parallax-y': '0px',
  } as CSSProperties

  const prompt = nearbyState === 'orb'
    ? 'The Orb is listening'
    : nearbyState === 'avatar'
      ? 'Your presence is here'
      : nearbyState === 'ground'
        ? 'Ground is within reach'
        : nearbyState === 'life-map'
          ? 'Life Map is within reach'
          : 'Move through Home'

  const detail = nearbyState
    ? 'Press Enter or tap again'
    : 'WASD / arrows · click the path · drag to look'

  return (
    <div
      ref={shellRef}
      className="urai-home-embodied-shell"
      style={artStyle}
      data-home-spatial-renderer="webgl"
      data-home-movement="walk-keyboard-click-touch"
      data-home-pointer-lock="false"
      data-home-visible-world="living-sanctuary-memory-portals"
      data-home-ready="warming"
      data-home-explored="false"
      data-home-player-x="0.000"
      data-home-player-z="7.350"
      data-home-distance="0.000"
      data-home-moving="false"
      data-home-camera-mode={dragging ? 'look' : 'embodied'}
      aria-label="Walkable URAI personal sanctuary"
      {...look}
    >
      <div className="urai-home-embodied-art" aria-hidden="true" />
      <Canvas
        shadows
        className="urai-home-spatial-canvas urai-home-embodied-canvas"
        style={{ position: 'absolute', inset: 0 }}
        dpr={[1, 1.35]}
        frameloop="always"
        camera={{ position: [0, 1.66, 7.35], fov: 55, near: .08, far: 150 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <HomeScene
          input={input}
          yaw={yaw}
          pitch={pitch}
          walkTarget={walkTarget}
          playerPosition={playerPosition}
          nearby={nearby}
          nearbyState={nearbyState}
          reducedMotion={reducedMotion}
          shellRef={shellRef}
          onNearbyChange={setNearbyState}
          onOrbOpen={onOrbOpen}
          onTravel={travel}
          onMemoryOpen={openMemory}
        />
      </Canvas>

      <div className="urai-home-movement-prompt" role="status" aria-live="polite" data-nearby={nearbyState ?? 'none'}>
        <strong>{prompt}</strong>
        <span>{detail}</span>
      </div>

      <MovementHelp
        realm="Home"
        summary="Walk through a living sanctuary of memory portals, your embodied presence, the Orb, Ground doorway, and Life Map threshold."
        controls="WASD or arrows move. Click the path or a memory portal to approach. Drag to look. Enter interacts. R resets."
      />
      <MobileMovementPad input={input} label="Home movement controls" />

      <nav className="urai-home-direct-controls" data-movement-ui="true" aria-label="Direct Home destinations">
        <button type="button" aria-label="Open Orb directly" onClick={onOrbOpen}><span aria-hidden="true" />Orb</button>
        <button type="button" aria-label="Open Ground directly" onClick={() => travel('infrastructure-hub')}><span aria-hidden="true" />Ground</button>
        <button type="button" aria-label="Open Life Map directly" onClick={() => travel('life-map')}><span aria-hidden="true" />Life Map</button>
      </nav>

      <style jsx>{`
        .urai-home-embodied-shell{position:absolute;inset:0;overflow:hidden;touch-action:none;cursor:grab;isolation:isolate;background:#01050d}.urai-home-embodied-shell[data-home-camera-mode='look']{cursor:grabbing}
        .urai-home-embodied-art{position:absolute;inset:-3%;z-index:0;background-image:linear-gradient(180deg,rgba(1,6,14,.56),rgba(1,7,14,.68) 52%,rgba(1,5,11,.9)),var(--home-authored-desktop);background-size:cover;background-position:calc(50% + var(--home-parallax-x,0px)) calc(48% + var(--home-parallax-y,0px));background-repeat:no-repeat;filter:saturate(.72) contrast(1.06) brightness(.3);transform:scale(1.06);pointer-events:none;opacity:.42}
        :global(.urai-home-embodied-canvas){z-index:1;background:transparent!important}
        .urai-home-movement-prompt{position:absolute;left:50%;bottom:max(100px,calc(env(safe-area-inset-bottom) + 90px));z-index:27;transform:translateX(-50%);display:grid;gap:3px;min-width:min(330px,calc(100vw - 32px));padding:10px 15px;border:1px solid rgba(207,250,254,.12);border-radius:999px;background:rgba(2,10,22,.42);box-shadow:0 16px 50px rgba(0,0,0,.2);backdrop-filter:blur(14px);text-align:center;pointer-events:none;transition:opacity .35s ease,transform .35s ease,border-color .2s ease}.urai-home-movement-prompt strong{font:800 10px/1.2 Inter,system-ui;letter-spacing:.09em;text-transform:uppercase;color:#eefcff}.urai-home-movement-prompt span{font:600 9px/1.3 Inter,system-ui;color:rgba(199,235,247,.62)}.urai-home-movement-prompt[data-nearby]:not([data-nearby='none']){border-color:rgba(207,250,254,.3);background:rgba(2,10,22,.62)}
        .urai-home-embodied-shell[data-home-explored='true'] .urai-home-movement-prompt[data-nearby='none']{opacity:.3;transform:translateX(-50%) translateY(7px)}
        .urai-home-direct-controls{position:absolute;right:max(14px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));z-index:29;display:flex;gap:7px}.urai-home-direct-controls button{display:inline-flex;align-items:center;gap:7px;min-height:48px;max-width:48px;overflow:hidden;padding:0 14px;border:1px solid rgba(207,250,254,.14);border-radius:999px;background:rgba(2,12,26,.52);color:rgba(239,253,255,.82);font:750 10px/1 Inter,system-ui;white-space:nowrap;transition:max-width .22s ease,border-color .18s ease,background .18s ease,transform .18s ease}.urai-home-direct-controls button span{width:7px;height:7px;flex:0 0 auto;border-radius:50%;background:#7cecf2;box-shadow:0 0 12px rgba(124,236,242,.55)}.urai-home-direct-controls button:nth-child(2) span{background:#88d5ad}.urai-home-direct-controls button:nth-child(3) span{background:#c4b5fd}.urai-home-direct-controls button:hover,.urai-home-direct-controls button:focus-visible{max-width:150px;border-color:rgba(207,250,254,.52);background:rgba(2,12,26,.78);transform:translateY(-2px);outline:2px solid rgba(255,255,255,.9);outline-offset:2px}
        @media(max-width:700px){.urai-home-embodied-art{background-image:linear-gradient(180deg,rgba(1,6,14,.62),rgba(1,7,14,.72) 50%,rgba(1,5,11,.92)),var(--home-authored-mobile);opacity:.38}.urai-home-movement-prompt{bottom:max(204px,calc(env(safe-area-inset-bottom) + 194px));min-width:min(292px,calc(100vw - 24px));padding-inline:13px}.urai-home-direct-controls{right:max(9px,env(safe-area-inset-right));bottom:max(9px,env(safe-area-inset-bottom))}.urai-home-direct-controls button{min-height:46px;max-width:46px;padding-inline:13px}}
        @media(prefers-reduced-motion:reduce){.urai-home-embodied-art{transform:none}.urai-home-movement-prompt,.urai-home-direct-controls button{transition-duration:1ms}}
      `}</style>
    </div>
  )
}
