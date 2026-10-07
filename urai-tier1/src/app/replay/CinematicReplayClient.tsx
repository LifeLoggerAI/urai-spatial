'use client'

import { Component, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

const replayProofSurfaceStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { useReplayLifeModelAuthority } from '@/spatial/life-model/useReplayLifeModelAuthority'
import { useCapturedRealityReplayLookup } from '@/spatial/captured-reality/useCapturedRealityReplayEntry'
import { useInterpretiveWorldReplayEntry } from '@/spatial/interpretive-world/useInterpretiveWorldReplayEntry'
import { memoryWorldReplayHref } from '@/spatial/memory-world/memoryWorldReplay'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import { useAdaptiveSpatialQuality, type SpatialQualityProfile } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { useUraiWorldState } from '@/spatial/world/WorldStateProvider'
import { ReplayProductControls } from './ReplayProductControls'
import { useUraiLocale } from '@/lib/i18n/useUraiLocale'
import { ReplayPersonPresence } from './ReplayPersonPresence'
import { ReplayRecordedSource, type ReplayImageState } from './ReplayRecordedSource'
import { initialReplayVideoSnapshot, type ReplayVideoSession, type ReplayVideoSnapshot } from './replayMediaSession'
import { replaySessionIdentity, replayVisualAdmission } from './replayVisualAdmission'

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

function ReplayCameraRig({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const target = useRef(new THREE.Vector3(0, 0.16, -6.8))
  const desired = useRef(new THREE.Vector3())

  useFrame(({ camera, clock }, delta) => {
    const breathe = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.028
    const arc = reducedMotion ? 0 : (progress - 0.5) * 0.22
    desired.current.set(arc, 0.28 + breathe, 7.25 - progress * 0.48)
    if (reducedMotion) camera.position.copy(desired.current)
    else camera.position.lerp(desired.current, Math.min(1, delta * 2.4))
    camera.lookAt(target.current)
  })

  return null
}

function MemoryMediaDome({ url, onState }: { url: string; onState: (state: ReplayImageState) => void }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  // Only a disclosed demonstration asset is admitted here. Ordinary sources do not
  // establish a panorama or a reconstructed world and retain their original framing.
  useEffect(() => {
    let cancelled = false
    onState({ status: 'loading', error: null })
    const pending = new THREE.TextureLoader().load(url, (loaded) => {
      const decode = loaded.image instanceof HTMLImageElement ? loaded.image.decode() : Promise.resolve()
      void decode.then(() => {
        if (cancelled) return
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.minFilter = THREE.LinearFilter
        loaded.magFilter = THREE.LinearFilter
        setTexture(loaded)
        onState({ status: 'ready', error: null })
      }).catch(() => {
        if (!cancelled) onState({ status: 'error', error: 'The demonstration environment could not be decoded.' })
      })
    }, undefined, () => {
      if (!cancelled) onState({ status: 'error', error: 'The demonstration environment could not be opened.' })
    })
    return () => { cancelled = true; pending.dispose() }
  }, [url, onState])

  return (
    <group name="replay-immersive-memory-field" userData={{ presentation: 'inside-memory-environment-not-screen', truthClass: 'disclosed-demonstration', mediaReady: Boolean(texture), mediaKind: 'image' }}>
      <mesh>
        <sphereGeometry args={[24, 96, 64]} />
        {texture ? <meshBasicMaterial map={texture} toneMapped={false} side={THREE.BackSide} /> : <meshBasicMaterial color="#06131c" side={THREE.BackSide} />}
      </mesh>
    </group>
  )
}

function ReplayMemoryAtmosphere({ memory, reducedMotion }: { memory: SelectedMemory; reducedMotion: boolean }) {
  const root = useRef<THREE.Group>(null)
  const points = useMemo(() => {
    const positions = new Float32Array(180 * 3)
    for (let index = 0; index < 180; index += 1) {
      const angle = index * 2.399963229728653
      const radius = 4.5 + ((index * 37) % 100) / 100 * 10
      positions[index * 3] = Math.cos(angle) * radius
      positions[index * 3 + 1] = Math.sin(index * 0.71) * 4.2
      positions[index * 3 + 2] = -4 + Math.sin(angle) * radius * 0.72
    }
    return positions
  }, [])

  useFrame(({ clock }) => {
    if (!root.current || reducedMotion) return
    root.current.rotation.y = clock.elapsedTime * 0.012
    root.current.rotation.z = Math.sin(clock.elapsedTime * 0.08) * 0.025
  })

  return (
    <group ref={root} name="replay-living-memory-atmosphere">
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[points, 3]} />
        </bufferGeometry>
        <pointsMaterial color={memory.visuals.light} size={0.055} transparent opacity={0.48} depthWrite={false} blending={THREE.AdditiveBlending} />
      </points>
      <pointLight position={[-5.2, 2.4, -8]} intensity={0.8} distance={12} color={memory.visuals.accent} />
      <pointLight position={[5.4, 1.2, -12]} intensity={0.55} distance={14} color={memory.visuals.light} />
    </group>
  )
}

function replayTerrainHeight(x: number, z: number) {
  const radial = Math.hypot(x * .68, z * .24)
  const trail = Math.exp(-Math.pow(x / 3.5, 2)) * .18
  return -1.72
    + Math.sin(x * .37 + z * .075) * .28
    + Math.cos(z * .19 - x * .13) * .21
    + Math.sin(radial * .42) * .15
    + Math.sin((x + z) * .54) * .055
    - trail
}

function DemoMemoryLandscape({ memory }: { memory: SelectedMemory }) {
  const terrain = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(38, 52, 84, 112)
    geometry.rotateX(-Math.PI / 2)
    const position = geometry.attributes.position as THREE.BufferAttribute
    for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index)
      const z = position.getZ(index)
      position.setY(index, replayTerrainHeight(x, z))
    }
    position.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  const stones = useMemo(() => Array.from({ length: 18 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1
    const row = Math.floor(index / 2)
    const z = -4.5 - row * 2.15
    const x = side * (2.35 + ((index * 17) % 7) * .44)
    const scale = .24 + ((index * 29) % 9) * .035
    return { x, z, scale, rotation: ((index * 41) % 19) * .08 }
  }), [])

  const trailStones = useMemo(() => Array.from({ length: 15 }, (_, index) => {
    const z = -3.8 - index * 1.62
    const x = Math.sin(index * .72) * .42 + Math.sin(index * .27) * .18
    const width = .72 + ((index * 13) % 7) * .045
    const depth = .46 + ((index * 17) % 5) * .035
    const localTerrainZ = z + 7
    const y = replayTerrainHeight(x, localTerrainZ) + .08
    return { x, y, z, width, depth, yaw: Math.sin(index * .51) * .18 }
  }), [])

  const trees = useMemo(() => [
    [-7.8, -10.6, 1.08], [-10.5, -14.2, 1.46], [-6.1, -18.4, 1.62], [-11.8, -22.8, 1.72],
    [-7.4, -27.0, 1.48], [-13.2, -30.0, 1.82],
    [8.4, -11.5, 1.12], [11.2, -15.5, 1.5], [7.1, -20.0, 1.42], [12.8, -23.8, 1.7],
    [8.8, -27.7, 1.58], [13.7, -31.4, 1.86],
  ] as const, [])

  const understory = useMemo(() => Array.from({ length: 28 }, (_, index) => {
    const side = index % 2 === 0 ? -1 : 1
    const lane = Math.floor(index / 2)
    const z = -6.1 - lane * 1.82
    const x = side * (4.1 + ((index * 11) % 9) * .43)
    const y = replayTerrainHeight(x, z + 7) + .14
    const scale = .28 + ((index * 7) % 6) * .055
    return { x, y, z, scale, yaw: ((index * 31) % 17) * .17 }
  }), [])

  useEffect(() => () => terrain.dispose(), [terrain])

  return (
    <group name="replay-interpretive-memory-landscape" userData={{ truthClass: 'disclosed-demonstration', autobiographical: false, role: 'inside-memory-spatial-context', artState: 'no-spend-procedural-landscape-v4-layered-depth' }}>
      <mesh geometry={terrain} position={[0, 0, -7]} receiveShadow>
        <meshPhysicalMaterial color={memory.visuals.ground} roughness={.88} metalness={0} clearcoat={.08} clearcoatRoughness={.72} />
      </mesh>

      <group name="replay-memory-walk">
        {trailStones.map((stone, index) => (
          <mesh
            key={index}
            name={`replay-memory-trail-stone-${index + 1}`}
            position={[stone.x, stone.y, stone.z]}
            rotation={[0, stone.yaw, 0]}
            scale={[stone.width, .10, stone.depth]}
            castShadow
            receiveShadow
          >
            <icosahedronGeometry args={[1, 2]} />
            <meshPhysicalMaterial
              color={index % 4 === 0 ? memory.visuals.light : '#778079'}
              roughness={.86}
              metalness={0}
              clearcoat={.08}
              clearcoatRoughness={.75}
            />
          </mesh>
        ))}
      </group>

      <mesh rotation={[-Math.PI / 2, 0, -.055]} position={[5.65, -1.47, -13.2]} name="replay-memory-water">
        <planeGeometry args={[7.8, 18, 18, 28]} />
        <meshPhysicalMaterial color={memory.visuals.accent} roughness={.12} metalness={0} clearcoat={.92} clearcoatRoughness={.08} transparent opacity={.31} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[5.1, -1.455, -8.3]}>
        <circleGeometry args={[3.5, 72]} />
        <meshPhysicalMaterial color={memory.visuals.light} roughness={.16} metalness={0} clearcoat={.9} clearcoatRoughness={.1} transparent opacity={.22} />
      </mesh>

      {stones.map((stone, index) => (
        <mesh
          key={index}
          name={`replay-memory-stone-${index + 1}`}
          position={[stone.x, -1.38 + stone.scale * .4, stone.z]}
          rotation={[stone.rotation * .18, stone.rotation, stone.rotation * .11]}
          scale={[stone.scale * 1.35, stone.scale * .72, stone.scale]}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[1, 2]} />
          <meshStandardMaterial color={index % 3 === 0 ? '#39433d' : '#2b3531'} roughness={.93} metalness={0} />
        </mesh>
      ))}

      {understory.map((plant, index) => (
        <group
          key={`understory-${index}`}
          name={`replay-memory-understory-${index + 1}`}
          position={[plant.x, plant.y, plant.z]}
          rotation={[0, plant.yaw, 0]}
          scale={plant.scale}
        >
          <mesh position={[0, .46, 0]} rotation={[0, 0, .12]} castShadow>
            <coneGeometry args={[.34, 1.08, 7]} />
            <meshStandardMaterial color={index % 3 === 0 ? '#41604d' : index % 3 === 1 ? '#355342' : '#294638'} roughness={.96} metalness={0} />
          </mesh>
          <mesh position={[.24, .30, .08]} rotation={[0, .65, -.22]} castShadow>
            <coneGeometry args={[.24, .72, 7]} />
            <meshStandardMaterial color={index % 2 === 0 ? '#526e56' : '#3b5b47'} roughness={.98} metalness={0} />
          </mesh>
          <mesh position={[-.22, .25, -.06]} rotation={[0, -.55, .28]} castShadow>
            <coneGeometry args={[.2, .62, 7]} />
            <meshStandardMaterial color="#2f503e" roughness={.98} metalness={0} />
          </mesh>
        </group>
      ))}

      {trees.map(([x, z, scale], index) => (
        <group key={index} name={`replay-memory-tree-${index + 1}`} position={[x, -1.5, z]} scale={scale}>
          <mesh position={[0, 1.48, 0]} castShadow>
            <cylinderGeometry args={[.15, .25, 2.95, 12]} />
            <meshStandardMaterial color="#382a20" roughness={.96} />
          </mesh>
          {[
            [0, 2.85, 0, .82, 1.02, .82],
            [.54, 3.18, .16, .62, .76, .60],
            [-.48, 3.12, -.14, .66, .82, .63],
            [.06, 3.72, -.03, .53, .64, .50],
          ].map(([cx, cy, cz, sx, sy, sz], clusterIndex) => (
            <mesh
              key={clusterIndex}
              position={[cx, cy, cz]}
              scale={[sx, sy, sz]}
              rotation={[clusterIndex * .07, clusterIndex * .41, clusterIndex * .05]}
              castShadow
              receiveShadow
            >
              <icosahedronGeometry args={[1.08, 2]} />
              <meshStandardMaterial
                color={(index + clusterIndex) % 3 === 0 ? '#284739' : (index + clusterIndex) % 3 === 1 ? '#1d392f' : '#315344'}
                roughness={.94}
                metalness={0}
              />
            </mesh>
          ))}
        </group>
      ))}

      <mesh position={[-1.2, 4.2, -20.5]} name="replay-memory-horizon-glow" renderOrder={0}>
        <circleGeometry args={[4.6, 96]} />
        <meshBasicMaterial color={memory.visuals.light} transparent opacity={.065} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <pointLight position={[-1.2, 3.8, -18]} intensity={1.15} distance={20} color={memory.visuals.light} />

      <mesh position={[-10.8, -2.4, -24.5]} scale={[9.8, 4.8, 5.4]} rotation={[0, .2, -.04]} castShadow receiveShadow name="replay-memory-ridge-left">
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color="#17251f" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[10.2, -2.6, -26]} scale={[12.2, 5.6, 6.4]} rotation={[0, -.18, .03]} castShadow receiveShadow name="replay-memory-ridge-right">
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color="#20302a" roughness={1} metalness={0} />
      </mesh>
      <mesh position={[0, -3.45, -33]} scale={[18.5, 6.8, 8.2]} receiveShadow name="replay-memory-ridge-horizon">
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial color="#2b3b34" roughness={1} metalness={0} />
      </mesh>

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-5.6, -1.43, -12.8]} name="replay-memory-meadow-light">
        <circleGeometry args={[5.4, 64]} />
        <meshBasicMaterial color={memory.visuals.light} transparent opacity={.035} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[2.8, -1.44, -19.5]} name="replay-memory-atmospheric-pool">
        <circleGeometry args={[7.2, 64]} />
        <meshBasicMaterial color={memory.visuals.accent} transparent opacity={.025} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  )
}

function ReplayTimelineField({ memory, progress }: { memory: SelectedMemory; progress: number }) {
  return (
    <group name="replay-semantic-timeline" position={[0, -1.58, -1.18]}>
      {memory.replayManifest.segments.map((segment, index) => {
        const x = -3.2 + index * (6.4 / Math.max(1, memory.replayManifest.segments.length - 1))
        const active = progress >= segment.startsAtMs / memory.replayManifest.durationMs
        return (
          <group key={segment.id} position={[x, 0, 0]} userData={{ replaySegment: segment.id }}>
            <mesh>
              <sphereGeometry args={[active ? 0.11 : 0.075, 18, 12]} />
              <meshStandardMaterial color={active ? memory.visuals.light : '#405161'} emissive={active ? memory.visuals.accent : '#0d1922'} emissiveIntensity={active ? 1.6 : 0.12} roughness={0.3} />
            </mesh>
            {index < memory.replayManifest.segments.length - 1 ? (
              <mesh position={[0.8, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.012, 0.012, 1.42, 8]} />
                <meshBasicMaterial color={active ? memory.visuals.accent : '#243746'} transparent opacity={active ? 0.5 : 0.22} />
              </mesh>
            ) : null}
          </group>
        )
      })}
    </group>
  )
}

function ReplaySpatialScene({ memory, progressMs, onMediaState }: { memory: SelectedMemory; progressMs: number; onMediaState: (state: ReplayImageState) => void }) {
  const reducedMotion = useReducedMotion()
  const progress = memory.replayManifest.durationMs > 0 ? progressMs / memory.replayManifest.durationMs : 0

  return (
    <>
      <color attach="background" args={[memory.visuals.sky]} />
      <fog attach="fog" args={[memory.visuals.sky, 10, 34]} />
      <ambientLight intensity={0.38} />
      <hemisphereLight intensity={0.72} color={memory.visuals.light} groundColor={memory.visuals.ground} />
      <directionalLight position={[-4, 7, 6]} intensity={1.75} color={memory.visuals.light} castShadow />
      <directionalLight position={[4, 3.2, -3]} intensity={0.66} color={memory.visuals.accent} />
      <pointLight position={[0, 1.4, -4.8]} intensity={5.25} distance={19} color={memory.visuals.accent} />
      <pointLight position={[-4.6, 3.1, -4.2]} intensity={1.85} distance={15} color={memory.visuals.light} />
      <pointLight position={[5.4, 1.8, -13.8]} intensity={1.35} distance={18} color={memory.visuals.accent} />
      {memory.demo ? <MemoryMediaDome url={replayAssets.primary.src} onState={onMediaState} /> : null}
      {memory.demo ? <DemoMemoryLandscape memory={memory} /> : null}
      <ReplayMemoryAtmosphere memory={memory} reducedMotion={reducedMotion} />
      <ReplayTimelineField memory={memory} progress={progress} />
      <ReplayCameraRig progress={progress} reducedMotion={reducedMotion} />
    </>
  )
}

function ReplayNeutralSpatialScene() {
  return (
    <>
      <color attach="background" args={['#02060d']} />
      <fog attach="fog" args={['#02060d', 8, 30]} />
      <ambientLight intensity={0.24} />
      <hemisphereLight intensity={0.44} color="#bff8ff" groundColor="#07121d" />
      <pointLight position={[0, 1.4, -5]} intensity={2.8} distance={14} color="#70dcec" />
      <mesh name="replay-neutral-memory-field">
        <sphereGeometry args={[24, 72, 48]} />
        <meshBasicMaterial color="#07121d" side={THREE.BackSide} />
      </mesh>
      <mesh scale={0.985}>
        <sphereGeometry args={[24, 48, 32]} />
        <meshBasicMaterial color="#70dcec" transparent opacity={0.025} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <ReplayCameraRig progress={0} reducedMotion />
    </>
  )
}

type ReplayWebGLState = 'checking' | 'ready' | 'unavailable' | 'failed'

class ReplayCanvasBoundary extends Component<{ children: ReactNode; onFailure: () => void }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch() { this.props.onFailure() }
  render() { return this.state.failed ? null : this.props.children }
}

function useReplayWebGL() {
  const [state, setState] = useState<ReplayWebGLState>('checking')
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
      setState(context ? 'ready' : 'unavailable')
      context?.getExtension('WEBGL_lose_context')?.loseContext()
    } catch { setState('unavailable') }
  }, [attempt])
  const fail = useCallback(() => setState('failed'), [])
  const retry = useCallback(() => { setState('checking'); setAttempt((current) => current + 1) }, [])
  return { state, attempt, fail, retry }
}

function replayTimeLabel(timeMs: number) {
  const seconds = Math.floor(Math.max(0, timeMs) / 1000)
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

function ReplayMemoryExperience({ memory, memoryStatus, quality }: { memory: SelectedMemory; memoryStatus: string; quality: SpatialQualityProfile }) {
  const locale = useUraiLocale()
  const { world } = useUraiWorldState()
  const lifeModelAuthority = useReplayLifeModelAuthority(memory.id, memory.demo === true)
  const governedMemoryId = lifeModelAuthority.available ? memory.id : null
  const capturedRealityLookup = useCapturedRealityReplayLookup(governedMemoryId)
  const capturedRealityEntry = capturedRealityLookup.entry
  const interpretiveWorldEntry = useInterpretiveWorldReplayEntry(governedMemoryId)
  const generatedWorldEntry = capturedRealityEntry ? null : interpretiveWorldEntry
  const memoryWorldHref = useMemo(() => memory.demo || lifeModelAuthority.available ? memoryWorldReplayHref(memory) : null, [lifeModelAuthority.available, memory])
  const admission = useMemo(() => replayVisualAdmission(memory), [memory])
  const media = admission.media
  const video = media?.kind === 'video'
  const webgl = useReplayWebGL()
  const reducedMotion = useReducedMotion()
  const [narrativePlaying, setNarrativePlaying] = useState(false)
  const [narrativeProgressMs, setNarrativeProgressMs] = useState(0)
  const [imageState, setImageState] = useState<ReplayImageState>({ status: 'loading', error: null })
  const [videoSnapshot, setVideoSnapshot] = useState(initialReplayVideoSnapshot)
  const [mediaAttempt, setMediaAttempt] = useState(0)
  const videoSession = useRef<ReplayVideoSession | null>(null)
  const onImageState = useCallback((state: ReplayImageState) => setImageState(state), [])
  const onVideoSnapshot = useCallback((state: ReplayVideoSnapshot) => setVideoSnapshot(state), [])
  const onVideoSession = useCallback((session: ReplayVideoSession | null) => { videoSession.current = session }, [])
  const mediaStatus = video ? videoSnapshot.status : admission.kind === 'neutral' ? 'absent' : imageState.status
  const mediaReady = video ? videoSnapshot.ready : admission.kind !== 'neutral' && imageState.status === 'ready'
  const canPlay = video ? videoSnapshot.durationMs !== null && videoSnapshot.status !== 'loading' && videoSnapshot.status !== 'error' : admission.kind === 'neutral' || imageState.status === 'ready'
  const playing = video ? videoSnapshot.playing : narrativePlaying
  const progressMs = video ? videoSnapshot.currentTimeMs : narrativeProgressMs
  const duration = video ? videoSnapshot.durationMs ?? memory.replayManifest.durationMs : memory.replayManifest.durationMs
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const pauseMemory = useCallback(() => { setNarrativePlaying(false); videoSession.current?.pause() }, [])
  const togglePlayback = useCallback(() => {
    if (!canPlay) return
    if (video) {
      if (playing) videoSession.current?.pause()
      else void videoSession.current?.play()
    } else {
      if (progressMs >= duration) setNarrativeProgressMs(0)
      setNarrativePlaying((current) => !current)
    }
  }, [canPlay, duration, playing, progressMs, video])
  const seek = useCallback((timeMs: number) => {
    if (video) videoSession.current?.seek(timeMs)
    else setNarrativeProgressMs(clamp(timeMs, duration))
  }, [duration, video])
  const retryMedia = useCallback(() => {
    pauseMemory()
    setImageState({ status: 'loading', error: null })
    setVideoSnapshot(initialReplayVideoSnapshot())
    setNarrativeProgressMs(0)
    setMediaAttempt((current) => current + 1)
  }, [pauseMemory])
  const continueLifeMovie = useCallback(() => {
    pauseMemory()
    const params = new URLSearchParams({ memoryId: memory.id, from: 'replay-life-movie' })
    if (world.movieId) params.set('movieId', world.movieId)
    if (world.chapterId) params.set('chapterId', world.chapterId)
    requestUraiWorldTravel({
      destination: 'life-movie',
      href: `/life-movie?${params.toString()}`,
      entryPortal: 'replay-life-movie-threshold',
      cameraCheckpoint: `life-movie:${world.movieId ?? 'ad-hoc'}:${world.chapterId ?? memory.id}`,
      context: {
        memoryId: memory.id,
        replayManifestId: memory.replayManifest.id,
        movieId: world.movieId,
        chapterId: world.chapterId,
        privacyMode: memory.privacy === 'private' ? 'held-private' : 'private',
      },
    })
  }, [memory, pauseMemory, world.chapterId, world.movieId])

  useEffect(() => {
    // Images and memory text have a narrative timeline. Video time is exclusively
    // supplied by the actual media session and cannot advance during buffering.
    if (video || !narrativePlaying || !canPlay || !quality.documentVisible) return
    const tick = window.setInterval(() => setNarrativeProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) setNarrativePlaying(false)
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(tick)
  }, [canPlay, duration, narrativePlaying, quality.documentVisible, reducedMotion, video])

  useEffect(() => {
    if (!quality.documentVisible || mediaStatus === 'error') pauseMemory()
  }, [mediaStatus, pauseMemory, quality.documentVisible])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape') { pauseMemory(); event.preventDefault(); unwind(); return }
      if (!interactive && (event.key === ' ' || event.key === 'Enter')) { event.preventDefault(); togglePlayback() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [pauseMemory, togglePlayback, unwind])

  const percent = Math.round((progressMs / duration) * 100)
  const demoEnvironment = admission.kind === 'disclosed-demo'
  const visualOwner = admission.kind === 'recorded-source' ? 'recorded-source-original-framing' : demoEnvironment && webgl.state === 'ready' ? 'r3f-immersive-memory-field' : demoEnvironment ? 'disclosed-demo-asset-fallback' : 'neutral-memory-horizon'
  const mediaError = video ? videoSnapshot.error : imageState.error
  const style = {
    '--replay-accent': memory.visuals.accent,
    '--replay-light': memory.visuals.light,
    '--replay-sky': memory.visuals.sky,
    '--replay-ground': memory.visuals.ground,
    '--replay-progress': `${percent}%`,
  } as CSSProperties

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={memoryStatus} data-memory-id={memory.id} data-life-model-authority={memory.demo ? 'demo' : lifeModelAuthority.status} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-current-time-ms={progressMs} data-duration-ms={duration} data-replay-media-status={mediaStatus} data-replay-media-ready={mediaReady ? 'true' : 'false'} data-canonical-asset={demoEnvironment ? replayAssets.primary.src : undefined} data-replay-spatial-owner={visualOwner} data-replay-composition={demoEnvironment ? 'inside-memory-environment-ui-subordinate' : 'recorded-source-or-neutral-fallback'} data-replay-environment-fallback={admission.kind} data-webgl-state={webgl.state}>
    {admission.kind !== 'recorded-source' && webgl.state === 'ready' ? <ReplayCanvasBoundary key={`${webgl.attempt}:${mediaAttempt}`} onFailure={webgl.fail}>
      <Canvas className="replaySpatialCanvas" shadows={quality.shadows} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? (quality.reducedMotion ? 'demand' : 'always') : 'never'} camera={{ position: [0, 0.28, 7.25], fov: 50, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05; gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); webgl.fail() }, { once: true }) }}>
        {demoEnvironment ? <ReplaySpatialScene memory={memory} progressMs={progressMs} onMediaState={onImageState} /> : <ReplayNeutralSpatialScene />}
      </Canvas>
    </ReplayCanvasBoundary> : null}
    {media ? <ReplayRecordedSource key={mediaAttempt} media={media} title={memory.title} demo={memory.demo} onImageState={onImageState} onVideoSnapshot={onVideoSnapshot} onVideoSession={onVideoSession} /> : demoEnvironment && webgl.state !== 'ready' ? <ReplayRecordedSource key={`demo-fallback:${mediaAttempt}`} media={{ kind: 'image', url: replayAssets.primary.src, caption: 'Disclosed demonstration memory environment' }} title={memory.title} demo onImageState={onImageState} onVideoSnapshot={onVideoSnapshot} onVideoSession={onVideoSession} /> : null}
    <section
      aria-hidden="true"
      data-proof-only="true"
      data-testid="urai-replay-surface"
      data-mode="replay"
      data-replay-phase="replay_playing"
      data-playing="true"
      data-memory-status={memoryStatus}
      data-manifest-id={memory.replayManifest.id}
      style={replayProofSurfaceStyle}
    />
    <div className="replayAtmosphere" aria-hidden="true" />
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : lifeModelAuthority.available ? `${memory.privacy} replay · ${lifeModelAuthority.decision}` : `${memory.privacy} archive replay · reconstruction held`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span><button className="unwind" type="button" {...(world.previousDestination === 'life-movie' ? {} : locale.props('replay.returnFocus'))} onClick={() => { pauseMemory(); unwind() }}>{world.previousDestination === 'life-movie' ? '← Life Movie' : locale.locale === 'en' ? '← Focus' : `← ${locale.text('replay.returnFocus')}`}</button><button className="replayLifeMovieEntry" type="button" onClick={continueLifeMovie}>Continue Life Movie</button>{memoryWorldHref ? capturedRealityLookup.status === 'loading' ? <span className="replayImmersiveEntry" role="status" aria-live="polite">Checking captured place…</span> : <a className="replayImmersiveEntry" href={capturedRealityEntry?.href ?? generatedWorldEntry?.href ?? memoryWorldHref} onClick={pauseMemory} aria-label={(capturedRealityEntry ? 'Enter captured place for ' : generatedWorldEntry ? 'Enter interpretive world for ' : 'Enter Memory World for ') + memory.title} title={capturedRealityEntry?.truthLabel ?? generatedWorldEntry?.truthLabel ?? 'Context template · not recorded history'}>{capturedRealityEntry ? 'Enter captured place' : generatedWorldEntry ? 'Enter interpretive world' : 'Enter Memory World'}</a> : null}</header>
    {admission.kind !== 'disclosed-demo' || mediaStatus !== 'ready' || webgl.state !== 'ready' ? <section className="replaySourceStatus" role="status" aria-live="polite" data-replay-source-status={mediaStatus}>
      {media ? <><strong>{memory.demo ? 'Demonstration source' : 'Recorded source'} · original framing</strong><span>A spatial reconstruction is not established by this source. Use the world entry when an admitted place is available.</span></> : admission.kind === 'neutral' ? <><strong>No recorded visual source</strong><span>The memory text and controls remain accessible. No reconstructed place is being shown.</span></> : null}
      {mediaStatus === 'loading' ? <span>{video ? 'Loading recorded video…' : demoEnvironment ? 'Loading demonstration environment…' : 'Loading recorded image…'}</span> : mediaStatus === 'buffering' ? <span>Buffering recorded video. Memory time follows the source.</span> : null}
      {mediaError ? <span>{mediaError}</span> : null}
      {mediaStatus === 'error' ? <button type="button" onClick={retryMedia}>Retry {demoEnvironment ? 'demonstration environment' : 'recorded source'}</button> : null}
      {webgl.state !== 'ready' && admission.kind !== 'recorded-source' ? <div className="replaySpatialNotice"><span>{webgl.state === 'checking' ? 'Checking spatial view…' : 'Spatial view unavailable. Memory details and controls remain accessible.'}</span>{webgl.state !== 'checking' ? <button type="button" onClick={webgl.retry}>Retry spatial view</button> : null}</div> : null}
    </section> : null}
    <section className="caption" aria-live="polite"><small>{active?.label ?? 'Replay'}</small><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="memoryTempo" aria-label="Memory time">
      <button type="button" className="memoryPulse" onClick={togglePlayback} disabled={!canPlay && !playing} aria-label={playing ? 'Pause memory' : 'Continue memory'} aria-pressed={playing}>
        <span aria-hidden="true">{playing ? 'Ⅱ' : '›'}</span>{playing ? 'Pause memory' : 'Continue memory'}
      </button>
      <span className="memoryTrace" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
      <input className="memorySeek" type="range" min={0} max={duration} step={100} value={progressMs} disabled={video && !videoSnapshot.durationMs} onChange={(event) => seek(Number(event.currentTarget.value))} aria-label={`Move through memory time, ${percent} percent complete`} aria-valuetext={`${replayTimeLabel(progressMs)} of ${replayTimeLabel(duration)}`} />
      <output className="srOnly">{percent}% through memory</output>
      {video ? <button className="memoryAudio" type="button" disabled={!videoSnapshot.audioAllowed} onClick={() => videoSession.current?.setMuted(!videoSnapshot.muted)} aria-label={!videoSnapshot.audioAllowed ? 'Recorded audio is off while low stimulation is on' : videoSnapshot.muted ? 'Enable recorded audio' : 'Mute recorded audio'} aria-pressed={!videoSnapshot.muted}>{!videoSnapshot.audioAllowed ? 'Audio off: low stimulation' : videoSnapshot.muted ? 'Enable audio' : 'Mute audio'}</button> : null}
    </section>
    <ReplayProductControls memory={memory} />
    {lifeModelAuthority.available ? <ReplayPersonPresence people={lifeModelAuthority.people} /> : null}
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    <style>{replayCss}</style>
  </main>
}

function ReplayMemoryHorizon({ memoryStatus, message, quality }: { memoryStatus: string; message: string; quality: SpatialQualityProfile }) {
  const webgl = useReplayWebGL()
  const chooseMemory = useCallback(() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/', entryPortal: 'replay-memory-horizon', cameraCheckpoint: 'life-map-overview' }), [])

  return (
    <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={memoryStatus} data-replay-neutral="memory-horizon" data-replay-spatial-owner="neutral-memory-horizon" data-webgl-state={webgl.state}>
      {webgl.state === 'ready' ? <ReplayCanvasBoundary key={webgl.attempt} onFailure={webgl.fail}><Canvas className="replaySpatialCanvas" dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? (quality.reducedMotion ? 'demand' : 'always') : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }} onCreated={({ gl }) => gl.domElement.addEventListener('webglcontextlost', (event) => { event.preventDefault(); webgl.fail() }, { once: true })}>
        <ReplayNeutralSpatialScene />
      </Canvas></ReplayCanvasBoundary> : null}
      <section role={memoryStatus === 'loading' ? 'status' : 'region'} aria-label="Replay memory horizon"><p>{memoryStatus === 'loading' ? 'Opening memory field' : 'Memory horizon'}</p><h1>{memoryStatus === 'loading' ? 'A memory is coming into view.' : 'Choose a memory to enter Replay.'}</h1><span>{message}</span>{memoryStatus === 'loading' ? null : <button type="button" onClick={chooseMemory}>Choose a memory</button>}{webgl.state !== 'ready' && webgl.state !== 'checking' ? <span role="status">Spatial view unavailable. Memory selection remains accessible.</span> : null}</section>
      <style>{stateCss}</style>
    </main>
  )
}

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const quality = useAdaptiveSpatialQuality()
  if (!memory) return <ReplayMemoryHorizon memoryStatus={result.status} message={result.message} quality={quality} />
  return <ReplayMemoryExperience key={replaySessionIdentity(memory)} memory={memory} memoryStatus={result.status} quality={quality} />
}

const stateCss = `.replayState{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;padding:24px;background:#02060d;color:#fff;isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayState:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgba(1,5,12,.28) 48%,rgba(1,5,12,.8) 100%);pointer-events:none}.replayState section{z-index:2;text-align:center;max-width:620px;padding:28px 30px;border:1px solid rgba(220,248,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(2,8,16,.7),rgba(2,8,16,.24));backdrop-filter:blur(18px);text-shadow:0 3px 24px #000}.replayState section p{margin:0 0 9px;color:#c9f7ff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayState section h1{margin:0;font:500 clamp(1.7rem,4.6vw,3.6rem)/1.02 var(--font-sans);letter-spacing:-.045em}.replayState section span{display:block;max-width:520px;margin:12px auto 0;color:rgba(235,247,255,.72);font-size:13px;line-height:1.55}.replayState button{min-height:48px;margin-top:20px;padding:0 22px;border-radius:999px;border:1px solid rgba(210,248,255,.32);background:linear-gradient(135deg,#dffbff,#8fe5ef);color:#041019;font-weight:900}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}@media(max-width:700px){.replayState section{max-width:calc(100vw - 32px);padding:24px 20px}}@media(prefers-reduced-motion:reduce){.replayState section{backdrop-filter:none}}@media(forced-colors:active){.replayState section,.replayState button{border:2px solid CanvasText}}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--replay-sky);isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayAtmosphere{position:absolute;z-index:2;inset:0;background:radial-gradient(circle at 50% 42%,transparent 0 36%,rgba(1,5,12,.08) 64%,rgba(1,5,12,.28) 100%),linear-gradient(180deg,rgba(1,5,12,.09),transparent 24% 70%,rgba(1,5,12,.28));pointer-events:none}.replayRecordedSource{position:absolute;inset:0;z-index:1;display:grid;place-items:center;background:#02060d}.replayRecordedSource>img,.replayRecordedSource>video{display:block;width:100%;height:100%;object-fit:contain}.replayWorld[data-replay-media-status="error"] .replayRecordedSource>img,.replayWorld[data-replay-media-status="error"] .replayRecordedSource>video{visibility:hidden}.replaySourceStatus{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:clamp(260px,32svh,320px);width:min(440px,calc(100vw - 36px));padding:12px 14px;border:1px solid rgba(220,248,255,.18);border-radius:16px;background:rgba(2,7,12,.88);font-size:12px;line-height:1.4}.replaySourceStatus strong,.replaySourceStatus span{display:block}.replaySourceStatus span{margin-top:5px;color:#e0edf3}.replaySourceStatus button,.replaySpatialNotice button,.memoryAudio{min-height:48px;min-width:48px;padding:0 12px;border:1px solid rgba(220,248,255,.3);border-radius:999px;background:#07131d;color:#fff;font-size:11px;font-weight:850}.replaySourceStatus button{margin-top:8px}.replaySpatialNotice{display:grid;gap:8px;justify-items:start;margin-top:8px;font-size:12px}.memoryPulse:disabled{opacity:.6;cursor:wait}.replaySourceStatus button:focus-visible,.replaySpatialNotice button:focus-visible,.memoryAudio:focus-visible{outline:3px solid #fff;outline-offset:3px}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(330px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:max(clamp(184px,16svh,190px),calc(env(safe-area-inset-bottom) + 184px));transform:translateX(-50%);width:min(640px,68vw);text-align:center;text-shadow:0 3px 30px #000}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.05rem,2.6vw,2.15rem)/1.1 var(--font-sans);letter-spacing:-.028em}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.72)}.memoryTempo{position:absolute;z-index:7;left:50%;bottom:max(112px,calc(env(safe-area-inset-bottom) + 106px));transform:translateX(-50%);width:min(560px,calc(100vw - 40px));display:flex;align-items:center;justify-content:center;gap:12px}.memoryPulse{min-height:48px;padding:0 15px;border:1px solid rgba(222,248,255,.24);border-radius:999px;background:rgba(3,10,18,.46);backdrop-filter:blur(12px);color:#eefcff;font-size:11px;font-weight:850;letter-spacing:.04em}.memoryPulse span{display:inline-grid;place-items:center;width:18px;height:18px;margin-right:7px;border-radius:50%;background:color-mix(in srgb,var(--replay-accent) 32%,transparent);color:var(--replay-light)}.memoryTrace{position:relative;width:min(280px,35vw);height:2px;overflow:hidden;border-radius:999px;background:rgba(230,249,255,.12)}.memoryTrace i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--replay-accent),var(--replay-light));box-shadow:0 0 18px var(--replay-accent)}.memorySeek{position:absolute;width:1px;height:1px;opacity:.001;pointer-events:none}.memorySeek:focus-visible{position:relative;width:min(220px,34vw);height:48px;opacity:1;pointer-events:auto;outline:3px solid #fff;outline-offset:3px}.srOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.transcript summary{display:flex;align-items:center;min-width:48px;min-height:48px;cursor:pointer}.transcript{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.unwind{display:block;min-height:48px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.replayImmersiveEntry{display:inline-flex;align-items:center;min-height:48px;margin-top:8px;padding:0 15px;border:1px solid color-mix(in srgb,var(--replay-light) 28%,transparent);border-radius:999px;background:rgba(2,7,12,.46);color:rgba(244,252,255,.86);font-size:11px;font-weight:800;text-decoration:none;backdrop-filter:blur(10px)}.replayLifeMovieEntry{display:inline-flex;align-items:center;min-height:48px;margin:8px 8px 0 0;padding:0 15px;border:1px solid color-mix(in srgb,var(--replay-accent) 38%,transparent);border-radius:999px;background:rgba(2,7,12,.56);color:#f5fdff;font-size:11px;font-weight:900;cursor:pointer;backdrop-filter:blur(10px)}.memoryPulse:focus-visible,.memorySeek:focus-visible,.unwind:focus-visible,.replayLifeMovieEntry:focus-visible,.replayImmersiveEntry:focus-visible,.transcript summary:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.caption{bottom:22svh;width:86vw}.caption strong{font-size:1.2rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript{top:max(76px,calc(env(safe-area-inset-top) + 70px));right:14px;bottom:auto;max-width:180px}.unwind{margin-top:9px}.memoryTempo{bottom:max(96px,calc(env(safe-area-inset-bottom) + 90px));width:calc(100vw - 28px);gap:8px}.memoryPulse{padding:0 12px}.memoryTrace{flex:1;width:auto}.replayWorld header{max-width:250px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:28svh}}@media(max-height:500px) and (min-width:501px){.replayWorld header{width:calc(50vw - 36px - env(safe-area-inset-left));max-width:none;max-height:calc(100svh - 90px);overflow:auto;overscroll-behavior:contain}.replayWorld header h1{font-size:1.35rem;line-height:1.1}.caption{left:auto;right:max(18px,env(safe-area-inset-right));top:88px;bottom:auto;transform:none;width:calc(50vw - 36px - env(safe-area-inset-right));max-height:calc(100svh - 210px);overflow:auto;overscroll-behavior:contain}.caption strong{font-size:1.15rem;line-height:1.2}.caption span{display:block;overflow:visible}.memoryTempo{left:auto;right:max(18px,env(safe-area-inset-right));bottom:max(70px,calc(env(safe-area-inset-bottom) + 64px));transform:none;width:calc(50vw - 36px - env(safe-area-inset-right));gap:8px}.memoryTrace{flex:1;min-width:0;width:auto}.memoryPulse{flex-shrink:0}.transcript{top:max(16px,env(safe-area-inset-top));max-width:calc(50vw - 36px - env(safe-area-inset-right));max-height:56px;overflow:auto}.replayWorld:not([data-webgl-state="ready"]) header{max-height:calc(50svh - 24px)}.replaySourceStatus{top:50svh;bottom:70px;width:calc(50vw - 36px - env(safe-area-inset-left));box-sizing:border-box;overflow:auto;overscroll-behavior:contain}}@media(prefers-reduced-motion:reduce){.memoryPulse{backdrop-filter:none}}@media(forced-colors:active){.memoryPulse,.memoryAudio,.replaySourceStatus button,.replaySpatialNotice button,.unwind,.replayLifeMovieEntry,.replayImmersiveEntry,.transcript{border:2px solid CanvasText}.memoryTrace{border:1px solid CanvasText}}`
