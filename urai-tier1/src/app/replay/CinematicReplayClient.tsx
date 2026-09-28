'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { useCapturedRealityReplayEntry } from '@/spatial/captured-reality/useCapturedRealityReplayEntry'
import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { ReplayProductControls } from './ReplayProductControls'

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

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

function MemoryMediaDome({ media, playing }: { media: SelectedMemoryMedia | undefined; playing: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    let disposed = false
    let localTexture: THREE.Texture | null = null
    let localVideo: HTMLVideoElement | null = null

    setTexture(null)
    if (!media) return

    if (media.kind === 'image') {
      const loader = new THREE.TextureLoader()
      loader.setCrossOrigin('anonymous')
      loader.load(media.url, (loaded) => {
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

    if (media.kind === 'video') {
      const video = document.createElement('video')
      video.src = media.url
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
    <group name="replay-immersive-memory-field" userData={{ presentation: 'inside-memory-environment-not-screen' }}>
      <mesh>
        <sphereGeometry args={[24, 96, 64]} />
        {texture
          ? <meshBasicMaterial map={texture} toneMapped={false} side={THREE.BackSide} transparent opacity={0.82} />
          : <meshBasicMaterial color="#06131c" side={THREE.BackSide} />}
      </mesh>
      <mesh scale={0.985}>
        <sphereGeometry args={[24, 72, 48]} />
        <meshBasicMaterial color="#75d9e9" transparent opacity={0.035} side={THREE.BackSide} depthWrite={false} blending={THREE.AdditiveBlending} />
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
      <mesh position={[-4.2, 1.8, -8.5]} scale={[2.8, 1.4, 2.8]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color={memory.visuals.accent} transparent opacity={0.055} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh position={[4.8, -1.2, -11]} scale={[3.4, 1.8, 3.4]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshBasicMaterial color={memory.visuals.light} transparent opacity={0.04} depthWrite={false} blending={THREE.AdditiveBlending} />
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
      <MemoryMediaDome media={media} playing={playing} />
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

export default function CinematicReplayClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const capturedRealityEntry = useCapturedRealityReplayEntry(memory?.id ?? null)
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
    <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={result.status} data-canonical-asset={replayAssets.primary.src} data-replay-neutral="memory-horizon" data-replay-spatial-owner="r3f-immersive-memory-field">
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

  return <main className="replayWorld" style={style} data-testid="cinematic-replay-client" data-memory-status={result.status} data-memory-id={memory.id} data-star-id={memory.star.id} data-manifest-id={memory.replayManifest.id} data-node={memory.star.id} data-playing={playing ? 'true' : 'false'} data-canonical-asset={replayAssets.primary.src} data-replay-spatial-owner="r3f-immersive-memory-field">
    <Canvas className="replaySpatialCanvas" shadows={quality.shadows} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
      <ReplaySpatialScene memory={memory} playing={playing} progressMs={progressMs} />
    </Canvas>
    <div className="replayAtmosphere" aria-hidden="true" />
    <header><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} replay`}</p><h1>{memory.title}</h1><span>{active?.label ?? 'Replay'}</span><button className="unwind" type="button" onClick={unwind}>← Focus</button>{capturedRealityEntry?.href ? <a className="replayImmersiveEntry" href={capturedRealityEntry.href} aria-label={'Enter captured place for ' + memory.title} title={capturedRealityEntry.truthLabel}>Enter captured place</a> : null}</header>
    <section className="caption" aria-live="polite"><small>{active?.label ?? 'Replay'}</small><strong>{active?.caption ?? memory.narrator.replay}</strong><span>{active?.narratorLine ?? memory.narrator.replay}</span></section>
    <section className="memoryTempo" aria-label="Memory time">
      <button type="button" className="memoryPulse" onClick={() => { if (progressMs >= duration) setProgressMs(0); setPlaying((value) => !value) }} aria-label={playing ? 'Pause memory' : 'Continue memory'} aria-pressed={playing}>
        <span aria-hidden="true">{playing ? 'Ⅱ' : '›'}</span>{playing ? 'Pause memory' : 'Continue memory'}
      </button>
      <span className="memoryTrace" aria-hidden="true"><i style={{ width: `${percent}%` }} /></span>
      <input className="memorySeek" type="range" min={0} max={duration} step={100} value={progressMs} onChange={(event) => setProgressMs(Number(event.currentTarget.value))} aria-label={`Move through memory time, ${percent} percent complete`} />
      <output className="srOnly" aria-live="polite">{percent}% through memory</output>
    </section>
    <ReplayProductControls memory={memory} />
    {memory.replayManifest.transcript ? <details className="transcript"><summary>Transcript</summary><p>{memory.replayManifest.transcript}</p></details> : null}
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;padding:24px;background:#02060d;color:#fff;isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayState:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgba(1,5,12,.28) 48%,rgba(1,5,12,.8) 100%);pointer-events:none}.replayState section{z-index:2;text-align:center;max-width:620px;padding:28px 30px;border:1px solid rgba(220,248,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(2,8,16,.7),rgba(2,8,16,.24));backdrop-filter:blur(18px);text-shadow:0 3px 24px #000}.replayState section p{margin:0 0 9px;color:#c9f7ff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayState section h1{margin:0;font:500 clamp(1.7rem,4.6vw,3.6rem)/1.02 var(--font-sans);letter-spacing:-.045em}.replayState section span{display:block;max-width:520px;margin:12px auto 0;color:rgba(235,247,255,.72);font-size:13px;line-height:1.55}.replayState button{min-height:48px;margin-top:20px;padding:0 22px;border-radius:999px;border:1px solid rgba(210,248,255,.32);background:linear-gradient(135deg,#dffbff,#8fe5ef);color:#041019;font-weight:900}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}@media(max-width:700px){.replayState section{max-width:calc(100vw - 32px);padding:24px 20px}}@media(prefers-reduced-motion:reduce){.replayState section{backdrop-filter:none}}@media(forced-colors:active){.replayState section,.replayState button{border:2px solid CanvasText}}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--replay-sky);isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayAtmosphere{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,transparent 0 30%,rgba(0,0,0,.12) 58%,rgba(0,0,0,.78) 100%);pointer-events:none}.replayWorld header{position:absolute;z-index:5;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(360px,calc(100vw - 36px));text-shadow:0 3px 24px #000}.replayWorld header p{margin:0;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.replayWorld header h1{margin:5px 0;font-size:clamp(1.25rem,4vw,2.4rem);line-height:.95}.replayWorld header span{font-size:11px;color:rgba(255,255,255,.7)}.caption{position:absolute;z-index:5;left:50%;bottom:clamp(210px,27svh,300px);transform:translateX(-50%);width:min(820px,86vw);text-align:center;text-shadow:0 3px 30px #000}.caption small{display:block;color:var(--replay-light);font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.caption strong{display:block;margin-top:8px;font:500 clamp(1.25rem,4vw,2.8rem)/1.08 var(--font-sans);letter-spacing:-.035em}.caption span{display:block;margin:8px auto 0;max-width:620px;font-size:12px;color:rgba(255,255,255,.72)}.memoryTempo{position:absolute;z-index:7;left:50%;bottom:max(112px,calc(env(safe-area-inset-bottom) + 106px));transform:translateX(-50%);width:min(560px,calc(100vw - 40px));display:flex;align-items:center;justify-content:center;gap:12px}.memoryPulse{min-height:44px;padding:0 15px;border:1px solid rgba(222,248,255,.24);border-radius:999px;background:rgba(3,10,18,.46);backdrop-filter:blur(12px);color:#eefcff;font-size:11px;font-weight:850;letter-spacing:.04em}.memoryPulse span{display:inline-grid;place-items:center;width:18px;height:18px;margin-right:7px;border-radius:50%;background:color-mix(in srgb,var(--replay-accent) 32%,transparent);color:var(--replay-light)}.memoryTrace{position:relative;width:min(280px,35vw);height:2px;overflow:hidden;border-radius:999px;background:rgba(230,249,255,.12)}.memoryTrace i{position:absolute;inset:0 auto 0 0;background:linear-gradient(90deg,var(--replay-accent),var(--replay-light));box-shadow:0 0 18px var(--replay-accent)}.memorySeek{position:absolute;width:1px;height:1px;opacity:.001;pointer-events:none}.memorySeek:focus-visible{position:relative;width:min(220px,34vw);height:44px;opacity:1;pointer-events:auto;outline:3px solid #fff;outline-offset:3px}.srOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.transcript{position:absolute;z-index:8;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));max-width:340px;padding:8px 12px;border:1px solid rgba(255,255,255,.18);border-radius:14px;background:rgba(2,7,14,.7);font-size:12px}.transcript p{margin:8px 0 0;line-height:1.5}.unwind{display:block;min-height:44px;margin-top:10px;padding:0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.28);background:rgba(2,7,12,.72);color:#fff;font-weight:800}.memoryPulse:focus-visible,.memorySeek:focus-visible,.unwind:focus-visible,.transcript summary:focus-visible{outline:3px solid #fff;outline-offset:3px}@media(max-width:700px){.caption{bottom:25svh;width:90vw}.caption strong{font-size:1.35rem}.caption span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}.transcript{top:max(76px,calc(env(safe-area-inset-top) + 70px));right:14px;bottom:auto;max-width:180px}.unwind{margin-top:9px}.memoryTempo{bottom:max(96px,calc(env(safe-area-inset-bottom) + 90px));width:calc(100vw - 28px);gap:8px}.memoryPulse{padding:0 12px}.memoryTrace{flex:1;width:auto}.replayWorld header{max-width:250px}.replayWorld header h1{font-size:1.35rem}}@media(max-height:720px){.caption{bottom:28svh}}@media(prefers-reduced-motion:reduce){.memoryPulse{backdrop-filter:none}}@media(forced-colors:active){.memoryPulse,.unwind,.transcript{border:2px solid CanvasText}.memoryTrace{border:1px solid CanvasText}}`

