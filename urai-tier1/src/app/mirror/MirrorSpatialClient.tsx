'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import * as THREE from 'three'
import { MemorySurfaceMaterial } from '@/spatial/assets/MemorySurfaceMaterial'
import { memoryFoldGeometry } from '@/spatial/assets/memoryFoldGeometry'
import { createMineralMaps } from '@/spatial/assets/naturalSurfaceMaps'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import { MobileMovementPad, MovementHelp, stepEmbodiedMotion, useDragLook, useMovementInput, type MovementInput } from '@/spatial/navigation/EmbodiedNavigation'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { applyMirrorFixture, buildMirrorPatterns, type MirrorPattern, type MirrorFragment } from '@/spatial/mirror/mirrorPatternModel'

const CAMERA_HEIGHT = 1.68
const ACCEPTANCE_FIXTURES_ENABLED = process.env.NEXT_PUBLIC_URAI_ACCEPTANCE_FIXTURES === '1'

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
    const focusTarget = selected ? new THREE.Vector3(selected.position[0] * 0.28, 0, selected.position[2] + 5.4 + temporalIndex * 0.08) : target.current
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
  const maps = useMemo(createMineralMaps, [])
  const wall = useMemo(() => {
    const geometry = new THREE.CylinderGeometry(16, 16, 14, 96, 40, true)
    const positions = geometry.getAttribute('position')
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i)
      const angle = Math.atan2(z, x)
      const relief = 1 + .014 * Math.sin(angle * 3 + y * .7) + .006 * Math.sin(angle * 7 - y * 1.2)
      positions.setXYZ(i, x * relief, y, z * relief)
    }
    geometry.computeVertexNormals()
    return geometry
  }, [])
  useEffect(() => () => { wall.dispose(); maps.forEach(map => map.dispose()) }, [wall, maps])
  return <group name="mirror-chamber-architecture" userData={{ motion: reducedMotion ? 'still' : 'still-architecture' }}>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.08, 1.1]} receiveShadow>
      <planeGeometry args={[48, 48]} />
      <meshPhysicalMaterial map={maps[0]} normalMap={maps[1]} color="#58716b" roughness={.64} metalness={.08} clearcoat={.12} />
    </mesh>
    <mesh geometry={wall} position={[0, 6.8, -2]} receiveShadow>
      <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#6d8581" roughness={.86} side={THREE.BackSide} />
    </mesh>
    <group name="mirror-reflection-basin" position={[0, .02, -3.2]}>
      <mesh receiveShadow>
        <cylinderGeometry args={[3.15, 3.65, .24, 96, 2]} />
        <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color="#334f4d" roughness={.74} metalness={.08} />
      </mesh>
      <mesh position={[0, .135, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.86, 96]} />
        <meshPhysicalMaterial color="#15383d" emissive="#0b4c55" emissiveIntensity={.14} transparent opacity={.78} roughness={.18} metalness={.08} clearcoat={.64} clearcoatRoughness={.22} />
      </mesh>
      <mesh position={[0, .17, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.72, 2.88, 96]} />
        <meshBasicMaterial color="#a5edf0" transparent opacity={.16} depthWrite={false} />
      </mesh>
    </group>
    {[-1, 1].flatMap(side => [0, 1, 2].map((level) => {
      const x = side * (5.3 + level * 1.55)
      const z = -4.4 - level * 1.7
      return <mesh key={`${side}-${level}`} position={[x, .75 + level * .22, z]} scale={[.64 + level * .12, 1.55 + level * .34, .52 + level * .09]} rotation={[.08 * side, -.24 * side + level * .08, .05 * side]} castShadow receiveShadow>
        <dodecahedronGeometry args={[1, 1]} />
        <meshStandardMaterial map={maps[0]} normalMap={maps[1]} color={level % 2 ? '#526b66' : '#667d74'} roughness={.9} />
      </mesh>
    }))}
    <pointLight position={[-4.8, 3.8, -3.2]} color="#d9ddc5" intensity={18} distance={17} decay={2} />
    <pointLight position={[4.2, 2.8, -4]} color="#9bc9cc" intensity={16} distance={15} decay={2} />
    <spotLight position={[0, 8.5, 2.5]} target-position={[0, .2, -3.2]} color="#d9f7ed" intensity={28} distance={24} angle={.38} penumbra={.92} castShadow />
  </group>
}

function EmbodiedReflection({ reducedMotion, demo }: { reducedMotion: boolean; demo: boolean }) {
  const group = useRef<THREE.Group>(null)
  const reflection = useMemo(() => memoryFoldGeometry(19), [])
  useEffect(() => () => reflection.dispose(), [reflection])
  useFrame(({ camera, clock }) => {
    if (!group.current) return
    group.current.position.x = THREE.MathUtils.damp(group.current.position.x, camera.position.x * 0.28, 3.2, 1 / 60)
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, -camera.rotation.y * 0.18, 3.2, 1 / 60)
    if (!reducedMotion) group.current.scale.y = 1 + Math.sin(clock.elapsedTime * 0.7) * 0.012
  })
  return <group ref={group} position={[0, 0, -6.25]} name="privacy-safe-user-reflection">
    <mesh geometry={reflection} position={[0, 1.25, 0]} scale={[.7, 1.0, .65]} rotation={[0, -.4, .12]}>
      <meshPhysicalMaterial vertexColors color={demo ? '#bac4d3' : '#c3e9dd'} transparent opacity={.4} roughness={.5} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  </group>
}

function PatternInstrument({ selected, onSelect, reducedMotion }: { selected: MirrorPattern | null; onSelect: (pattern: MirrorPattern | null) => void; reducedMotion: boolean }) {
  const core = useRef<THREE.Group>(null)
  const branches = useMemo(() => [2, 7, 13].map(memoryFoldGeometry), [])
  useEffect(() => () => branches.forEach(geometry => geometry.dispose()), [branches])
  useFrame(({ clock }) => {
    if (!core.current || reducedMotion) return
    core.current.rotation.y = Math.sin(clock.elapsedTime * 0.18) * .16
    core.current.rotation.x = Math.sin(clock.elapsedTime * 0.31) * 0.06
  })
  return <group position={[0, 1.28, -3.05]} scale={selected ? .82 : 1} name="mirror-reflection-instrument" userData={{ artRevision: 'mirror-layered-reflection-lamellae' }} onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); if (selected) onSelect(null) }}>
    <group ref={core}>{branches.map((geometry, index) => <mesh key={index} geometry={geometry} position={[(index - 1) * .14, index * .06, index * -.18]} rotation={[.04, (index - 1) * .8, (index - 1) * .24]} castShadow>
      <MemorySurfaceMaterial color={selected?.accent ?? (index === 1 ? '#79c2c3' : '#73948d')} reducedMotion={reducedMotion} />
    </mesh>)}</group>
    <pointLight color={selected?.accent ?? '#9df3f8'} intensity={selected ? .72 : .48} distance={5} decay={2} />
  </group>
}

function PatternObject({ pattern, selected, onSelect, reducedMotion }: { pattern: MirrorPattern; selected: boolean; onSelect: (pattern: MirrorPattern) => void; reducedMotion: boolean }) {
  const group = useRef<THREE.Group>(null)
  const geometry = useMemo(() => memoryFoldGeometry(pattern.id.length), [pattern.id])
  useEffect(() => () => geometry.dispose(), [geometry])
  useFrame(({ clock }) => {
    if (!group.current || reducedMotion) return
    group.current.position.y = pattern.position[1] + Math.sin(clock.elapsedTime * 0.62 + pattern.position[0]) * 0.08
    group.current.rotation.y = clock.elapsedTime * 0.12
  })
  const activate = (event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(pattern) }
  return <group ref={group} position={pattern.position} data-testid="mirror-pattern-object" onClick={activate}>
    <mesh geometry={geometry} castShadow scale={selected ? [.62,.68,.56] : [.78,.82,.68]} rotation={[.12, pattern.position[0] * .11, pattern.position[0] * .04]}>
      <MemorySurfaceMaterial color={pattern.accent} opacity={pattern.evidenceState === 'insufficient' ? .25 : 1} reducedMotion={reducedMotion} />
    </mesh>
    <mesh position={[0, -pattern.position[1] + .035, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[selected ? .8 : .56, 40]} />
      <meshBasicMaterial color={pattern.accent} transparent opacity={selected ? .16 : .075} depthWrite={false} />
    </mesh>
    {selected ? <pointLight color={pattern.accent} intensity={1.1} distance={6} /> : null}
  </group>
}

function FragmentObject({ fragment, accent, active, onSelect, reducedMotion }: { reducedMotion: boolean; fragment: MirrorFragment; accent: string; active: boolean; onSelect: (fragment: MirrorFragment) => void }) {
  const geometry = useMemo(() => memoryFoldGeometry(fragment.id.length), [fragment.id])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <group position={fragment.position} data-testid="mirror-reflection-fragment" onClick={(event: ThreeEvent<MouseEvent>) => { event.stopPropagation(); onSelect(fragment) }}>
    <mesh geometry={geometry} castShadow scale={active ? [.28,.48,.35] : [.24,.42,.3]} rotation={[.18, fragment.position[0] * .16, -.22]}>
      <MemorySurfaceMaterial color={accent} opacity={fragment.certainty === 'uncertain' ? .25 : 1} reducedMotion={reducedMotion} />
    </mesh>
  </group>
}

function MirrorScene({ patterns, selected, activeFragment, temporalIndex, onSelect, onFragment, ...cameraProps }: CameraProps & { patterns: MirrorPattern[]; activeFragment: MirrorFragment | null; onSelect: (pattern: MirrorPattern | null) => void; onFragment: (fragment: MirrorFragment | null) => void }) {
  return <>
    <color attach="background" args={['#02070c']} />
    <fog attach="fog" args={[selected ? '#07131c' : '#041019', 5.5, 25]} />
    <ambientLight intensity={0.25} />
    <hemisphereLight intensity={0.42} color="#e8fbff" groundColor="#06131b" />
    <directionalLight position={[4.5, 9, 5]} intensity={1.05} color="#f6fbff" castShadow shadow-radius={4} shadow-bias={-.0002} shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
    <Stars radius={56} depth={28} count={cameraProps.reducedMotion ? 160 : 520} factor={1.8} fade speed={cameraProps.reducedMotion ? 0 : 0.018} />
    <MirrorCamera selected={selected} temporalIndex={temporalIndex} {...cameraProps} />
    <ChamberArchitecture reducedMotion={cameraProps.reducedMotion} />
    <EmbodiedReflection reducedMotion={cameraProps.reducedMotion} demo={patterns.some((pattern) => pattern.provenance.includes('demonstration'))} />
    <PatternInstrument selected={selected} onSelect={onSelect} reducedMotion={cameraProps.reducedMotion} />
    {patterns.map((pattern) => <PatternObject key={pattern.id} pattern={pattern} selected={selected?.id === pattern.id} onSelect={onSelect} reducedMotion={cameraProps.reducedMotion} />)}
    {selected?.fragments.map((fragment, index) => index <= temporalIndex ? <FragmentObject key={fragment.id} reducedMotion={cameraProps.reducedMotion} fragment={fragment} accent={selected.accent} active={activeFragment?.id === fragment.id} onSelect={onFragment} /> : null)}
  </>
}

function buildMemoryHref(memoryId: string, manifestId: string, node: string, demo: boolean, destination: 'replay' | 'mirror') {
  const params = new URLSearchParams({ memoryId, manifestId, node, from: destination === 'mirror' ? 'replay-mirror-threshold' : 'mirror-fragment' })
  if (demo) params.set('demo', '1')
  return `/${destination}/?${params.toString()}`
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
  const requestedFixture = new URLSearchParams(window.location.search).get('mirrorFixture')
  setFixture(ACCEPTANCE_FIXTURES_ENABLED ? requestedFixture : null)
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
  if (!webglAvailable) return <main className="mirrorFallback" data-testid="mirror-webgl-fallback"><section>
    <p>{memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} reflection`}</p>
    <h1>{memory.title}</h1>
    <p>Spatial rendering is unavailable. The source-backed reflection remains available through semantic controls.</p>
    <div className="fallbackPatterns">{patterns.map((pattern) => <button key={pattern.id} type="button" aria-pressed={selected?.id === pattern.id} onClick={() => selectPattern(pattern)}>{pattern.label} · {pattern.confidenceLabel}</button>)}</div>
    {selected ? <article className="fallbackInspection" aria-label={`${selected.label} evidence`}>
      <button type="button" onClick={() => selectPattern(null)}>Close {selected.label}</button>
      <p>{selected.evidenceState.replace('-', ' ')}</p>
      <h2>{selected.label}</h2>
      <strong>{selected.explanation}</strong>
      <dl><div><dt>Confidence</dt><dd>{selected.confidence === null ? 'Not calculated' : `${Math.round(selected.confidence * 100)}% · ${selected.confidenceLabel}`}</dd></div><div><dt>Evidence</dt><dd>{selected.evidenceCount} permitted source{selected.evidenceCount === 1 ? '' : 's'}</dd></div><div><dt>Uncertainty</dt><dd>{selected.uncertainty}</dd></div><div><dt>Provenance</dt><dd>{selected.provenance}</dd></div></dl>
      {selected.fragments.length ? <ul>{selected.fragments.map((fragment) => <li key={fragment.id}><strong>{fragment.label}</strong><span>{fragment.certainty}</span></li>)}</ul> : <p>No source fragments are available for this pattern.</p>}
    </article> : null}
    <nav aria-label="Mirror fallback transitions"><button type="button" onClick={goReplay}>Return to Replay</button><button type="button" onClick={goPassport}>Open Passport</button></nav>
  </section><style>{fallbackCss}</style></main>

  const offline = !online || fixture === 'offline'
  const empty = fixture === 'empty' || patterns.length === 0
  return <main ref={shellRef} className="mirrorWorld" data-testid="mirror-spatial-world" data-mirror-renderer="webgl-r3f" data-memory-status={result.status} data-memory-id={memory.id} data-manifest-id={memory.replayManifest.id} data-demo={memory.demo ? 'true' : 'false'} data-online={offline ? 'false' : 'true'} data-selected-pattern={selected?.id ?? 'overview'} {...look}>
    <Canvas camera={{ position: [0, CAMERA_HEIGHT, 6.8], fov: 51, near: 0.08, far: 100 }} dpr={[1, 1.5]} shadows onCreated={({ gl }) => { gl.outputColorSpace = THREE.SRGBColorSpace; gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = .82 }}>
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

    {selected ? <aside className="mirrorInspection" data-movement-ui="true" aria-live="polite" aria-label={`${selected.label} evidence`}>
      <header className="mirrorInspectionHeader">
        <button className="close" type="button" onClick={() => selectPattern(null)} aria-label="Return to Mirror overview">×</button>
        <p>{selected.evidenceState.replace('-', ' ')}</p><h2>{selected.label}</h2>
      </header>
      <strong>{selected.explanation}</strong>
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
const fallbackCss = `.mirrorFallback{position:fixed;inset:0;overflow:auto;padding:28px;background:#02070d;color:#fff}.mirrorFallback section{max-width:760px;margin:auto}.mirrorFallback p:first-child{font-size:10px;font-weight:900;letter-spacing:.2em;color:#9ceef4}.mirrorFallback h1{font:500 clamp(2.5rem,7vw,5rem)/.95 Georgia,serif}.mirrorFallback section>div{display:grid;gap:8px;margin:20px 0}.mirrorFallback button{min-height:48px;padding:0 16px;border:1px solid #bdeff3;border-radius:14px;background:#071722;color:#fff;text-align:left}.mirrorFallback button:focus-visible{outline:3px solid #fff;outline-offset:3px}.fallbackPatterns{display:grid;gap:8px;margin:20px 0}.fallbackInspection{margin:18px 0;padding:18px;border:1px solid #bdeff333;border-radius:18px;background:#071722}.fallbackInspection h2{font:500 2rem/1 Georgia,serif}.fallbackInspection dl{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.fallbackInspection dl div,.fallbackInspection li{padding:10px;border:1px solid #bdeff322;border-radius:12px}.fallbackInspection dt{font-size:10px;text-transform:uppercase;letter-spacing:.12em}.fallbackInspection dd{margin:4px 0 0}.fallbackInspection ul{display:grid;gap:8px;padding:0;list-style:none}.fallbackInspection li strong,.fallbackInspection li span{display:block}.fallbackInspection nav{display:flex;flex-wrap:wrap;gap:8px}@media(max-width:620px){.fallbackInspection dl{grid-template-columns:1fr}}`
const worldCss = `.mirrorWorld{position:fixed;inset:0;overflow:hidden;background:#02070c;color:#fff;touch-action:none}.mirrorWorld canvas{position:absolute!important;inset:0}.mirrorIdentity{position:absolute;z-index:12;left:max(18px,env(safe-area-inset-left));top:max(18px,env(safe-area-inset-top));max-width:min(470px,calc(100vw - 36px));text-shadow:0 3px 28px #000}.mirrorIdentity p{margin:0;color:#9ceef4;font-size:10px;font-weight:900;letter-spacing:.2em;text-transform:uppercase}.mirrorIdentity h1{margin:8px 0 5px;font:500 clamp(2.2rem,5.5vw,5.4rem)/.88 Georgia,serif}.mirrorIdentity span{display:block;max-width:520px;color:#c8d7df;font-size:12px;line-height:1.55}.mirrorPatternRail{position:absolute;z-index:18;left:max(18px,env(safe-area-inset-left));bottom:max(18px,env(safe-area-inset-bottom));display:flex;gap:8px;max-width:calc(100vw - 36px);overflow:auto;padding:6px;border:1px solid #d9f8ff22;border-radius:22px;background:#03101bd9;backdrop-filter:blur(16px)}.mirrorPatternRail button{min-width:148px;min-height:56px;padding:8px 13px;border:1px solid #dffaff24;border-radius:16px;background:#0a1b25;color:#fff;text-align:left}.mirrorPatternRail button[aria-pressed=true]{background:#dffcff;color:#031018}.mirrorPatternRail strong,.mirrorPatternRail span{display:block}.mirrorPatternRail span{margin-top:3px;font-size:10px;opacity:.72}.mirrorPatternRail button:focus-visible,.mirrorThresholds button:focus-visible,.mirrorOrb:focus-visible,.mirrorInspection button:focus-visible,.mirrorInspection input:focus-visible{outline:3px solid #fff;outline-offset:3px}.mirrorInspection{touch-action:pan-y;overscroll-behavior:contain;position:absolute;z-index:20;right:max(18px,env(safe-area-inset-right));top:max(18px,env(safe-area-inset-top));box-sizing:border-box;width:min(430px,calc(100vw - 36px));max-height:calc(100svh - 160px);overflow:auto;padding:20px;border:1px solid #dffaff28;border-radius:24px;background:#03101beb;box-shadow:0 28px 100px #0009;backdrop-filter:blur(18px)}.mirrorInspection .close{position:absolute;right:12px;top:12px;min-width:48px;min-height:48px;border:0;border-radius:50%;background:#102733;color:#fff;font-size:24px}.mirrorInspection>p:first-of-type{margin:0;color:#9ceef4;font-size:10px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.mirrorInspection h2{margin:7px 54px 8px 0;font:500 2.1rem/1 Georgia,serif}.mirrorInspection>strong{display:block;color:#dcebf0;line-height:1.55}.mirrorInspection dl{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:18px 0}.mirrorInspection dl div{padding:10px;border:1px solid #dffaff17;border-radius:14px;background:#ffffff08}.mirrorInspection dt{font-size:9px;text-transform:uppercase;letter-spacing:.14em;color:#9ceef4}.mirrorInspection dd{margin:5px 0 0;color:#c5d4dd;font-size:11px;line-height:1.45}.mirrorInspection label{display:block;margin-top:10px;font-size:11px;font-weight:800}.mirrorInspection input[type=range]{width:100%;min-height:48px}.fragmentList{display:grid;gap:7px}.fragmentList button{min-height:48px;padding:8px 12px;border:1px solid #dffaff20;border-radius:13px;background:#0a1b25;color:#fff;text-align:left}.fragmentList button span{display:block;margin-top:3px;font-size:9px;opacity:.65}.fragmentList button[aria-pressed=true]{background:#dffcff;color:#031018}.fragmentList button:disabled{opacity:.35}.fragmentStatus{color:#bfe8ed;font-size:11px}.mirrorThresholds{position:absolute;z-index:17;right:max(18px,env(safe-area-inset-right));bottom:max(18px,env(safe-area-inset-bottom));display:flex;gap:7px}.mirrorThresholds button{min-height:48px;padding:0 15px;border:1px solid #dffaff2c;border-radius:999px;background:#03101bdc;color:#fff;font-weight:850}.mirrorOrb{position:absolute;z-index:22;left:50%;bottom:max(96px,calc(env(safe-area-inset-bottom) + 90px));width:64px;height:64px;transform:translateX(-50%);border:1px solid #dffcff66;border-radius:50%;background:#03101bd9;box-shadow:0 0 40px #63dbe577;display:grid;place-items:center}.mirrorOrb span{width:28px;height:28px;border-radius:50%;background:radial-gradient(circle,#fff 0 12%,#9ef4f8 28%,#4dcbd5 58%,transparent 76%);box-shadow:0 0 24px #9ef4f8}.mirrorAnnouncement{position:absolute;z-index:12;left:50%;bottom:max(164px,calc(env(safe-area-inset-bottom) + 158px));transform:translateX(-50%);margin:0;padding:6px 12px;border-radius:999px;background:#02070dbd;color:#c9e5e8;font-size:11px}.mirrorEmpty{position:absolute;z-index:16;left:50%;top:50%;transform:translate(-50%,-50%);width:min(520px,calc(100vw - 32px));padding:20px;border:1px solid #dffaff22;border-radius:22px;background:#03101be8;text-align:center}.mirrorEmpty h2{font:500 2rem/1 Georgia,serif}.mirrorEmpty p{color:#c4d3dc;line-height:1.55}@media(max-width:760px){.mirrorIdentity{top:max(70px,calc(env(safe-area-inset-top) + 58px));max-width:calc(100vw - 32px)}.mirrorIdentity h1{font-size:2.4rem}.mirrorIdentity span{max-width:78vw}.mirrorPatternRail{left:12px;right:12px;bottom:max(90px,calc(env(safe-area-inset-bottom) + 84px));max-width:none}.mirrorPatternRail button{min-width:128px}.mirrorThresholds{left:12px;right:12px;bottom:max(12px,env(safe-area-inset-bottom));justify-content:center}.mirrorThresholds button{flex:1;padding:0 8px;font-size:10px}.mirrorOrb{bottom:max(164px,calc(env(safe-area-inset-bottom) + 158px));width:56px;height:56px}.mirrorAnnouncement{bottom:max(222px,calc(env(safe-area-inset-bottom) + 216px));max-width:82vw;text-align:center}.mirrorInspection{left:12px;right:12px;top:max(72px,calc(env(safe-area-inset-top) + 62px));bottom:max(238px,calc(env(safe-area-inset-bottom) + 232px));width:auto;max-height:none}.mirrorInspection dl{grid-template-columns:1fr}.urai-mobile-movement{bottom:max(250px,calc(env(safe-area-inset-bottom) + 244px))!important}}@media(prefers-reduced-motion:reduce){.mirrorWorld *{scroll-behavior:auto!important;animation:none!important;transition-duration:0s!important}}@media(forced-colors:active){.mirrorPatternRail,.mirrorInspection,.mirrorThresholds button,.mirrorOrb{border:2px solid CanvasText}}`
