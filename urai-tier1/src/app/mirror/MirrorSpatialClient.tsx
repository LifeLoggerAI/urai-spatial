'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { applyMirrorFixture, buildMirrorPatterns, type MirrorPattern, type MirrorFragment } from '@/spatial/mirror/mirrorPatternModel'

const CAMERA_HEIGHT = 1.68

type CameraProps = {
  input: MovementInput
  yaw: MutableRefObject<number>
  pitch: MutableRefObject<number>
  target: MutableRefObject<THREE.Vector3 | null>
  reducedMotion: boolean
  selected: MirrorPattern | null
  temporalIndex: number
  shellRef: MutableRefObject<HTMLDivElement | null>
}

function useWebGLAvailable() {
  const [available, setAvailable] = useState<boolean | null>(null)
  useEffect(() => {
    try {
      const canvas = document.createElement('canvas')
      setAvailable(Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl')))
    } catch {
      setAvailable(false)
    }
  }, [])
  return available
}

function MirrorCamera({ input, yaw, pitch, target, reducedMotion, selected, temporalIndex, shellRef }: CameraProps) {
  const { camera } = useThree()
  const position = useRef(new THREE.Vector3(0, 0, 6.8))
  const velocity = useRef(new THREE.Vector3())
  const scratch = useRef(new THREE.Vector3())
  useFrame((_, delta) => {
    const focusTarget = selected ? new THREE.Vector3(selected.position[0] * 0.42, 0, selected.position[2] + 2.3 + temporalIndex * 0.08) : target.current
    stepEmbodiedMotion({
      position: position.current,
      velocity: velocity.current,
      input,
      target: { current: focusTarget },
      yaw: yaw.current,
      delta,
      speed: reducedMotion ? 1.55 : 2.35,
      acceleration: 8.5,
      deceleration: 10,
      bounds: { minX: -5.2, maxX: 5.2, minZ: -0.4, maxZ: 7.2 },
      obstacles: [{ x: 0, z: 0.8, radius: 1.45 }],
      arrivalRadius: 0.34,
    })
    camera.position.set(position.current.x, CAMERA_HEIGHT, position.current.z)
    if (selected) {
      const focus = scratch.current.set(selected.position[0] * 0.12, 1.45, selected.position[2])
      camera.lookAt(focus)
    } else {
      const direction = scratch.current.set(-Math.sin(yaw.current) * Math.cos(pitch.current), Math.sin(pitch.current), -Math.cos(yaw.current) * Math.cos(pitch.current))
      camera.lookAt(direction.add(camera.position))
    }
    if (shellRef.current) {
      shellRef.current.dataset.mirrorReady = 'true'
      shellRef.current.dataset.mirrorCameraX = camera.position.x.toFixed(3)
      shellRef.current.dataset.mirrorCameraZ = camera.position.z.toFixed(3)
    }
  })
  return null
}

function ChamberArchitecture({ reducedMotion }: { reducedMotion: boolean }) {
  const breath = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!breath.current || reducedMotion) return
    const y = Math.sin(clock.elapsedTime * 0.42) * 0.035
    breath.current.position.y = y
  })
  return <group ref={breath} name="mirror-chamber-architecture">
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 1.1]} receiveShadow>
      <circleGeometry args={[8.4, 96]} />
      <meshPhysicalMaterial color="#07141d" roughness={0.2} metalness={0.38} clearcoat={0.85} />
    </mesh>
    {[2.15, 3.8, 5.5, 7.15].map((radius, index) => <mesh key={radius} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025 + index * 0.004, 1.1]}>
      <ringGeometry args={[radius - 0.035, radius, 96]} />
      <meshBasicMaterial color={index % 2 ? '#d8c7ff' : '#98eef4'} transparent opacity={0.1 + index * 0.018} />
    </mesh>)}
    {[-6.7, -4.4, -2.2, 2.2, 4.4, 6.7].map((x, index) => <group key={x} position={[x, 0, -4.9]}>
      <mesh position={[0, 2.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.34, 5.2, 0.5]} />
        <meshStandardMaterial color={index % 2 ? '#152932' : '#10222c'} metalness={0.35} roughness={0.46} />
      </mesh>
      <pointLight position={[0, 3.6, 0.7]} color={index % 2 ? '#cabdff' : '#9beef4'} intensity={0.32} distance={5} />
    </group>)}
    <mesh position={[0, 3.25, -6.9]} receiveShadow>
      <boxGeometry args={[15.6, 6.5, 0.42]} />
      <meshPhysicalMaterial color="#07131b" roughness={0.24} metalness={0.5} clearcoat={0.75} />
    </mesh>
    <mesh position={[0, 1.9, -6.64]}>
      <planeGeometry args={[12.8, 3.9]} />
      <meshPhysicalMaterial color="#0d2230" metalness={0.62} roughness={0.12} transmission={0.12} transparent opacity={0.72} />
    </mesh>
  </group>
}

function EmbodiedReflection({ reducedMotion, demo }: { reducedMotion: boolean; demo: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ camera, clock }) => {
    if (!group.current) return
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, camera.position.x * 0.28, 3.2, 1 / 60)
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, -camera.rotation.y * 0.18, 3.2, 1 / 60)
    if (!reducedMotion) group.current.scale.y = 1 + Math.sin(clock.elapsedTime * 0.7) * 0.012
  })
  return <group ref={group} position={[0, 0, -6.25]} name="privacy-safe-user-reflection">
    <mesh position={[0, 1.62, 0]} castShadow><sphereGeometry args={[0.26, 24, 18]} /><meshStandardMaterial color={demo ? '#b9c7da' : '#d9faff'} transparent opacity={0.38} roughness={0.18} metalness={0.24} /></mesh>
    <mesh position={[0, 0.82, 0]} castShadow><capsuleGeometry args={[0.38, 1.15, 8, 20]} /><meshStandardMaterial color={demo ? '#8997aa' : '#bfeff4'} transparent opacity={0.28} roughness={0.22} metalness={0.2} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}><circleGeometry args={[0.9, 48]} /><meshBasicMaterial color={demo ? '#a9b5c8' : '#7de8ef'} transparent opacity={0.12} /></mesh>
  </group>
}

function PatternInstrument({ selected, onSelect, reducedMotion }: { selected: MirrorPattern | null; onSelect: (pattern: MirrorPattern | null) => void; reducedMotion: boolean }) {
  const core = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    if (!core.current || reducedMotion) return
    core.current.rotation.y = clock.elapsedTime * 0.18
    core.current.rotation.x = Math.sin(clock.elapsedTime * 0.31) * 0.08
  })
  return <group position={[0, 1.4, 0.85]} name="mirror-reflection-instrument" onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (selected) onSelect(null) }}>
    <mesh ref={core} castShadow>
      <icosahedronGeometry args={[0.85, 4]} />
      <meshPhysicalMaterial color={selected?.accent ?? '#c8fbff'} emissive={selected?.accent ?? '#63dbe5'} emissiveIntensity={selected ? 0.75 : 0.42} transmission={0.58} thickness={1.2} roughness={0.08} clearcoat={1} transparent opacity={0.94} />
    </mesh>
    {[1.35, 1.72, 2.05].map((radius, index) => <mesh key={radius} rotation={[Math.PI / 2, index * 0.6, index * 0.32]}><torusGeometry args={[radius, 0.025, 12, 80]} /><meshBasicMaterial color={selected?.accent ?? '#a8f4f8'} transparent opacity={0.22 - index * 0.035} /></mesh>)}
    <pointLight color={selected?.accent ?? '#9df3f8'} intensity={selected ? 1.65 : 1.05} distance={8} decay={2} />
  </group>
}

function PatternObject({ pattern, selected, onSelect, reducedMotion }: { pattern: MirrorPattern; selected: boolean; onSelect: (pattern: MirrorPattern) => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.y = pattern.position[1] + Math.sin(clock.elapsedTime * 0.62 + pattern.position[0]) * 0.08
    group.current.rotation.y = clock.elapsedTime * 0.12
  })
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(pattern) }
  return <group ref={group} position={pattern.position} data-testid="mirror-pattern-object" onClick={activate}>
    <mesh castShadow scale={selected ? 1.18 : 1}>
      {pattern.id === 'relationship-weather' ? <dodecahedronGeometry args={[0.72, 1]} /> : pattern.id === 'becoming' ? <octahedronGeometry args={[0.8, 2]} /> : <icosahedronGeometry args={[0.7, 2]} />}
      <meshStandardMaterial color={pattern.accent} emissive={pattern.accent} emissiveIntensity={selected ? 0.72 : 0.22} transparent opacity={pattern.evidenceState === 'insufficient' ? 0.32 : 0.78} wireframe={pattern.evidenceState === 'conflicting' || pattern.evidenceState === 'insufficient'} metalness={0.3} roughness={0.25} />
    </mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.72, 0]}><ringGeometry args={[0.58, 0.67, 48]} /><meshBasicMaterial color={pattern.accent} transparent opacity={selected ? 0.44 : 0.2} /></mesh>
    {selected ? <pointLight color={pattern.accent} intensity={1.1} distance={6} /> : null}
  </group>
}

function FragmentObject({ fragment, accent, active, onSelect }: { fragment: MirrorFragment; accent: string; active: boolean; onSelect: (fragment: MirrorFragment) => void }) {
  return <group position={fragment.position} data-testid="mirror-reflection-fragment" onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(fragment) }}>
    <mesh castShadow scale={active ? 1.22 : 1}>
      <tetrahedronGeometry args={[0.33, 1]} />
      <meshStandardMaterial color={accent} transparent opacity={fragment.certainty === 'uncertain' ? 0.25 : active ? 0.92 : 0.62} wireframe={fragment.certainty !== 'confirmed'} emissive={accent} emissiveIntensity={active ? 0.7 : 0.14} />
    </mesh>
  </group>
}

function MirrorScene({ patterns, selected, activeFragment, temporalIndex, onSelect, onFragment, ...cameraProps }: CameraProps & { patterns: MirrorPattern[]; activeFragment: MirrorFragment | null; onSelect: (pattern: MirrorPattern | null) => void; onFragment: (fragment: MirrorFragment | null) => void }) {
  return <>
    <color attach="background" args={['#02070c']} />
    <fog attach="fog" args={[selected ? '#07131c' : '#041019', 5.5, 25]} />
    <ambientLight intensity={0.46} />
    <hemisphereLight intensity={0.74} color="#e8fbff" groundColor="#06131b" />
    <directionalLight position={[4.5, 9, 5]} intensity={1.5} color="#f6fbff" castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <Stars radius={56} depth={28} count={cameraProps.reducedMotion ? 160 : 520} factor={1.8} fade speed={cameraProps.reducedMotion ? 0 : 0.018} />
    <MirrorCamera selected={selected} temporalIndex={temporalIndex} {...cameraProps} />
    <ChamberArchitecture reducedMotion={cameraProps.reducedMotion} />
    <EmbodiedReflection reducedMotion={cameraProps.reducedMotion} demo={patterns.some((pattern) => pattern.provenance.includes('demonstration'))} />
    <PatternInstrument selected={selected} onSelect={onSelect} reducedMotion={cameraProps.reducedMotion} />
    {patterns.map((pattern) => <PatternObject key={pattern.id} pattern={pattern} selected={selected?.id === pattern.id} onSelect={onSelect} reducedMotion={cameraProps.reducedMotion} />)}
    {selected?.fragments.map((fragment, index) => index <= temporalIndex ? <FragmentObject key={fragment.id} fragment={fragment} accent={selected.accent} active={activeFragment?.id === fragment.id} onSelect={onFragment} /> : null)}
  </>
}

function buildMemoryHref(memoryId: string, manifestId: string, node: string, demo: boolean, destination: 'replay' | 'mirror') {
  const params = new URLSearchParams({ memoryId, manifestId, node, from: destination === 'mirror' ? 'replay-mirror-threshold' : 'mirror-fragment' })
  if (demo) params.set('demo', '1')
  return `/${destination}?${params.toString()}`
}

export default function MirrorSpatialClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const reducedMotion = useReducedMotion()
  const webglAvailable = useWebGLAvailable()
  const shellRef = useRef<HTMLDivElement | null>(null)
  const yaw = useRef(0)
  const pitch = useRef(-0.04)
  const target = useRef<THREE.Vector3 | null>(null)
  const [selected, setSelected] = useState<MirrorPattern | null>(null)
  const [activeFragment, setActiveFragment] = useState<MirrorFragment | null>(null)
  const [temporalIndex, setTemporalIndex] = useState(0)
  const [online, setOnline] = useState(true)
  const [fixture, setFixture] = useState<string | null>(null)
useEffect(() => {
  setFixture(new URLSearchParams(window.location.search).get('mirrorFixture'))
}, [])
  const patterns = useMemo(() => memory ? applyMirrorFixture(buildMirrorPatterns(memory), fixture) : [], [fixture, memory])

  useEffect(() => {
    const update = () => setOnline(navigator.onLine)
    update()
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update) }
  }, [])

  useEffect(() => {
    const onPop = () => { setSelected(null); setActiveFragment(null); setTemporalIndex(0) }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const selectPattern = useCallback((pattern: MirrorPattern | null) => {
    setSelected(pattern)
    setActiveFragment(null)
    setTemporalIndex(0)
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      if (pattern) params.set('pattern', pattern.id)
      else params.delete('pattern')
      window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}`)
    }
  }, [])

  useEffect(() => {
    if (!patterns.length || typeof window === 'undefined') return
    const requested = new URLSearchParams(window.location.search).get('pattern')
    const match = patterns.find((pattern) => pattern.id === requested)
    if (match) setSelected(match)
  }, [patterns])

  const unwind = useCallback(() => {
    if (selected) { selectPattern(null); return }
    requestUraiWorldReturn()
  }, [selectPattern, selected])

  const input = useMovementInput({
    enabled: Boolean(memory && webglAvailable),
    onEscape: unwind,
    onInteract: () => { if (selected) selectPattern(selected) },
    onReset: () => { target.current = new THREE.Vector3(0, 0, 6.8); selectPattern(null) },
  })
  const look = useDragLook({ yaw, pitch, enabled: Boolean(memory && webglAvailable), sensitivity: reducedMotion ? 0.002 : 0.0034 })

  const goReplay = useCallback(() => {
    if (!memory) return
    const href = buildMemoryHref(memory.id, memory.replayManifest.id, memory.star.id, memory.demo, 'replay')
    requestUraiWorldTravel({ destination: 'replay', href, entryPortal: 'mirror-reflection-fragment', cameraCheckpoint: `mirror:${selected?.id ?? 'overview'}`, context: { memoryId: memory.id, replayManifestId: memory.replayManifest.id, privacyMode: memory.privacy === 'private' ? 'held-private' : 'private' } })
  }, [memory, selected])

  const goPassport = useCallback(() => {
    requestUraiWorldTravel({ destination: 'passport', href: '/passport', entryPortal: 'mirror-ownership-threshold', cameraCheckpoint: `mirror:${selected?.id ?? 'overview'}` })
  }, [selected])

  if (!memory) {
    const title = fixture === 'permission-denied' ? 'Mirror permission is not available.' : fixture === 'failed' ? 'Mirror could not load the permitted sources.' : result.message
    return <main className="mirrorState" data-testid="mirror-spatial-state" data-memory-status={fixture ?? result.status}>
      <section role={result.status === 'loading' ? 'status' : 'alert'}>
        <p>{result.status === 'loading' ? 'Preparing the reflection chamber' : 'Mirror boundary'}</p>
        <h1>{title}</h1>
        <span>{fixture === 'permission-denied' ? 'No reflection was derived. Review permissions in Passport.' : 'Mirror never substitutes demo content for unavailable private data.'}</span>
        <div><button type="button" onClick={() => requestUraiWorldReturn()}>Return</button><button type="button" onClick={goPassport}>Open Passport</button></div>
      </section>
      <style>{stateCss}</style>
    </main>
  }

  if (webglAvailable === null) return <main className="mirrorState" role="status"><section><h1>Preparing the reflection chamber…</h1></section><style>{stateCss}</style></main>
  if (!webglAvailable) return <main className="mirrorFallback" data-testid="mirror-webgl-fallback"><section><p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} reflection`}</p><h1>{memory.title}</h1><p>Spatial rendering is unavailable. The source-backed reflection remains available through semantic controls.</p><div>{patterns.map((pattern) => <button key={pattern.id} type="button" onClick={() => selectPattern(pattern)}>{pattern.label} · {pattern.confidenceLabel}</button>)}</div><button type="button" onClick={goReplay}>Return to Replay</button><button type="button" onClick={goPassport}>Open Passport</button></section><style>{fallbackCss}</style></main>

  const offline = !online || fixture === 'offline'
  const empty = fixture === 'empty' || patterns.length === 0
  return <main ref={shellRef} className="mirrorWorld" data-testid="mirror-spatial-world" data-mirror-renderer="webgl-r3f" data-memory-status={result.status} data-memory-id={memory.id} data-manifest-id={memory.replayManifest.id} data-demo={memory.demo ? 'true' : 'false'} data-online={offline ? 'false' : 'true'} data-selected-pattern={selected?.id ?? 'overview'} {...look}>
    <Canvas camera={{ position: [0, CAMERA_HEIGHT, 6.8], fov: 54, near: 0.08, far: 100 }} dpr={[1, 1.5]} shadows>
      <Suspense fallback={null}><MirrorScene input={input} yaw={yaw} pitch={pitch} target={target} reducedMotion={reducedMotion} selected={selected} temporalIndex={temporalIndex} shellRef={shellRef} patterns={patterns} activeFragment={activeFragment} onSelect={selectPattern} onFragment={setActiveFragment} /></Suspense>
    </Canvas>

    <header className="mirrorIdentity">
      <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} reflection`}</p>
      <h1>{selected?.label ?? 'Mirror'}</h1>
      <span>{offline ? 'Offline · existing permitted evidence only' : selected?.summary ?? 'A private chamber for inspecting evidence without turning life into a score.'}</span>
    </header>

    {empty ? <section className="mirrorEmpty" role="status"><h2>No reflection is available yet.</h2><p>Mirror will not invent a pattern. Return after more permitted memories exist, or review permissions in Passport.</p></section> : null}

    <section className="mirrorPatternRail" aria-label="Reflection patterns">
      {patterns.map((pattern) => <button key={pattern.id} type="button" aria-pressed={selected?.id === pattern.id} onClick={() => selectPattern(pattern)}><strong>{pattern.shortLabel}</strong><span>{pattern.confidenceLabel}</span></button>)}
    </section>

    {selected ? <aside className="mirrorInspection" aria-live="polite" aria-label={`${selected.label} evidence`}>
      <button className="close" type="button" onClick={() => selectPattern(null)} aria-label="Return to Mirror overview">×</button>
      <p>{selected.evidenceState.replace('-', ' ')}</p><h2>{selected.label}</h2><strong>{selected.explanation}</strong>
      <dl><div><dt>Confidence</dt><dd>{selected.confidence === null ? 'Not calculated' : `${Math.round(selected.confidence * 100)}% · ${selected.confidenceLabel}`}</dd></div><div><dt>Evidence</dt><dd>{selected.evidenceCount} permitted source{selected.evidenceCount === 1 ? '' : 's'}</dd></div><div><dt>Uncertainty</dt><dd>{selected.uncertainty}</dd></div><div><dt>Provenance</dt><dd>{selected.provenance}</dd></div></dl>
      <label htmlFor="mirror-time">Inspect reflection depth</label><input id="mirror-time" type="range" min={0} max={Math.max(0, selected.fragments.length - 1)} value={Math.min(temporalIndex, Math.max(0, selected.fragments.length - 1))} onChange={(event) => { setTemporalIndex(Number(event.currentTarget.value)); setActiveFragment(null) }} />
      <div className="fragmentList">{selected.fragments.map((fragment, index) => <button key={fragment.id} type="button" disabled={index > temporalIndex} aria-pressed={activeFragment?.id === fragment.id} onClick={() => setActiveFragment(fragment)}>{fragment.label}<span>{fragment.certainty}</span></button>)}</div>
      {activeFragment ? <p className="fragmentStatus">Selected source fragment: {activeFragment.label}. Evidence status: {activeFragment.certainty}.</p> : null}
    </aside> : null}

    <nav className="mirrorThresholds" aria-label="Mirror world transitions"><button type="button" onClick={goReplay}>Replay threshold</button><button type="button" onClick={goPassport}>Passport threshold</button><button type="button" onClick={unwind}>{selected ? 'Overview' : 'Previous realm'}</button></nav>
    <button className="mirrorOrb" type="button" onClick={() => { if (selected) setActiveFragment(selected.fragments[0] ?? null); else selectPattern(patterns[0] ?? null) }} aria-label={selected ? `Ask the Orb to explain ${selected.label}` : 'Ask the Orb to guide this reflection'}><span aria-hidden="true" /></button>
    <p className="mirrorAnnouncement" role="status" aria-live="polite">{activeFragment ? `${activeFragment.label}, ${activeFragment.certainty} evidence.` : selected ? `${selected.label} selected. ${selected.confidenceLabel}.` : 'Mirror overview.'}</p>
    <MovementHelp realm="Mirror" summary="Mirror is a calm evidence-aware reflection chamber." controls="Use WASD, arrows, touch movement, drag to look, Enter to inspect, Escape to return, and R or Home to reset." />
    <MobileMovementPad input={input} label="Mirror movement controls" />
    <style>{worldCss}</style>
  </main>
}

const stateCss = `.mirrorState{position:fixed;inset:0;display:grid;place-items:center;padding:24px;background:radial-gradient(circle at 50% 28%,#12303d,#02070d 58%,#010307);color:#fff}.mirrorState section{max-width:620px;text-align:center}.mirrorState p{font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase;color:#a8eef4}.mirrorState h1{font:500 clamp(2.2rem,6vw,5rem)/.95 Georgia,serif}.mirrorState span{display:block;color:#bdccd7;line-height:1.6}.mirrorState div{display:flex;justify-content:center;gap:10px;margin-top:22px}.mirrorState button{min-width:48px;min-height:48px;padding:0 18px;border:1px solid #c7f7fb;border-radius:999px;background:#dffcff;color:#041018;font-weight:900}.mirrorState button:focus-visible{outline:3px solid #fff;outline-offset:4px}`
const fallbackCss = `.mirrorFallback{position:fixed;inset:0;overflow:auto;padding:28px;background:#02070d;color:#fff}.mirrorFallback section{max-width:760px;margin:auto}.mirrorFallback p:first-child{font-size:10px;font-weight:900;letter-spacing:.2em;color:#9ceef4}.mirrorFallback h1{font:500 clamp(2.5rem,7vw,5rem)/.95 Georgia,serif}.mirrorFallback section>div{display:grid;gap:8px;margin:20px 0}.mirrorFallback button{min-height:48px;padding:0 16px;border:1px solid #bdeff3;border-radius:14px;background:#071722;color:#fff;text-align:left}.mirrorFallback button:focus-visible{outline:3px solid #fff;outline-offset:3px}`
const worldCss = `.mirrorWorld{position:fixed;inset:0;overflow:hidden;background:#02070c;color:#fff;touch-action:none}.mirrorWorld canvas{position:absolute!important;inset:0}.mirrorIdentity{position:absolute;z-index:12;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(470px,calc(100vw - 36px));text-shadow:0 3px 28px #000}.mirrorIdentity p{margin:0;color:#9ceef4;font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.mirrorIdentity h1{margin:8px 0 5px;font:500 clamp(2.2rem,5.5vw,5.4rem)/.88 Georgia,serif}.mirrorIdentity span{display:block;max-width:520px;color:#c8d7df;font-size:12px;line-height:1.55}.mirrorPatternRail{position:absolute;z-index:18;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));display:flex;gap:8px;max-width:calc(100vw - 36px);overflow:auto;padding:6px;border:1px solid #d9f8ff22;border-radius:22px;background:#03101bd9;backdrop-filter:blur(16px)}.mirrorPatternRail button{min-width:148px;min-height:56px;padding:8px 13px;border:1px solid #dffaff24;border-radius:16px;background:#0a1b25;color:#fff;text-align:left}.mirrorPatternRail button[aria-pressed=true]{background:#dffcff;color:#031018}.mirrorPatternRail strong,.mirrorPatternRail span{display:block}.mirrorPatternRail span{margin-top:3px;font-size:10px;opacity:.72}.mirrorPatternRail button:focus-visible,.mirrorThresholds button:focus-visible,.mirrorOrb:focus-visible,.mirrorInspection button:focus-visible,.mirrorInspection input:focus-visible{outline:3px solid #fff;outline-offset:3px}.mirrorInspection{position:absolute;z-index:20;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));box-sizing:border-box;width:min(430px,calc(100vw - 36px));max-height:calc(100svh - 160px);overflow:auto;padding:20px;border:1px solid #dffaff28;border-radius:24px;background:#03101beb;box-shadow:0 28px 100px #0009;backdrop-filter:blur(18px)}.mirrorInspection .close{position:absolute;right:12px;top:12px;min-width:48px;min-height:48px;border:0;border-radius:50%;background:#102733;color:#fff;font-size:24px}.mirrorInspection>p:first-of-type{margin:0;color:#9ceef4;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.mirrorInspection h2{margin:7px 54px 8px 0;font:500 2.1rem/1 Georgia,serif}.mirrorInspection>strong{display:block;color:#dcebf0;line-height:1.55}.mirrorInspection dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.mirrorInspection dl div{padding:10px;border:1px solid #dffaff17;border-radius:14px;background:#ffffff08}.mirrorInspection dt{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#9ceef4}.mirrorInspection dd{margin:5px 0 0;color:#c5d4dd;font-size:11px;line-height:1.45}.mirrorInspection label{display:block;margin-top:10px;font-size:11px;font-weight:800}.mirrorInspection input[type=range]{width:100%;min-height:48px}.fragmentList{display:grid;gap:7px}.fragmentList button{min-height:48px;padding:8px 12px;border:1px solid #dffaff20;border-radius:13px;background:#0a1b25;color:#fff;text-align:left}.fragmentList button span{display:block;margin-top:3px;font-size:9px;opacity:.65}.fragmentList button[aria-pressed=true]{background:#dffcff;color:#031018}.fragmentList button:disabled{opacity:.35}.fragmentStatus{color:#bfe8ed;font-size:11px}.mirrorThresholds{position:absolute;z-index:17;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:flex;gap:7px}.mirrorThresholds button{min-height:48px;padding:0 15px;border:1px solid #dffaff2c;border-radius:999px;background:#03101bdc;color:#fff;font-weight:850}.mirrorOrb{position:absolute;z-index:22;left:50%;bottom:max(96px,calc(env(safe-area-inset-bottom) + 90px));width:64px;height:64px;transform:translateX(-50%);border:1px solid #dffcff66;border-radius:50%;background:#03101bd9;box-shadow:0 0 40px #63dbe577;display:grid;place-items:center}.mirrorOrb span{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle,#fff 0 12%,#9ef4f8 28%,#4dcbd5 58%,transparent 76%);box-shadow:0 0 24px #9ef4f8}.mirrorAnnouncement{position:absolute;z-index:12;left:50%;bottom:max(164px,calc(env(safe-area-inset-bottom) + 158px));transform:translateX(-50%);margin:0;padding:6px 12px;border-radius:999px;background:#02070dbd;color:#c9e5e8;font-size:11px}.mirrorEmpty{position:absolute;z-index:16;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,calc(100vw - 32px));padding:20px;border:1px solid #dffaff22;border-radius:22px;background:#03101be8;text-align:center}.mirrorEmpty h2{font:500 2rem/1 Georgia,serif}.mirrorEmpty p{color:#c4d3dc;line-height:1.55}@media(max-width:760px){.mirrorIdentity{top:max(70px,calc(env(safe-area-inset-top) + 58px));max-width:calc(100vw - 32px)}.mirrorIdentity h1{font-size:2.4rem}.mirrorIdentity span{max-width:78vw}.mirrorPatternRail{left:12px;right:12px;bottom:max(90px,calc(env(safe-area-inset-bottom) + 84px));max-width:none}.mirrorPatternRail button{min-width:128px}.mirrorThresholds{left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));justify-content:center}.mirrorThresholds button{flex:1;padding:0 8px;font-size:10px}.mirrorOrb{bottom:max(164px,calc(env(safe-area-inset-bottom) + 158px));width:56px;height:56px}.mirrorAnnouncement{bottom:max(222px,calc(env(safe-area-inset-bottom) + 216px));max-width:82vw;text-align:center}.mirrorInspection{left:12px;right:12px;top:max(72px,calc(env(safe-area-inset-top) + 62px));bottom:max(238px,calc(env(safe-area-inset-bottom) + 232px));width:auto;max-height:none}.mirrorInspection dl{grid-template-columns:1fr}.urai-mobile-movement{bottom:max(250px,calc(env(safe-area-inset-bottom) + 244px))!important}}@media(prefers-reduced-motion:reduce){.mirrorWorld *{scroll-behavior:auto!important;animation:none!important;transition-duration:0s!important}}@media(forced-colors:active){.mirrorPatternRail,.mirrorInspection,.mirrorThresholds button,.mirrorOrb{border:2px solid CanvasText}}`
