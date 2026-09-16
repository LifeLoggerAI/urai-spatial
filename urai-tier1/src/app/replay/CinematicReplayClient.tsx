'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { assetCssStack, replayAssets } from '@/spatial/assets/uraiAssets'
import { createMineralMaps } from '@/spatial/assets/naturalSurfaceMaps'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { SelectedMemory, SelectedMemoryMedia } from '@/spatial/memory/selectedMemoryContract'
import { useAdaptiveSpatialQuality } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { ReplayEvidenceDrawer } from './ReplayEvidenceDrawer'

const REPLAY_ENVIRONMENT_MODEL = '/assets/urai/generated/models/replay-memory-environment-v1.glb'
const REPLAY_SCREEN_POSITION: [number, number, number] = [0, 0.42, -4.2]
const REPLAY_CONTROLS_HIDE_MS = 3000

type ReplayUiMode = 'REPLAY_UI_CINEMATIC' | 'REPLAY_UI_CONTROLS' | 'REPLAY_UI_EVIDENCE' | 'REPLAY_COMPLETED'

function clamp(value: number, max: number) { return Math.max(0, Math.min(max, value)) }

function truthLabel(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/^./, (character) => character.toUpperCase())
}

function prepareReplayModel(source: THREE.Object3D) {
  const clone = source.clone(true)
  clone.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return
    const growthMatch = object.name.match(/^replay-memory-growth(?:-(?:trunk|crown))?-(\d+)$/)
    const rejectedPresentation = object.name === 'replay-film-portal'
      || object.name === 'replay-film-veil'
      || object.name === 'replay-camera-track'
      || object.name.startsWith('replay-memory-panel-')
      || Boolean(growthMatch)
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

function ReplayCameraRig({ progress, reducedMotion, frozen }: { progress: number; reducedMotion: boolean; frozen: boolean }) {
  const target = useRef(new THREE.Vector3(0, 0.24, -4.15))
  const desired = useRef(new THREE.Vector3())
  const lastProgress = useRef(progress)

  useFrame(({ camera, clock }, delta) => {
    if (!frozen) lastProgress.current = progress
    const activeProgress = frozen ? lastProgress.current : progress
    const breathe = reducedMotion || frozen ? 0 : Math.sin(clock.elapsedTime * 0.22) * 0.045
    const arc = reducedMotion ? 0 : (activeProgress - 0.5) * 0.34
    desired.current.set(arc, 0.42 + breathe, 6.6 - activeProgress * 0.65)
    camera.position.lerp(desired.current, Math.min(1, delta * (reducedMotion ? 8 : 2.4)))
    camera.lookAt(target.current)
  })

  return null
}

function MemoryMediaSurface({ media, playing }: { media: SelectedMemoryMedia | undefined; playing: boolean }) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null)
  const [sourceUnavailable, setSourceUnavailable] = useState(false)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const renderedMediaFrames = useRef(0)
  useEffect(() => { renderedMediaFrames.current = 0 }, [texture])
  useFrame(({ gl }) => {
    const owner = gl.domElement.closest('[data-testid="cinematic-replay-client"]')
    if (sourceUnavailable) owner?.setAttribute('data-replay-source-status', 'unavailable')
    else owner?.setAttribute('data-replay-source-status', media ? 'available' : 'none')
    if (!media || sourceUnavailable) {
      if (gl.info.render.calls > 0) owner?.setAttribute('data-replay-render-ready', 'true')
      return
    }
    if (!texture || gl.info.render.calls === 0) {
      owner?.setAttribute('data-replay-render-ready', 'false')
      return
    }
    renderedMediaFrames.current++
    if (renderedMediaFrames.current >= 2) owner?.setAttribute('data-replay-render-ready', 'true')
  })
  const surfaceGeometry = useMemo(() => {
    const geometry = new THREE.PlaneGeometry(13.8, 7.4, 72, 36)
    const positions = geometry.getAttribute('position') as THREE.BufferAttribute
    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index)
      const y = positions.getY(index)
      const normalizedX = x / 6.9
      const depth = -0.34 * normalizedX * normalizedX + Math.sin(y * 1.3) * 0.025 + Math.sin(x * 1.7 + y * 0.8) * 0.012
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
    setSourceUnavailable(false)
    if (!media) return () => undefined

    const sourceUrl = media.url
    const sourceKind = media.kind

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
      }, undefined, () => { if (!disposed) setSourceUnavailable(true) })
    }

    if (sourceKind === 'video') {
      const video = document.createElement('video')
      video.src = sourceUrl
      video.crossOrigin = 'anonymous'
      video.playsInline = true
      video.muted = true
      video.loop = false
      video.preload = 'metadata'
      video.addEventListener('error', () => setSourceUnavailable(true), { once: true })
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
    <group name="replay-v149-curved-memory-horizon" userData={{ visualRepair: 'no-flat-fog-card-or-portal-ring', sourceUnavailable }}>
      <mesh position={REPLAY_SCREEN_POSITION} geometry={surfaceGeometry}>
        {texture && !sourceUnavailable
          ? <shaderMaterial
              uniforms={{ uMap: { value: texture } }}
              vertexShader={`varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`}
              fragmentShader={`
                uniform sampler2D uMap;
                varying vec2 vUv;
                void main() {
                  vec2 p=(vUv-.5)*2.0;
                  float boundary=pow(abs(p.x),4.0)+pow(abs(p.y*1.08),4.0);
                  float weather=.022*sin(p.x*17.0+p.y*8.0)+.014*sin(p.x*31.0-p.y*13.0);
                  float mask=1.0-smoothstep(.87,.99,boundary+weather);
                  vec3 mediaColor=texture2D(uMap,vUv).rgb;
                  float innerShade=1.0-.13*smoothstep(.52,.96,boundary);
                  gl_FragColor = vec4(mediaColor*innerShade, mask);
                  #include <colorspace_fragment>
                }
              `}
              transparent depthWrite={false} toneMapped={false} side={THREE.DoubleSide}
            />
          : <meshStandardMaterial color={sourceUnavailable ? '#111817' : '#18221e'} emissive={sourceUnavailable ? '#000000' : '#283b32'} emissiveIntensity={sourceUnavailable ? 0 : 0.04} roughness={0.96} metalness={0} side={THREE.DoubleSide} />}
      </mesh>
    </group>
  )
}

function replayBasinGeometry() {
  const columns = 84
  const rows = 76
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const indices: number[] = []
  const stone = new THREE.Color('#253630')
  const warm = new THREE.Color('#594d43')
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows
    const z = 8.2 - v * 28
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns
      const x = -14 + u * 28
      const side = Math.pow(Math.max(0,(Math.abs(x)-4.6)/9.4),1.55) * 6.2
      const hollow = -.34 * Math.exp(-(x*x/18 + (z+3.8)*(z+3.8)/34))
      const weather = .16*Math.sin(x*.58+z*.31)+.07*Math.sin(x*1.9-z*.77)+.035*Math.cos(x*4.1+z*2.4)
      positions.push(x,-2.34+side+hollow+weather,z)
      uvs.push(u*6,v*6)
      const path=1-THREE.MathUtils.smoothstep(Math.abs(x-.16*Math.sin(z*.32)),.7,2.2)
      const color=stone.clone().lerp(warm,.18+.36*path)
      colors.push(color.r,color.g,color.b)
    }
  }
  const stride=columns+1
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,b,c,b,d,c)}
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function replayMemoryWallGeometry() {
  const columns=92
  const rows=24
  const positions:number[]=[]
  const colors:number[]=[]
  const indices:number[]=[]
  const shadow=new THREE.Color('#14231f')
  const moss=new THREE.Color('#3f534a')
  const plum=new THREE.Color('#514754')
  for(let row=0;row<=rows;row+=1){
    const v=row/rows
    const y=-3.0+v*11.0
    for(let column=0;column<=columns;column+=1){
      const u=column/columns
      const x=-14+u*28
      const recess=2.2*Math.exp(-Math.pow(x/7.1,4))
      const z=-5.1-recess+.32*Math.sin(x*.72+v*6.1)+.15*Math.sin(x*2.4-v*10.2)
      positions.push(x,y+.22*Math.sin(u*15+v*8),z)
      const color=shadow.clone().lerp(moss,.16+.52*v).lerp(plum,.12*(.5+.5*Math.sin(x*.36)))
      colors.push(color.r,color.g,color.b)
    }
  }
  const stride=columns+1
  for(let row=0;row<rows;row+=1)for(let column=0;column<columns;column+=1){const a=row*stride+column,b=a+1,c=a+stride,d=c+1;indices.push(a,c,b,b,c,d)}
  const geometry=new THREE.BufferGeometry()
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3))
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function ReplayMemoryGeography({ accent }: { accent: string }) {
  const basin=useMemo(replayBasinGeometry,[])
  const wall=useMemo(replayMemoryWallGeometry,[])
  const maps=useMemo(createMineralMaps,[])
  useEffect(()=>()=>{basin.dispose();wall.dispose();maps.forEach((texture)=>texture.dispose())},[basin,maps,wall])
  return <group name="replay-v216-embedded-memory-cove" userData={{ visualIntent:'media-manifested-inside-continuous-weathered-place' }}>
    <mesh geometry={basin} receiveShadow castShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.40,.40)} color="#657068" vertexColors roughness={.94}/>
    </mesh>
    <mesh geometry={wall} position={[0,0,-.18]} receiveShadow castShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} roughnessMap={maps[2]} normalScale={new THREE.Vector2(.52,.52)} color="#33443d" vertexColors roughness={.97} side={THREE.DoubleSide}/>
    </mesh>
    <pointLight position={[-5.8,.4,-3.8]} color="#b28a68" intensity={.58} distance={9} decay={2}/>
    <pointLight position={[5.2,1.1,-4.2]} color={accent} intensity={.46} distance={8} decay={2}/>
  </group>
}

function ReplayTimelineField({ memory, progress }: { memory: SelectedMemory; progress: number }) {
  return <group name="replay-semantic-timeline" visible={false} userData={{ segmentCount: memory.replayManifest.segments.length, progress, retiredVisualRole: 'v211-no-stick-and-ball-timeline' }}>
    {memory.replayManifest.segments.map((segment) => <group key={segment.id} userData={{ replaySegment: segment.id, replayKind: segment.kind, evidenceClass: segment.evidenceClass }} />)}
  </group>
}

function ReplaySpatialScene({ memory, playing, progressMs, cameraFrozen }: { memory: SelectedMemory; playing: boolean; progressMs: number; cameraFrozen: boolean }) {
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
      <ReplayMemoryGeography accent={memory.visuals.accent}/>
      <MemoryMediaSurface media={media} playing={playing} />
      <ReplayTimelineField memory={memory} progress={progress} />
      <ReplayCameraRig progress={progress} reducedMotion={reducedMotion} frozen={cameraFrozen} />
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
      <ReplayCameraRig progress={0} reducedMotion frozen />
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
  const [uiMode, setUiMode] = useState<ReplayUiMode>('REPLAY_UI_CINEMATIC')
  const [scrubbing, setScrubbing] = useState(false)
  const resumeAfterScrub = useRef(false)
  const controlsTimer = useRef<number | null>(null)
  const duration = memory?.replayManifest.durationMs ?? 1
  const segments = memory?.replayManifest.segments ?? []
  const active = useMemo(() => segments.find((segment) => progressMs >= segment.startsAtMs && progressMs < segment.startsAtMs + segment.durationMs) ?? segments.at(-1), [progressMs, segments])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])
  const chooseMemory = useCallback(() => requestUraiWorldTravel({ destination: 'life-map', href: '/life-map/', entryPortal: 'replay-memory-horizon', cameraCheckpoint: 'life-map-overview' }), [])

  const clearControlsTimer = useCallback(() => {
    if (controlsTimer.current !== null) window.clearTimeout(controlsTimer.current)
    controlsTimer.current = null
  }, [])

  const scheduleCinematic = useCallback(() => {
    clearControlsTimer()
    if (!playing) return
    controlsTimer.current = window.setTimeout(() => setUiMode((current) => current === 'REPLAY_UI_CONTROLS' ? 'REPLAY_UI_CINEMATIC' : current), REPLAY_CONTROLS_HIDE_MS)
  }, [clearControlsTimer, playing])

  const revealControls = useCallback(() => {
    setUiMode((current) => current === 'REPLAY_UI_EVIDENCE' || current === 'REPLAY_COMPLETED' ? current : 'REPLAY_UI_CONTROLS')
  }, [])

  useEffect(() => () => clearControlsTimer(), [clearControlsTimer])
  useEffect(() => {
    if (uiMode === 'REPLAY_UI_CONTROLS' && playing) scheduleCinematic()
    else clearControlsTimer()
  }, [clearControlsTimer, playing, scheduleCinematic, uiMode])

  useEffect(() => {
    if (!memory || !playing || scrubbing) return
    const tick = window.setInterval(() => setProgressMs((current) => {
      const next = clamp(current + (reducedMotion ? 250 : 100), duration)
      if (next >= duration) {
        setPlaying(false)
        setUiMode('REPLAY_COMPLETED')
      }
      return next
    }), reducedMotion ? 250 : 100)
    return () => window.clearInterval(tick)
  }, [duration, memory, playing, reducedMotion, scrubbing])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target instanceof Element ? event.target : null
      const interactive = Boolean(target?.closest('button, input, textarea, select, summary, a, [role="button"]'))
      if (event.key === 'Escape') {
        if (uiMode === 'REPLAY_UI_EVIDENCE') {
          event.preventDefault()
          setUiMode(playing ? 'REPLAY_UI_CINEMATIC' : 'REPLAY_UI_CONTROLS')
          return
        }
        event.preventDefault()
        unwind()
        return
      }
      if (!interactive && (event.key === ' ' || event.key === 'Enter') && memory) {
        event.preventDefault()
        revealControls()
        if (progressMs >= duration) setProgressMs(0)
        setPlaying((value) => !value)
      } else if (!interactive && memory) revealControls()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [duration, memory, playing, progressMs, revealControls, uiMode, unwind])

  if (!memory) return (
    <main className="replayState" data-testid="cinematic-replay-client" data-memory-status={result.status} data-canonical-asset={replayAssets.primary.src} data-replay-neutral="memory-horizon" data-replay-spatial-owner="spatial-temporal-memory-reconstruction">
      <Canvas className="replaySpatialCanvas" dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }}>
        <ReplayNeutralSpatialScene />
      </Canvas>
      <section role={result.status === 'loading' ? 'status' : 'region'} aria-label="Replay memory horizon"><p>{result.status === 'loading' ? 'Opening memory field' : 'Memory horizon'}</p><h1>{result.status === 'loading' ? 'A memory is coming into view.' : 'Choose a memory to enter Replay.'}</h1><span>{result.status === 'loading' ? 'The spatial field will open as soon as the selected memory is ready.' : 'Replay begins from a selected memory, preserving its truth and context.'}</span>{result.status === 'loading' ? null : <button type="button" onClick={chooseMemory}>Choose a memory</button>}</section>
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
  const controlsVisible = uiMode === 'REPLAY_UI_CONTROLS' || uiMode === 'REPLAY_COMPLETED'

  return <main
    className="replayWorld"
    style={style}
    data-testid="cinematic-replay-client"
    data-memory-status={result.status}
    data-memory-id={memory.id}
    data-star-id={memory.star.id}
    data-manifest-id={memory.replayManifest.id}
    data-node={memory.star.id}
    data-playing={playing ? 'true' : 'false'}
    data-replay-ui-mode={uiMode}
    data-active-evidence-class={active?.evidenceClass ?? 'UNKNOWN'}
    data-canonical-asset={replayAssets.primary.src}
    data-replay-spatial-owner="spatial-temporal-memory-reconstruction"
    data-replay-environment={REPLAY_ENVIRONMENT_MODEL}
    data-replay-composition="v217-weathered-memory-cove-truth-aware-cinematic-ui"
    onPointerMove={() => { revealControls(); if (playing) scheduleCinematic() }}
    onPointerDown={() => revealControls()}
  >
    <Canvas className="replaySpatialCanvas" shadows={quality.shadows} dpr={[1, quality.pixelRatioMax]} frameloop={quality.documentVisible ? 'always' : 'never'} camera={{ position: [0, 0.42, 8.4], fov: 46, near: 0.05, far: 120 }} gl={{ antialias: quality.antialias, powerPreference: 'high-performance' }} onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
      <ReplaySpatialScene memory={memory} playing={playing} progressMs={progressMs} cameraFrozen={scrubbing || uiMode === 'REPLAY_UI_EVIDENCE'} />
    </Canvas>
    <div className="replayAtmosphere" aria-hidden="true" />

    <button className="unwind" type="button" onClick={unwind}>← Focus</button>
    {active?.caption ? <section className="caption" aria-live="polite"><strong>{active.caption}</strong><span className="srOnly">{active.narratorLine}</span></section> : null}

    <div className="progressSeam" aria-hidden="true"><span /></div>

    {controlsVisible ? <section className="controls" aria-label="Replay controls">
      <button type="button" onClick={() => { if (progressMs >= duration) { setProgressMs(0); setUiMode('REPLAY_UI_CONTROLS') } setPlaying((value) => !value) }} aria-label={playing ? 'Pause replay' : 'Play replay'}>{playing ? 'Pause' : 'Play'}</button>
      <input
        type="range"
        min={0}
        max={duration}
        step={100}
        value={progressMs}
        onPointerDown={() => { resumeAfterScrub.current = playing; setScrubbing(true); setPlaying(false); window.dispatchEvent(new CustomEvent('urai:replay-audio-duck', { detail: { durationMs: 75 } })) }}
        onPointerUp={() => { setScrubbing(false); if (resumeAfterScrub.current) setPlaying(true); window.dispatchEvent(new CustomEvent('urai:replay-audio-restore', { detail: { durationMs: 120 } })) }}
        onChange={(event) => { setProgressMs(Number(event.currentTarget.value)); if (uiMode === 'REPLAY_COMPLETED') setUiMode('REPLAY_UI_CONTROLS') }}
        aria-label={`Replay timeline, ${percent} percent complete`}
      />
      <button type="button" className="evidenceButton" onClick={() => { setPlaying(false); setUiMode('REPLAY_UI_EVIDENCE') }}>Evidence</button>
      <output className="srOnly">{percent}%</output>
      <small className="truthBadge">{truthLabel(active?.evidenceClass ?? 'UNKNOWN')}</small>
    </section> : null}

    {uiMode === 'REPLAY_UI_EVIDENCE' ? <ReplayEvidenceDrawer memory={memory} onClose={() => setUiMode(playing ? 'REPLAY_UI_CINEMATIC' : 'REPLAY_UI_CONTROLS')} /> : null}

    {uiMode === 'REPLAY_COMPLETED' ? <section className="completion" aria-label="Replay complete"><p>Replay complete</p><div><button type="button" onClick={() => setUiMode('REPLAY_UI_CONTROLS')}>Stay</button><button type="button" onClick={unwind}>Return to Focus</button><button type="button" onClick={() => setUiMode('REPLAY_UI_EVIDENCE')}>Evidence</button></div></section> : null}

    <span className="srOnly" aria-live="polite">{active ? `${active.label}. ${truthLabel(active.evidenceClass)}.` : 'Replay ready.'}</span>
    <style>{replayCss}</style>
  </main>
}

const stateCss = `.replayState{position:fixed;inset:0;overflow:hidden;display:grid;place-items:center;padding:24px;background:#02060d;color:#fff;isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayState:after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 45%,transparent 0 22%,rgba(1,5,12,.28) 48%,rgba(1,5,12,.8) 100%);pointer-events:none}.replayState section{z-index:2;text-align:center;max-width:620px;padding:28px 30px;border:1px solid rgba(220,248,255,.12);border-radius:28px;background:linear-gradient(145deg,rgba(2,8,16,.7),rgba(2,8,16,.24));backdrop-filter:blur(18px);text-shadow:0 3px 24px #000}.replayState section p{margin:0 0 9px;color:#c9f7ff;font-size:10px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.replayState section h1{margin:0;font:500 clamp(1.7rem,4.6vw,3.6rem)/1.02 var(--font-sans);letter-spacing:-.045em}.replayState section span{display:block;max-width:520px;margin:12px auto 0;color:rgba(235,247,255,.72);font-size:13px;line-height:1.55}.replayState button{min-height:48px;margin-top:20px;padding:0 22px;border-radius:999px;border:1px solid rgba(210,248,255,.32);background:linear-gradient(135deg,#dffbff,#8fe5ef);color:#041019;font-weight:900}.replayState button:focus-visible{outline:3px solid #fff;outline-offset:4px}@media(max-width:700px){.replayState section{max-width:calc(100vw - 32px);padding:24px 20px}}@media(prefers-reduced-motion:reduce){.replayState section{backdrop-filter:none}}@media(forced-colors:active){.replayState section,.replayState button{border:2px solid CanvasText}}`

const replayCss = `.replayWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--replay-sky);isolation:isolate}.replaySpatialCanvas{position:absolute!important;inset:0;width:100%!important;height:100%!important}.replayAtmosphere{position:absolute;inset:0;background:radial-gradient(circle at 50% 42%,transparent 0 34%,rgba(0,0,0,.08) 62%,rgba(0,0,0,.58) 100%);pointer-events:none}.unwind{position:absolute;z-index:8;left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));min-height:44px;padding:0 15px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(2,7,12,.38);backdrop-filter:blur(9px);color:#fff;font-weight:800}.caption{position:absolute;z-index:5;left:50%;bottom:clamp(92px,16svh,150px);transform:translateX(-50%);width:min(680px,82vw);text-align:center;text-shadow:0 3px 30px #000;pointer-events:none}.caption strong{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font:500 clamp(1.05rem,2.8vw,1.8rem)/1.18 var(--font-sans);letter-spacing:-.025em}.progressSeam{position:absolute;z-index:6;left:50%;bottom:max(22px,calc(env(safe-area-inset-bottom) + 16px));width:min(720px,78vw);height:2px;transform:translateX(-50%);border-radius:999px;background:rgba(255,255,255,.12);overflow:hidden}.progressSeam span{display:block;width:var(--replay-progress);height:100%;background:var(--replay-light);opacity:.68}.controls{position:absolute;z-index:10;left:50%;bottom:max(34px,calc(env(safe-area-inset-bottom) + 28px));transform:translateX(-50%);width:min(760px,calc(100vw - 36px));display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:10px;padding:6px 8px;border:1px solid rgba(255,255,255,.12);border-radius:999px;background:rgba(2,7,12,.48);backdrop-filter:blur(10px);box-shadow:0 10px 42px rgba(0,0,0,.18)}.controls button{min-height:44px;padding:0 15px;border:1px solid rgba(255,255,255,.16);border-radius:999px;background:rgba(4,14,18,.76);color:#fff;font-weight:800}.controls input{width:100%;min-height:44px;accent-color:var(--replay-light)}.truthBadge{position:absolute;left:50%;bottom:52px;transform:translateX(-50%);padding:4px 8px;border-radius:999px;background:rgba(2,7,12,.58);color:rgba(255,255,255,.7);font-size:9px;letter-spacing:.08em;text-transform:uppercase;pointer-events:none}.completion{position:absolute;z-index:11;left:50%;bottom:max(86px,calc(env(safe-area-inset-bottom) + 78px));transform:translateX(-50%);width:min(480px,calc(100vw - 32px));padding:14px;border:1px solid rgba(255,255,255,.14);border-radius:20px;background:rgba(2,7,12,.72);backdrop-filter:blur(14px);text-align:center;animation:replayCompletion 350ms 650ms ease both}.completion p{margin:0 0 10px;color:rgba(255,255,255,.78);font-size:11px;letter-spacing:.08em;text-transform:uppercase}.completion div{display:flex;gap:8px;justify-content:center}.completion button{min-height:44px;padding:0 13px;border:1px solid rgba(255,255,255,.18);border-radius:999px;background:rgba(255,255,255,.06);color:#fff;font-weight:800}.srOnly{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}.replayWorld :is(button,input):focus-visible{outline:3px solid #fff;outline-offset:3px}@keyframes replayCompletion{from{opacity:0;transform:translate(-50%,8px)}to{opacity:1;transform:translate(-50%,0)}}@media(max-width:700px){.controls{width:calc(100vw - 24px);bottom:max(14px,env(safe-area-inset-bottom));grid-template-columns:auto minmax(0,1fr) auto}.controls button{padding:0 10px;font-size:11px}.caption{bottom:clamp(90px,17svh,132px);width:86vw}.progressSeam{bottom:max(8px,env(safe-area-inset-bottom));width:72vw}.completion{bottom:max(76px,calc(env(safe-area-inset-bottom) + 68px))}.completion div{flex-direction:column}.completion button{width:100%}}@media(prefers-reduced-motion:reduce){.controls,.unwind,.completion{backdrop-filter:none}.completion{animation:none}}@media(forced-colors:active){.controls,.unwind,.completion{border:2px solid CanvasText}}`
