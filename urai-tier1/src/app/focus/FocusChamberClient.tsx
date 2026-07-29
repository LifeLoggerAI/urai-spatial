'use client'

import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { assetCssStack, focusAssets } from '@/spatial/assets/uraiAssets'
import { markFirstSpatialFrame, useAdaptiveSpatialQuality, type SpatialQualityProfile } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const DEFAULT_CAMERA: [number, number, number] = [0, 1.45, 8.2]
const DEFAULT_TARGET: [number, number, number] = [0, 0.45, -1.3]
const CAMERA_LIMIT = 8.8

type ChamberState = 'neutral' | 'loading' | 'ready' | 'unavailable' | 'unauthorized' | 'corrupt' | 'deleted'
type WebGLState = 'ready' | 'lost' | 'restoring' | 'failed'

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
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

function FirstFrame({ profile }: { profile: SpatialQualityProfile }) {
  const marked = useRef(false)
  useFrame(() => {
    if (marked.current || !profile.documentVisible) return
    marked.current = true
    markFirstSpatialFrame('/focus', profile.tier)
  })
  return null
}

function WebGLRecoveryBridge({ onStateChange }: { onStateChange: (state: WebGLState) => void }) {
  const { gl } = useThree()
  const lossCount = useRef(0)
  useEffect(() => {
    const canvas = gl.domElement
    let timer: number | null = null
    const clearTimer = () => {
      if (timer === null) return
      window.clearTimeout(timer)
      timer = null
    }
    const lost = (event: Event) => {
      event.preventDefault()
      clearTimer()
      lossCount.current += 1
      if (lossCount.current >= 2) {
        onStateChange('failed')
        return
      }
      onStateChange('lost')
      timer = window.setTimeout(() => {
        timer = null
        onStateChange('restoring')
      }, 180)
    }
    const restored = () => {
      clearTimer()
      onStateChange('ready')
    }
    canvas.addEventListener('webglcontextlost', lost, false)
    canvas.addEventListener('webglcontextrestored', restored, false)
    return () => {
      clearTimer()
      canvas.removeEventListener('webglcontextlost', lost, false)
      canvas.removeEventListener('webglcontextrestored', restored, false)
    }
  }, [gl, onStateChange])
  return null
}

function FocusCameraRig({ controls, recenterSignal, shellRef }: { controls: RefObject<OrbitControlsImpl | null>; recenterSignal: number; shellRef: RefObject<HTMLElement | null> }) {
  const { camera } = useThree()
  const keys = useRef(new Set<string>())
  const target = useMemo(() => new THREE.Vector3(...DEFAULT_TARGET), [])
  const defaultTarget = useMemo(() => new THREE.Vector3(...DEFAULT_TARGET), [])
  const defaultCamera = useMemo(() => new THREE.Vector3(...DEFAULT_CAMERA), [])
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const movement = useRef(new THREE.Vector3())

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches('input,textarea,select,[contenteditable="true"]')) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        keys.current.add(event.code)
        event.preventDefault()
      }
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.code)
    const clearKeys = () => keys.current.clear()
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clearKeys)
    return () => {
      clearKeys()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clearKeys)
    }
  }, [])

  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA)
    controls.current?.target.set(...DEFAULT_TARGET)
    controls.current?.update()
  }, [camera, controls, recenterSignal])

  useFrame((_, delta) => {
    const moving = keys.current.size > 0
    if (moving) {
      const forwardVector = forward.current
      camera.getWorldDirection(forwardVector)
      forwardVector.y = 0
      if (forwardVector.lengthSq() > 0.0001) {
        forwardVector.normalize()
        const rightVector = right.current.crossVectors(forwardVector, camera.up).normalize()
        const movementVector = movement.current.set(0, 0, 0)
        if (keys.current.has('KeyW') || keys.current.has('ArrowUp')) movementVector.add(forwardVector)
        if (keys.current.has('KeyS') || keys.current.has('ArrowDown')) movementVector.sub(forwardVector)
        if (keys.current.has('KeyD') || keys.current.has('ArrowRight')) movementVector.add(rightVector)
        if (keys.current.has('KeyA') || keys.current.has('ArrowLeft')) movementVector.sub(rightVector)
        if (movementVector.lengthSq()) {
          movementVector.normalize().multiplyScalar(2.15 * Math.min(delta, 0.05))
          camera.position.add(movementVector)
          camera.position.x = THREE.MathUtils.clamp(camera.position.x, -CAMERA_LIMIT, CAMERA_LIMIT)
          camera.position.y = THREE.MathUtils.clamp(camera.position.y, -1.2, 5.5)
          camera.position.z = THREE.MathUtils.clamp(camera.position.z, -0.4, 12)
          target.copy(controls.current?.target ?? defaultTarget).addScaledVector(movementVector, 0.72)
          target.x = THREE.MathUtils.clamp(target.x, -5.5, 5.5)
          target.y = THREE.MathUtils.clamp(target.y, -1, 4)
          target.z = THREE.MathUtils.clamp(target.z, -5.5, 1)
          controls.current?.target.copy(target)
          controls.current?.update()
        }
      }
    }
    const shell = shellRef.current
    if (shell) {
      shell.dataset.focusCameraX = camera.position.x.toFixed(3)
      shell.dataset.focusCameraY = camera.position.y.toFixed(3)
      shell.dataset.focusCameraZ = camera.position.z.toFixed(3)
      shell.dataset.focusDistance = camera.position.distanceTo(defaultCamera).toFixed(3)
      shell.dataset.focusMoving = moving ? 'true' : 'false'
    }
  })
  return null
}

function ChamberArchitecture({ accent, light, reducedMotion }: { accent: string; light: string; reducedMotion: boolean }) {
  const outer = useRef<THREE.Group>(null)
  const inner = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (reducedMotion) return
    if (outer.current) outer.current.rotation.z = clock.elapsedTime * 0.018
    if (inner.current) inner.current.rotation.z = -clock.elapsedTime * 0.027
  })
  return <group name="focus-observatory-architecture">
    <group ref={outer} rotation={[Math.PI / 2.18, 0, 0]}>
      <mesh><torusGeometry args={[5.6, 0.025, 12, 180]} /><meshBasicMaterial color={light} transparent opacity={0.18} depthWrite={false} /></mesh>
      <mesh rotation={[0.35, 0.2, 0.5]}><torusGeometry args={[4.45, 0.018, 10, 160]} /><meshBasicMaterial color={accent} transparent opacity={0.24} depthWrite={false} /></mesh>
    </group>
    <group ref={inner} rotation={[Math.PI / 2.8, 0.35, 0.1]}><mesh><torusGeometry args={[3.2, 0.014, 10, 140]} /><meshBasicMaterial color={accent} transparent opacity={0.3} depthWrite={false} /></mesh></group>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.55, -1.2]} receiveShadow><circleGeometry args={[13, 96]} /><meshPhysicalMaterial color="#030813" roughness={0.3} metalness={0.68} transparent opacity={0.92} clearcoat={0.7} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.51, -1.2]}><ringGeometry args={[2.2, 11.4, 128]} /><meshBasicMaterial color={accent} transparent opacity={0.08} side={THREE.DoubleSide} depthWrite={false} /></mesh>
    {[-5.4, 5.4].map((x) => <group key={x} position={[x, 0, -3.8]}><mesh><cylinderGeometry args={[0.11, 0.22, 5.8, 18]} /><meshStandardMaterial color="#07111d" emissive={accent} emissiveIntensity={0.35} metalness={0.78} roughness={0.24} /></mesh><pointLight position={[0, 1.8, 0]} color={accent} intensity={1.6} distance={7} /></group>)}
  </group>
}

function MemoryTraces({ memory, accent, reducedMotion }: { memory: SelectedMemory | null; accent: string; reducedMotion: boolean }) {
  const count = memory ? Math.min(7, Math.max(3, memory.people.length + memory.emotionalArc.length + (memory.place ? 1 : 0))) : 5
  const refs = useRef<Array<THREE.Group | null>>([])
  const positions = useMemo(() => Array.from({ length: count }, (_, index) => {
    const angle = (index / count) * Math.PI * 2 + 0.4
    const radius = 3.5 + (index % 2) * 1.15
    return [Math.cos(angle) * radius, -0.1 + (index % 3) * 0.75, -2.1 + Math.sin(angle) * radius * 0.44] as [number, number, number]
  }), [count])
  useFrame(({ clock }) => {
    if (reducedMotion) return
    refs.current.forEach((group, index) => {
      if (!group) return
      group.position.y = positions[index][1] + Math.sin(clock.elapsedTime * 0.62 + index * 0.7) * 0.08
      group.rotation.y = clock.elapsedTime * 0.08 + index * 0.7
    })
  })
  return <group name="focus-grounded-memory-traces">{positions.map((position, index) => <group key={index} ref={(value) => { refs.current[index] = value }} position={position}><mesh><octahedronGeometry args={[0.18, 1]} /><meshStandardMaterial color="#07121e" emissive={accent} emissiveIntensity={1.4} roughness={0.24} metalness={0.52} /></mesh><mesh><sphereGeometry args={[0.46, 18, 18]} /><meshBasicMaterial color={accent} transparent opacity={0.045} depthWrite={false} blending={THREE.AdditiveBlending} /></mesh></group>)}</group>
}

function MemoryAperture({ memory, accent, light, reducedMotion, onActivate }: { memory: SelectedMemory | null; accent: string; light: string; reducedMotion: boolean; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)
  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const wanted = hovered ? 1.08 : reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 1.4) * 0.035
    const nextScale = THREE.MathUtils.lerp(group.current.scale.x, wanted, 1 - Math.exp(-5.5 * delta))
    group.current.scale.setScalar(nextScale)
    if (!reducedMotion) group.current.rotation.y = Math.sin(clock.elapsedTime * 0.22) * 0.1
  })
  const pointer = (event: ThreeEvent<PointerEvent>, state: boolean) => {
    event.stopPropagation()
    setHovered(state)
    document.body.style.cursor = state && memory ? 'pointer' : ''
  }
  return <group ref={group} position={[0, 0.35, -1.55]} name="focus-memory-aperture">
    <mesh onClick={(event) => { event.stopPropagation(); if (memory) onActivate() }} onPointerOver={(event) => pointer(event, true)} onPointerOut={(event) => pointer(event, false)}><icosahedronGeometry args={[1.18, 3]} /><meshPhysicalMaterial color="#07131f" emissive={accent} emissiveIntensity={memory ? (hovered ? 2.8 : 1.55) : 0.42} transmission={0.38} thickness={0.7} roughness={0.12} metalness={0.18} transparent opacity={memory ? 0.92 : 0.55} clearcoat={1} /></mesh>
    <mesh scale={1.42}><icosahedronGeometry args={[1.18, 2]} /><meshBasicMaterial color={accent} wireframe transparent opacity={memory ? 0.16 : 0.08} depthWrite={false} /></mesh>
    <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[1.75, 0.025, 12, 120]} /><meshBasicMaterial color={light} transparent opacity={hovered ? 0.72 : 0.28} depthWrite={false} /></mesh>
    <pointLight color={accent} intensity={memory ? 6.5 : 2.1} distance={11} decay={2} />
    <Html center position={[0, -2.25, 0]} transform distanceFactor={7.6}><button type="button" className="focus-spatial-aperture-button" disabled={!memory} onClick={onActivate} aria-label={memory ? `Open Replay for ${memory.title}` : 'Select a memory in Life Map to open Replay'}>{memory ? 'Enter Replay' : 'Awaiting a selected star'}</button></Html>
  </group>
}

function FocusScene({ memory, profile, recenterSignal, onActivate, controls, onWebGLState, shellRef }: { memory: SelectedMemory | null; profile: SpatialQualityProfile; recenterSignal: number; onActivate: () => void; controls: RefObject<OrbitControlsImpl | null>; onWebGLState: (state: WebGLState) => void; shellRef: RefObject<HTMLElement | null> }) {
  const accent = memory?.visuals.accent ?? '#79dfff'
  const light = memory?.visuals.light ?? '#e7fbff'
  return <>
    <FirstFrame profile={profile} />
    <WebGLRecoveryBridge onStateChange={onWebGLState} />
    <color attach="background" args={[memory?.visuals.sky ?? '#020712']} />
    <fog attach="fog" args={[memory?.visuals.sky ?? '#020712', 7.5, 31]} />
    <ambientLight intensity={0.32} color="#d8efff" />
    <hemisphereLight args={[light, '#02030a', 0.75]} />
    <directionalLight position={[5, 8, 7]} intensity={1.35} color={light} castShadow={profile.shadows} />
    <pointLight position={[0, 1, -1.5]} intensity={3.4} color={accent} distance={14} />
    <Stars radius={65} depth={45} count={profile.reducedMotion ? 500 : profile.particleCount * 3} factor={2.5} saturation={0.25} fade speed={profile.reducedMotion ? 0 : 0.12} />
    <ChamberArchitecture accent={accent} light={light} reducedMotion={profile.reducedMotion} />
    <MemoryTraces memory={memory} accent={accent} reducedMotion={profile.reducedMotion} />
    <MemoryAperture memory={memory} accent={accent} light={light} reducedMotion={profile.reducedMotion} onActivate={onActivate} />
    <OrbitControls ref={controls} makeDefault enableDamping={!profile.reducedMotion} dampingFactor={0.07} enablePan={false} enableZoom minDistance={3.4} maxDistance={11.5} zoomSpeed={0.55} rotateSpeed={0.32} minPolarAngle={0.58} maxPolarAngle={1.9} target={DEFAULT_TARGET} />
    <FocusCameraRig controls={controls} recenterSignal={recenterSignal} shellRef={shellRef} />
  </>
}

export default function FocusChamberClient() {
  const result = useSelectedMemory()
  const memory = result.memory
  const profile = useAdaptiveSpatialQuality()
  const webglAvailable = useWebGLAvailable()
  const controls = useRef<OrbitControlsImpl | null>(null)
  const shellRef = useRef<HTMLElement | null>(null)
  const [recenterSignal, setRecenterSignal] = useState(0)
  const [committed, setCommitted] = useState(false)
  const [directEntry, setDirectEntry] = useState<boolean | null>(null)
  const [webglState, setWebglState] = useState<WebGLState>('ready')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setDirectEntry(!params.get('memoryId') && !params.get('node'))
    return () => { document.body.style.cursor = '' }
  }, [])

  const replayHref = useMemo(() => {
    if (!memory) return null
    const next = new URLSearchParams({ memoryId: memory.id, manifestId: memory.replayManifest.id, node: memory.star.id, from: 'focus-artifact' })
    if (memory.demo) next.set('demo', '1')
    return `/replay?${next.toString()}`
  }, [memory])

  const enterReplay = useCallback(() => {
    if (!memory || !replayHref || committed) return
    setCommitted(true)
    requestUraiWorldTravel({ destination: 'replay', href: replayHref, entryPortal: 'focus-memory-aperture', cameraCheckpoint: `focus:${memory.star.id}`, context: { memoryId: memory.id, replayManifestId: memory.replayManifest.id, privacyMode: memory.privacy === 'private' ? 'held-private' : 'private' } })
  }, [committed, memory, replayHref])
  const unwind = useCallback(() => requestUraiWorldReturn(), [])

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || (event.target instanceof HTMLElement && event.target.matches('input,textarea,select,[contenteditable="true"]'))) return
      event.preventDefault()
      unwind()
    }
    window.addEventListener('keydown', onEscape, true)
    return () => window.removeEventListener('keydown', onEscape, true)
  }, [unwind])

  const chamberState: ChamberState = memory ? 'ready' : result.status === 'loading' ? 'loading' : result.status
  const heading = memory?.title ?? (directEntry ? 'Focus Observatory' : 'Memory chamber resting')
  const description = memory?.narrator.focus ?? (directEntry ? 'Choose a star in Life Map to inhabit the place where that memory is held.' : result.message)
  const style = { '--memory-accent': memory?.visuals.accent ?? '#79dfff', '--memory-light': memory?.visuals.light ?? '#e7fbff', '--memory-sky': memory?.visuals.sky ?? '#020712', '--memory-ground': memory?.visuals.ground ?? '#07121c', '--focus-asset': assetCssStack(focusAssets.primary) } as CSSProperties
  const webglUsable = webglAvailable === true && webglState !== 'failed'

  return <main ref={shellRef} className="focusWorld" style={style} data-testid="urai-final-focus-chamber" data-focus-composition="living-memory-chamber" data-focus-spatial="explorable-observatory" data-focus-movement="walk-keyboard-orbit-touch" data-focus-pointer-lock="false" data-focus-camera-x="0.000" data-focus-camera-y="1.450" data-focus-camera-z="8.200" data-focus-distance="0.000" data-focus-moving="false" data-memory-status={result.status} data-chamber-state={chamberState} data-webgl-state={webglState} data-canonical-asset={focusAssets.primary.src} data-spatial-quality={profile.tier} data-memory-id={memory?.id} data-manifest-id={memory?.replayManifest.id} data-star-id={memory?.star.id} data-node={memory?.star.id}>
    <h1 className="srOnly">URAI Focus spatial memory observatory</h1>
    <div className="focusBackdrop" aria-hidden="true" />
    <div className="focusFog" aria-hidden="true" />
    <div className="focusCanvas" aria-label="Explorable Focus chamber. Drag to orbit, scroll or pinch to move through depth, and use W A S D or arrow keys to travel.">
      {webglAvailable === null ? <div className="focusFallback" role="status">Preparing spatial chamber…</div> : webglUsable ? <Suspense fallback={<div className="focusFallback" role="status">Opening spatial chamber…</div>}><Canvas camera={{ position: DEFAULT_CAMERA, fov: 48, near: 0.08, far: 120 }} dpr={[1, profile.pixelRatioMax]} shadows={profile.shadows} frameloop={profile.documentVisible ? 'always' : 'never'} gl={{ antialias: profile.antialias, alpha: false, powerPreference: 'high-performance' }}><FocusScene memory={memory} profile={profile} recenterSignal={recenterSignal} onActivate={enterReplay} controls={controls} onWebGLState={setWebglState} shellRef={shellRef} /></Canvas></Suspense> : <div className="focusFallback" role="status" data-focus-fallback="semantic"><strong>Spatial view unavailable</strong><span>The chamber remains accessible through the controls and memory details.</span></div>}
    </div>
    <header className="focusHeading"><p>{memory ? (memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} memory`) : 'URAI · FOCUS OBSERVATORY'}</p><h2>{heading}</h2>{memory ? <span>{dateLabel(memory.occurredAt)}</span> : null}<div className="focusNarration"><small>{memory ? 'Selected memory' : 'Chamber threshold'}</small><strong>{description}</strong></div></header>
    <section className="artifactStage" aria-label={memory ? `Selected memory ${memory.title}` : 'Neutral Focus observatory'}><span className="apertureOrbit apertureOrbitOuter" aria-hidden="true" /><span className="apertureOrbit apertureOrbitInner" aria-hidden="true" /></section>
    <aside className="memoryMeaning" aria-label="Selected memory context"><p>{memory ? 'Held in context. Nothing leaves this chamber.' : result.status === 'loading' ? 'Opening the selected memory safely.' : 'No personal memory is displayed in this neutral observatory.'}</p>{memory ? <dl><div><dt>Emotion</dt><dd>{memory.emotionalState}</dd></div><div><dt>Place</dt><dd>{memory.place?.label ?? 'Not recorded'}</dd></div><div><dt>People</dt><dd>{memory.people.map((person) => person.relationship ? `${person.label} · ${person.relationship}` : person.label).join(', ') || 'Not recorded'}</dd></div><div><dt>Privacy</dt><dd>{memory.privacy}</dd></div></dl> : <div className="neutralActions"><button type="button" onClick={unwind}>Open Life Map</button><span>{result.status === 'loading' ? 'Loading' : result.message}</span></div>}</aside>
    <nav className="focusControls" aria-label="Focus chamber controls"><button type="button" onClick={() => setRecenterSignal((value) => value + 1)}>Recenter</button>{memory ? <button type="button" className="primary" disabled={committed} onClick={enterReplay} aria-label={`Open Replay for ${memory.title}`}>{committed ? 'Opening…' : 'Enter Replay'}</button> : null}<button className="unwind" type="button" onClick={unwind}>← Life Map</button></nav>
    <details className="focusHelp"><summary>Explore</summary><p>Drag to orbit. Scroll or pinch to move through depth. Use W A S D or arrow keys to travel. Recenter restores the arrival view. Escape returns to Life Map.</p></details>
    {webglState !== 'ready' && webglState !== 'failed' ? <section className="webglRecovery" role="status" aria-live="assertive"><strong>{webglState === 'lost' ? 'Visual field paused safely' : 'Restoring visual field'}</strong><span>Your selected memory and privacy state remain preserved.</span><button type="button" onClick={() => setRecenterSignal((value) => value + 1)}>Recenter when restored</button></section> : null}
    <div className="focusStatus" role={result.status === 'loading' ? 'status' : 'note'} aria-live="polite">{memory ? 'Spatial chamber ready' : result.status === 'loading' ? 'Opening selected memory' : directEntry ? 'Neutral observatory' : result.message}</div>
    <style>{focusCss}</style>
  </main>
}

const focusCss = `.focusWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--memory-ground);isolation:isolate;font-family:Inter,system-ui,sans-serif}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.focusBackdrop{position:absolute;inset:-3%;z-index:-4;background-image:linear-gradient(180deg,rgba(1,4,10,.08),rgba(1,4,10,.78)),var(--focus-asset);background-size:cover;background-position:center;filter:saturate(.72) contrast(1.08);opacity:.38;transform:scale(1.04)}.focusFog{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--memory-accent) 10%,transparent),transparent 28%),linear-gradient(180deg,rgba(1,4,10,.04),rgba(1,4,10,.25) 72%,rgba(1,4,10,.78));mix-blend-mode:screen}.focusCanvas{position:absolute;inset:0;z-index:1}.focusCanvas canvas{touch-action:none}.focusFallback{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 42%,rgba(76,202,255,.14),transparent 32%),linear-gradient(180deg,#020712,#06101d);color:#fff}.focusFallback span{max-width:520px;color:rgba(235,247,255,.72)}.focusHeading{position:absolute;z-index:6;left:max(22px,env(safe-area-inset-left));top:max(24px,env(safe-area-inset-top));width:min(470px,42vw);pointer-events:none;text-shadow:0 8px 34px #000}.focusHeading>p{margin:0;color:var(--memory-light);font-size:10px;font-weight:900;letter-spacing:.24em;text-transform:uppercase}.focusHeading h2{max-width:11ch;margin:12px 0 8px;font:500 clamp(2.8rem,5.8vw,6.8rem)/.88 Georgia,serif;letter-spacing:-.06em;text-wrap:balance}.focusHeading>span{font-size:11px;color:rgba(255,255,255,.7)}.focusNarration{max-width:430px;margin-top:22px;padding:14px 16px;border-left:1px solid color-mix(in srgb,var(--memory-light) 58%,transparent);background:linear-gradient(90deg,rgba(2,7,12,.72),rgba(2,7,12,.06));backdrop-filter:blur(14px)}.focusNarration small{display:block;margin-bottom:6px;color:var(--memory-light);font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.focusNarration strong{display:block;font:500 clamp(1rem,1.8vw,1.45rem)/1.3 Georgia,serif}.artifactStage{position:absolute;z-index:3;left:50%;top:46%;width:min(43vw,560px);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none}.apertureOrbit{position:absolute;inset:0;border:1px solid color-mix(in srgb,var(--memory-light) 18%,transparent);border-radius:50%;opacity:.18}.apertureOrbitInner{inset:18%;transform:rotate(22deg) scaleY(.72);border-color:color-mix(in srgb,var(--memory-accent) 26%,transparent)}.memoryMeaning{position:absolute;z-index:7;left:max(22px,env(safe-area-inset-left));bottom:max(22px,calc(env(safe-area-inset-bottom) + 8px));width:min(500px,40vw);padding:13px 15px;border:1px solid color-mix(in srgb,var(--memory-light) 18%,transparent);border-radius:18px;background:linear-gradient(135deg,rgba(2,7,12,.82),rgba(2,7,12,.38));backdrop-filter:blur(18px)}.memoryMeaning p{margin:0 0 10px;font-size:11px;font-weight:800}.memoryMeaning dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0}.memoryMeaning dt{font-size:8px;text-transform:uppercase;letter-spacing:.15em;color:var(--memory-light)}.memoryMeaning dd{margin:3px 0 0;font-size:10px;line-height:1.35;color:rgba(255,255,255,.72)}.neutralActions{display:flex;align-items:center;gap:10px}.neutralActions button,.focusControls button,.webglRecovery button{min-height:48px;padding:0 17px;border-radius:999px;border:1px solid rgba(220,248,255,.24);background:rgba(6,20,31,.84);color:#fff;font-weight:850}.neutralActions span{font-size:10px;color:rgba(235,247,255,.68)}.focusControls{position:absolute;z-index:9;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:flex;gap:8px;padding:7px;border:1px solid rgba(215,246,255,.17);border-radius:999px;background:rgba(2,7,12,.68);backdrop-filter:blur(16px)}.focusControls .primary{background:linear-gradient(135deg,var(--memory-light),var(--memory-accent));color:#031019}.focusControls button:focus-visible,.neutralActions button:focus-visible,.focusHelp summary:focus-visible,.focus-spatial-aperture-button:focus-visible,.webglRecovery button:focus-visible{outline:3px solid var(--memory-light);outline-offset:3px}.focusHelp{position:absolute;z-index:9;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:min(380px,calc(100vw - 40px));border:1px solid rgba(215,246,255,.17);border-radius:18px;background:rgba(2,7,12,.72);backdrop-filter:blur(16px)}.focusHelp summary{min-height:48px;display:flex;align-items:center;padding:0 17px;font-weight:850;cursor:pointer}.focusHelp p{margin:0;padding:0 17px 16px;color:rgba(235,247,255,.78);font-size:12px;line-height:1.55}.focusStatus{position:absolute;z-index:8;left:50%;top:max(18px,env(safe-area-inset-top));transform:translateX(-50%);padding:8px 12px;border-radius:999px;background:rgba(2,7,12,.62);font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.webglRecovery{position:absolute;z-index:15;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:rgba(1,5,12,.88)}.focus-spatial-aperture-button{min-width:170px;min-height:48px;border:1px solid rgba(220,248,255,.3);border-radius:999px;background:rgba(4,15,24,.86);color:#fff;font-weight:900;cursor:pointer}.focus-spatial-aperture-button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:760px){.focusHeading{left:16px;top:16px;width:calc(100vw - 32px)}.focusHeading h2{font-size:clamp(2.25rem,12vw,4rem);max-width:9ch}.focusNarration{margin-top:12px;max-width:min(82vw,380px)}.memoryMeaning{left:16px;bottom:max(142px,calc(env(safe-area-inset-bottom) + 130px));width:calc(100vw - 32px);max-height:26vh;overflow:auto}.memoryMeaning dl{grid-template-columns:repeat(2,minmax(0,1fr))}.focusControls{left:16px;right:16px;top:auto;bottom:max(16px,env(safe-area-inset-bottom));justify-content:center}.focusControls button{flex:1;padding:0 10px}.focusHelp{right:16px;bottom:max(76px,calc(env(safe-area-inset-bottom) + 64px))}.focusStatus{top:auto;bottom:max(132px,calc(env(safe-area-inset-bottom) + 120px));white-space:nowrap}.artifactStage{top:42%;width:min(82vw,460px)}}@media(prefers-reduced-motion:reduce){.focusWorld *{animation:none!important;transition:none!important;scroll-behavior:auto!important}.focusBackdrop{transform:none}.focusNarration,.memoryMeaning,.focusControls,.focusHelp{backdrop-filter:none}}`
