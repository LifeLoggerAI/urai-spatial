'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { ReplayProductControls } from './ReplayProductControls'

const REPLAY_ENVIRONMENT_MODEL = '/assets/urai/generated/models/replay-memory-environment-v1.glb'
const REPLAY_SCREEN_POSITION: [number, number, number] = [0, 0.58, -6.0]

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

function prepareReplayModel(source: THREE.Object3D) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const growthMatch = object.name.match(/^replay-memory-growth(?:-(?:trunk|crown))?-(\d+)$/)
    const retainedGrowth = growthMatch ? [3, 12, 24, 31].includes(Number(growthMatch[1])) : false
    const rejectedPresentation = object.name === 'replay-film-portal'
      || object.name === 'replay-film-veil'
      || object.name === 'replay-camera-track'
      || object.name.startsWith('replay-memory-panel-')
      || (Boolean(growthMatch) && !retainedGrowth)
    if (rejectedPresentation) {
      object.visible = false
      object.userData.uraiRetiredVisualRole = 'v149-no-flat-film-portal-panel-wall-or-repeated-growth-grid'
    }
    object.castShadow = true
    object.receiveShadow = true
    object.frustumCulled = true
  })
  return clone
}

function ReplayCameraRig({ progress, reducedMotion }: { progress: number; reducedMotion: boolean }) {
  const target = useRef(new THREE.Vector3(0, 0.32, -5.9))
  const desired = useRef(new THREE.Vector3())

  useFrame(({ camera, clock }, delta) => {
    const breathe = reducedMotion ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.045
    const arc = reducedMotion ? 0 : (progress - 0.5) * 0.34
    desired.current.set(arc, 0.42 + breathe, 8.4 - progress * 0.75)
    camera.position.lerp(desired.current, Math.min(1, delta * (reducedMotion ? 8 : 2.4)))
    camera.lookAt(target.current)
  })

  return null
}

function MemoryMediaSurface({ media, playing }: { media: SelectedMemoryMedia | undefined; playing: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const surfaceGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(8.9, 5.05, 40, 12)
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const normalizedX = x / 4.45
      const depth = -0.86 * normalizedX * normalizedX + Math.sin(y * 1.3) * 0.025
      positions.setZ(index, depth)
    }
    positions.needsUpdate = true
    geometry.computeVertexNormals()
    return geometry
  }, [])

  useEffect(() => {
    let disposed = false
    let localTexture: THREE.Texture | null = null
    let localVideo: HTMLVideoElement | null = null

    setTexture(null)
    const sourceUrl = media?.url ?? replayAssets.primary.src
    const sourceKind = media?.kind ?? 'image'

    if (sourceKind === 'image') {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(sourceUrl, (loaded) => {
        if (disposed) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = THREE.SRGBColorSpace
        loaded.minFilter = THREE.LinearFilter
        localTexture = loaded
        setTexture(loaded)
      })
    }

    if (sourceKind === 'video') {
      const video = document.createElement('video')
      video.src = sourceUrl
      video.crossOrigin = 'anonymous'
      video.playsInline = true
      video.muted = true
      video.loop = false
      video.preload = 'metadata'
      localVideo = video
      videoRef.current = video
      const videoTexture = new THREE.VideoTexture(video)
      videoTexture.colorSpace = THREE.SRGBColorSpace
      videoTexture.minFilter = THREE.LinearFilter
      videoTexture.magFilter = THREE.LinearFilter
      localTexture = videoTexture
      setTexture(videoTexture)
    }

    return () => {
      disposed = true
      localVideo?.pause()
      if (localVideo) localVideo.removeAttribute('src')
      if (videoRef.current === localVideo) videoRef.current = null
      localTexture?.dispose()
    }
  }, [media])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (playing) void video.play().catch(() => undefined)
    else video.pause()
  }, [playing])

  return (
    <group name="replay-v149-curved-memory-horizon" userData={{ visualRepair: 'no-flat-fog-card-or-portal-ring' }}>
      <mesh position={REPLAY_SCREEN_POSITION} geometry={surfaceGeometry}>
        {texture
          ? <meshBasicMaterial map={texture} toneMapped={false} side={THREE.DoubleSide} />
          : <meshStandardMaterial color="#06131c" emissive="#1f8094" emissiveIntensity={0.08} roughness={0.92} metalness={0.01} side={THREE.DoubleSide} />}
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

function ReplaySpatialScene({ memory, playing, progressMs }: { memory: SelectedMemory; playing: boolean; progressMs: number }) {
  const gltf = useGLTF(REPLAY_ENVIRONMENT_MODEL)
  const model = useMemo(() => prepareReplayModel(gltf.scene), [gltf.scene])
  const reducedMotion = useReducedMotion()
  const progress = memory.replayManifest.durationMs > 0 ? progressMs / memory.replayManifest.durationMs : 0
  const media = memory.sourceMedia.find((item) => item.kind === 'video' || item.kind === 'image')

  return (
    <>
      <color attach="background" args={[memory.visuals.sky]} />
      <fog attach="fog" args={[memory.visuals.sky, 10, 34]} />
      <ambientLight intensity={0.26} />
      <hemisphereLight intensity={0.5} color={memory.visuals.light} groundColor={memory.visuals.ground} />
      <directionalLight position={[-4, 7, 6]} intensity={1.3} color={memory.visuals.light} castShadow />
      <directionalLight position={[4, 2, -3]} intensity={0.42} color={memory.visuals.accent} />
      <pointLight position={[0, 1.4, -4.6]} intensity={3.4} distance={14} color={memory.visuals.accent} />
      <primitive object={model} name="replay-memory-environment-v1" />
      <MemoryMediaSurface media={media} playing={playing} />
      <ReplayTimelineField memory={memory} progress={progress} />
      <ReplayCameraRig progress={progress} reducedMotion={reducedMotion} />
    </>
  )
}

function ReplayNeutralSpatialScene() {
  const gltf = useGLTF(REPLAY_ENVIRONMENT_MODEL)
  const model = useMemo(() => prepareReplayModel(gltf.scene), [gltf.scene])
  return (
    <>
      <color attach="background" args={['#02060d']} />
      <fog attach="fog" args={['#02060d', 8, 30]} />
      <ambientLight intensity={0.24} />
      <hemisphereLight intensity={0.44} color="#bff8ff" groundColor="#07121d" />
      <pointLight position={[0, 1.4, -5]} intensity={2.8} distance={14} color="#70dcec" />
      <primitive object={model} name="replay-memory-horizon-environment" />
      <ReplayCameraRig progress={0} reducedMotion />
    </>
  )
}

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const quality = useAdaptiveSpatialQuality()
  const [playing, setPlaying] = useState(false)
  const [progressMs, setProgressMs] = useState(0)
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const chooseMemory = useCallback(() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/', entryPortal: 'replay-memory-horizon', cameraCheckpoint: 'life-map-overview' }), [])

  useEffect(() => {
    if (!memory || !playing) return
    const tick = window.setInterval(() => setProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) setPlaying(false)
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(tick)
  }, [duration, memory, playing, reducedMotion])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape') { event.preventDefault(); unwind(); return }
      if (!interactive && (event.key === ' ' || event.key === 'Enter') && memory) { event.preventDefault(); setPlaying((value) => !value) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [memory, unwind])

  if (!memory) return (
    <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={result.status} data-canonical-asset={replayAssets.primary.src} data-replay-neutral="memory-horizon" data-replay-spatial-owner="r3f-memory-theater">
      <Canvas className="replaySpatialCanvas" dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}>
        <ReplayNeutralSpatialScene />
      </Canvas>
      <section role={result.status === 'loading' ? 'status' : 'region'} aria-label="Replay memory horizon"><p>{result.status === 'loading' ? 'Opening memory field' : 'Memory horizon'}</p><h1>{result.status === 'loading' ? 'A memory is coming into view.' : 'Choose a memory to enter its reconstruction.'}</h1><span>{result.status === 'loading' ? 'The spatial field will open as soon as the selected memory is ready.' : 'Replay begins from a memory in Life Map, so you always arrive with context.'}</span>{result.status === 'loading' ? null : <button type="button" onClick={chooseMemory}>Choose a memory</button>}</section>
      <style>{stateCss}</style>
    </main>
  )

  const percent = Math.round((progressMs / duration) * 100)
  const style = {
    '--replay-accent': memory.visuals.accent,
    '--replay-light': memory.visuals.light,
    '--replay-sky': memory.visuals.sky,
    '--replay-ground': memory.visuals.ground,
    '--replay-asset': assetCssStack(replayAssets.primary),
    '--replay-progress': `${percent}%`,
  } as CSSProperties

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-canonical-asset={replayAssets.primary.src} data-replay-spatial-owner="r3f-memory-theater" data-replay-environment={REPLAY_ENVIRONMENT_MODEL} data-replay-composition="curved-memory-horizon-no-flat-portal-panels">
    <Canvas className="replaySpatialCanvas" shadows={quality.shadows} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
      <ReplaySpatialScene memory={memory} playing={playing} progressMs={progressMs} />
    </Canvas>
    <div className="replayAtmosphere" aria-hidden="true" />
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span><button className="unwind" type="button" onClick={unwind}>← Focus</button></header>
    <section className="caption" aria-live="polite"><small>{active?.label ?? 'Replay'}</small><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="controls" aria-label="Replay controls">
      <button type="button" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button>
      <input type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setProgressMs(Number(event.currentTarget.value))} aria-label={`Replay timeline, ${percent} percent complete`} />
      <output>{percent}%</output>
    </section>
    <ReplayProductControls memory={memory} />
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;padding:24px;background:#02060d;color:#fff;isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayState:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgba(1,5,12,.28) 48%,rgba(1,5,12,.8) 100%);pointer-events:none}.replayState section{z-index:2;text-align:center;max-width:620px;padding:28px 30px;border:1px solid rgba(220,248,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(2,8,16,.7),rgba(2,8,16,.24));backdrop-filter:blur(18px);text-shadow:0 3px 24px #000}.replayState section p{margin:0 0 9px;color:#c9f7ff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayState section h1{margin:0;font:500 clamp(1.7rem,4.6vw,3.6rem)/1.02 var(--font-sans);letter-spacing:-.045em}.replayState section span{display:block;max-width:520px;margin:12px auto 0;color:rgba(235,247,255,.72);font-size:13px;line-height:1.55}.replayState button{min-height:48px;margin-top:20px;padding:0 22px;border-radius:999px;border:1px solid rgba(210,248,255,.32);background:linear-gradient(135deg,#dffbff,#8fe5ef);color:#041019;font-weight:900}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}@media(max-width:700px){.replayState section{max-width:calc(100vw - 32px);padding:24px 20px}}@media(prefers-reduced-motion:reduce){.replayState section{backdrop-filter:none}}@media(forced-colors:active){.replayState section,.replayState button{border:2px solid CanvasText}}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--replay-sky);isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayAtmosphere{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,transparent 0 30%,rgba(0,0,0,.12) 58%,rgba(0,0,0,.78) 100%);pointer-events:none}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:clamp(280px,32svh,350px);transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.25rem,4vw,2.8rem)/1.08 var(--font-sans);letter-spacing:-.035em}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.72)}.controls{position:absolute;z-index:7;left:50%;bottom:max(180px,calc(env(safe-area-inset-bottom) + 174px));transform:translateX(-50%);width:min(680px,calc(100vw - 32px));display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:12px;padding:12px 14px;border:1px solid rgba(255,255,255,.22);border-radius:24px;background:rgba(2,7,14,.74);backdrop-filter:blur(16px)}.controls button{min-width:72px;min-height:44px;border:0;border-radius:999px;background:linear-gradient(135deg,var(--replay-light),var(--replay-accent));color:#041019;font-weight:900}.controls input{width:100%;min-height:44px}.controls output{min-width:42px;font-size:12px}.transcript{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.controls button:focus-visible,.unwind:focus-visible,.transcript summary:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.caption{bottom:31svh;width:90vw}.caption strong{font-size:1.35rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript{top:max(76px,calc(env(safe-area-inset-top) + 70px));right:14px;bottom:auto;max-width:180px}.unwind{margin-top:9px}.controls{grid-template-columns:auto 1fr auto;padding:9px 10px}.controls button{min-width:64px}.replayWorld header{max-width:250px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:28svh}}@media(prefers-reduced-motion:reduce){.controls{backdrop-filter:none}}@media(forced-colors:active){.controls,.unwind,.transcript{border:2px solid CanvasText}}`

useGLTF.preload(REPLAY_ENVIRONMENT_MODEL)
