'use client'

import { useUraiLocale } from '@/lib/i18n/useUraiLocale'
import JourneyOfflineNotice from '@/lib/i18n/JourneyOfflineNotice'

import StellarPhotosphere, { FOCUS_STAR_POSITION, FOCUS_STAR_RADIUS } from '@/spatial/stellar/StellarPhotosphere'
import FocusAtmosphere from '@/spatial/stellar/FocusAtmosphere'
import type { StellarMemoryState } from '@/spatial/stellar/stellarMemoryReveal'
import { getFocusFrame, rebaseFocusEntryFrame } from './focusComposition'

import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { assetCssStack, focusAssets, replayAssets } from '@/spatial/assets/uraiAssets'
import { markFirstSpatialFrame, useAdaptiveSpatialQuality, type SpatialQualityProfile } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'
import { focusMemoryAppearance } from './focusMemoryAppearance'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import MemoryMediaAttachment from '@/spatial/memory/MemoryMediaAttachment'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

const focusAccessibilityCss = `
.focusControls button:focus-visible,.focusHelp summary:focus-visible,.neutralActions button:focus-visible,.webglRecovery button:focus-visible,.focus-spatial-aperture-button:focus-visible{outline:3px solid #e7fbff;outline-offset:3px}
.focusHeading,.focusNarration,.memoryMeaning{overflow-wrap:anywhere}
.focusControls button{min-width:0;white-space:normal;line-height:1.2}
.focusStatus{max-width:calc(100vw - 32px);text-align:center;white-space:normal}
@media(max-width:380px),(max-height:500px){.focusHeading{max-height:40svh;overflow-y:auto}.focusNarration{font-size:14px}.focusHelp[open]{max-height:40svh;max-width:calc(100vw - 32px);overflow:auto}.memoryMeaning{max-height:22svh;overflow:auto}}
@media(max-height:500px) and (min-width:501px){.focusWorld .focusHeading{left:max(16px,env(safe-area-inset-left));top:max(16px,env(safe-area-inset-top));width:calc(50vw - 40px - env(safe-area-inset-left));max-height:calc(50svh - 32px);overflow:auto;pointer-events:auto;overscroll-behavior:contain}.focusHeading h2{font-size:1.65rem;line-height:1.05}.focusNarration{margin-top:10px;padding:8px 10px}.focusNarration strong{font-size:1rem}.memoryMeaning{left:max(16px,env(safe-area-inset-left));top:50svh;bottom:auto;width:calc(50vw - 40px - env(safe-area-inset-left));max-height:calc(50svh - 100px);box-sizing:border-box;overflow:auto;overscroll-behavior:contain}.focusControls{left:auto;right:max(16px,env(safe-area-inset-right));top:max(16px,env(safe-area-inset-top));bottom:auto;width:calc(50vw - 40px - env(safe-area-inset-right));box-sizing:border-box;justify-content:center}.focusControls button{flex:1;padding:0 8px}.focusHelp{right:max(16px,env(safe-area-inset-right));bottom:max(16px,env(safe-area-inset-bottom));max-width:calc(50vw - 40px - env(safe-area-inset-right))}.focusStatus{width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}}
@media(forced-colors:active){.focusControls button,.focusHelp,.neutralActions button,.webglRecovery button,.focus-spatial-aperture-button{background:Canvas;color:CanvasText;border:2px solid CanvasText}.focusControls button:focus-visible,.focusHelp summary:focus-visible,.neutralActions button:focus-visible,.webglRecovery button:focus-visible,.focus-spatial-aperture-button:focus-visible{outline:3px solid Highlight;outline-offset:3px}}
`

const INITIAL_FRAME = getFocusFrame(16 / 9)
const DEFAULT_CAMERA = INITIAL_FRAME.position
const DEFAULT_TARGET = INITIAL_FRAME.target
const CAMERA_LIMIT = 8.8

type ChamberState = 'neutral' | 'loading' | 'ready' | 'unavailable' | 'unauthorized' | 'corrupt' | 'deleted'
type WebGLState = 'ready' | 'lost' | 'restoring' | 'failed'
type EntryCameraFrame = { position: [number, number, number]; target: [number, number, number]; fov: number }

function parseEntryVector(value: string | null): [number, number, number] | null {
  if (!value) return null
  const numbers = value.split(',').map(Number)
  if (numbers.length !== 3 || numbers.some((number) => !Number.isFinite(number))) return null
  return [numbers[0], numbers[1], numbers[2]]
}

function parseEntryCameraFrame(params: URLSearchParams): EntryCameraFrame | null {
  if (!params.get('cameraCheckpoint')?.startsWith('life-map-arrival:')) return null
  const position = parseEntryVector(params.get('entryCamera'))
  const target = parseEntryVector(params.get('entryTarget'))
  const fov = Number(params.get('entryFov'))
  if (!position || !target || !Number.isFinite(fov)) return null
  return rebaseFocusEntryFrame({ position, target, fov })
}

function dateLabel(value: string, locale: Pick<ReturnType<typeof useUraiLocale>, 'date'>) {
  try {
    return locale.date(value, { dateStyle: 'medium', timeStyle: 'short' })
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

function isSoftwareWebGLRenderer(renderer: THREE.WebGLRenderer) {
  const context = renderer.getContext()
  const debug = context.getExtension('WEBGL_debug_renderer_info')
  const name = context.getParameter(debug?.UNMASKED_RENDERER_WEBGL ?? context.RENDERER)
  return /swiftshader|llvmpipe|lavapipe|software/i.test(String(name ?? ''))
}

function FirstFrame({ profile, onReady }: { profile: SpatialQualityProfile; onReady: () => void }) {
  const marked = useRef(false)
  const renderedFrames = useRef(0)
  useFrame(({ gl }) => {
    if (marked.current || !profile.documentVisible) return
    renderedFrames.current += 1
    if (renderedFrames.current < 2) return
    gl.domElement.dataset.focusFirstFrame = 'true'
    marked.current = true
    markFirstSpatialFrame('/focus', profile.tier)
    onReady()
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

function FocusCameraRig({ controls, recenterSignal, shellRef, entryFrame, reducedMotion, onInputReadyChange }: { controls: RefObject<OrbitControlsImpl | null>; recenterSignal: number; shellRef: RefObject<HTMLElement | null>; entryFrame: EntryCameraFrame | null; reducedMotion: boolean; onInputReadyChange: (ready: boolean) => void }) {
  const { camera, size } = useThree()
  const frame = useMemo(() => getFocusFrame(size.width / size.height), [size.width, size.height])
  const keys = useRef(new Set<string>())
  const target = useMemo(() => new THREE.Vector3(...DEFAULT_TARGET), [])
  const defaultTarget = useMemo(() => new THREE.Vector3(...frame.target), [frame])
  const defaultCamera = useMemo(() => new THREE.Vector3(...frame.position), [frame])
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const movement = useRef(new THREE.Vector3())
  const entryBlendActive = useRef(false)
  const entryFrameUsed = useRef(false)

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.defaultPrevented || (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,summary,[role="button"],[role="dialog"],[role="menu"],[contenteditable="true"]'))) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        keys.current.add(event.code)
        event.preventDefault()
      }
    }
    const up = (event: KeyboardEvent) => keys.current.delete(event.code)
    const clearKeys = () => keys.current.clear()
    const focusChanged = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.closest('button,a,input,textarea,select,summary,[role="button"],[role="dialog"],[role="menu"],[contenteditable="true"]')) clearKeys()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clearKeys)
    window.addEventListener('focusin', focusChanged)
    const shell = shellRef.current
    if (shell) shell.dataset.focusInputReady = 'true'
    onInputReadyChange(true)
    return () => {
      clearKeys()
      if (shell) shell.dataset.focusInputReady = 'false'
      onInputReadyChange(false)
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clearKeys)
      window.removeEventListener('focusin', focusChanged)
    }
  }, [onInputReadyChange, shellRef])

  useLayoutEffect(() => {
    const orbit = controls.current
    const damping = orbit?.enableDamping
    // Flush a released drag before restoring the view. Otherwise OrbitControls
    // applies its remaining momentum after Recenter and moves the camera again.
    if (orbit) {
      orbit.enableDamping = false
      orbit.update()
    }
    const useEntryFrame = recenterSignal === 0 && entryFrame && !reducedMotion && !entryFrameUsed.current
    if (useEntryFrame) {
      camera.position.set(...entryFrame.position)
      controls.current?.target.set(...entryFrame.target)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = entryFrame.fov
        camera.updateProjectionMatrix()
      }
      entryBlendActive.current = true
    } else {
      keys.current.clear()
      camera.position.copy(defaultCamera)
      controls.current?.target.copy(defaultTarget)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = frame.fov
        camera.updateProjectionMatrix()
      }
      entryBlendActive.current = false
    }
    controls.current?.update()
    if (orbit && damping !== undefined) orbit.enableDamping = damping
  }, [camera, controls, defaultCamera, defaultTarget, entryFrame, frame.fov, recenterSignal, reducedMotion])

  useFrame((_, delta) => {
    if (entryBlendActive.current) entryFrameUsed.current = true
    const moving = keys.current.size > 0
    if (!moving && entryBlendActive.current) {
      camera.position.x = THREE.MathUtils.damp(camera.position.x, defaultCamera.x, 2.4, delta)
      camera.position.y = THREE.MathUtils.damp(camera.position.y, defaultCamera.y, 2.4, delta)
      camera.position.z = THREE.MathUtils.damp(camera.position.z, defaultCamera.z, 2.4, delta)
      target.copy(controls.current?.target ?? defaultTarget)
      target.x = THREE.MathUtils.damp(target.x, defaultTarget.x, 2.8, delta)
      target.y = THREE.MathUtils.damp(target.y, defaultTarget.y, 2.8, delta)
      target.z = THREE.MathUtils.damp(target.z, defaultTarget.z, 2.8, delta)
      controls.current?.target.copy(target)
      if (camera instanceof THREE.PerspectiveCamera) {
        camera.fov = THREE.MathUtils.damp(camera.fov, frame.fov, 2.6, delta)
        camera.updateProjectionMatrix()
      }
      controls.current?.update()
      if (camera.position.distanceTo(defaultCamera) < 0.035 && target.distanceTo(defaultTarget) < 0.035) entryBlendActive.current = false
    }
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

function MemoryStarInteraction({ memory, accent, light, reducedMotion, onActivate }: { memory: SelectedMemory | null; accent: string; light: string; reducedMotion: boolean; onActivate: () => void }) {
  const group = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }, delta) => {
    if (!group.current) return
    const breathing = reducedMotion ? 1 : 1 + Math.sin(clock.elapsedTime * 0.72) * 0.018
    const wanted = hovered ? 1.045 : breathing
    const nextScale = THREE.MathUtils.lerp(group.current.scale.x, wanted, 1 - Math.exp(-5.5 * delta))
    group.current.scale.setScalar(nextScale)
  })

  const pointer = (event: ThreeEvent<PointerEvent>, state: boolean) => {
    event.stopPropagation()
    setHovered(state)
    document.body.style.cursor = state && memory ? 'pointer' : ''
  }

  return (
    <group ref={group} position={FOCUS_STAR_POSITION} name="focus-memory-star-interaction">
      <mesh
        onClick={(event) => { event.stopPropagation(); if (memory) onActivate() }}
        onPointerOver={(event) => pointer(event, true)}
        onPointerOut={(event) => pointer(event, false)}
      >
        <sphereGeometry args={[FOCUS_STAR_RADIUS + 0.01, 56, 40]} />
        <meshBasicMaterial color={light} transparent opacity={0} depthWrite={false} colorWrite={false} />
      </mesh>

    </group>
  )
}

function FocusScene({ memory, profile, recenterSignal, onActivate, controls, onWebGLState, shellRef, entryFrame, readinessKey, onFirstFrame, onInputReadyChange, onMemoryState }: { memory: SelectedMemory | null; profile: SpatialQualityProfile; recenterSignal: number; onActivate: () => void; controls: RefObject<OrbitControlsImpl | null>; onWebGLState: (state: WebGLState) => void; shellRef: RefObject<HTMLElement | null>; entryFrame: EntryCameraFrame | null; readinessKey: string; onFirstFrame: () => void; onInputReadyChange: (ready: boolean) => void; onMemoryState: (state: StellarMemoryState) => void }) {
  const { accent, light, imageUrl: memoryImageUrl } = focusMemoryAppearance(memory, replayAssets.primary.src)
  return <>
    <FirstFrame key={readinessKey} profile={profile} onReady={onFirstFrame} />
    <WebGLRecoveryBridge onStateChange={onWebGLState} />
    <FocusAtmosphere profile={profile} sky={memory?.visuals.sky ?? '#020712'} accent={accent} light={light} />
    <StellarPhotosphere accent={accent} light={light} reducedMotion={profile.reducedMotion} memoryImageUrl={memoryImageUrl} quality={profile.tier} onMemoryState={onMemoryState} />
    <MemoryStarInteraction memory={memory} accent={accent} light={light} reducedMotion={profile.reducedMotion} onActivate={onActivate} />
    <OrbitControls ref={controls} makeDefault enableDamping={!profile.reducedMotion} dampingFactor={0.07} enablePan={false} enableZoom minDistance={3.4} maxDistance={11.5} zoomSpeed={0.55} rotateSpeed={0.32} minPolarAngle={0.58} maxPolarAngle={1.9} target={DEFAULT_TARGET} />
    <FocusCameraRig controls={controls} recenterSignal={recenterSignal} shellRef={shellRef} entryFrame={entryFrame} reducedMotion={profile.reducedMotion} onInputReadyChange={onInputReadyChange} />
  </>
}

export default function FocusChamberClient() {
  const locale = useUraiLocale()
  const result = useSelectedMemory()
  const memory = result.memory
  const adaptiveProfile = useAdaptiveSpatialQuality()
  const [softwareRenderer, setSoftwareRenderer] = useState(false)
  const profile: SpatialQualityProfile = useMemo(() => softwareRenderer ? {
    ...adaptiveProfile,
    tier: 'low',
    pixelRatioMax: 1,
    particleCount: 120,
    shadows: false,
    antialias: false,
    postprocessing: false,
    preloadSecondaryWorlds: false,
  } : adaptiveProfile, [adaptiveProfile, softwareRenderer])
  const webglAvailable = useWebGLAvailable()
  const controls = useRef<OrbitControlsImpl | null>(null)
  const shellRef = useRef<HTMLElement | null>(null)
  const [recenterSignal, setRecenterSignal] = useState(0)
  const [committed, setCommitted] = useState(false)
  const [directEntry, setDirectEntry] = useState<boolean | null>(null)
  const [entryFrame, setEntryFrame] = useState<EntryCameraFrame | null>(null)
  const [webglState, setWebglState] = useState<WebGLState>('ready')
  const [renderedSceneKey, setRenderedSceneKey] = useState<string | null>(null)
  const [inputReady, setInputReady] = useState(false)
  const [renderEpoch, setRenderEpoch] = useState(0)
  const [memoryReveal, setMemoryReveal] = useState<{ key: string; state: StellarMemoryState } | null>(null)
  const onWebGLState = useCallback((state: WebGLState) => {
    setRenderedSceneKey(null)
    setRenderEpoch(value => value + 1)
    setWebglState(state)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setDirectEntry(!params.get('memoryId') && !params.get('node'))
    setEntryFrame(parseEntryCameraFrame(params))
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
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('[role="dialog"][aria-modal="true"]') || (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"],[role="menu"]'))) return
      event.preventDefault()
      unwind()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [unwind])

  const chamberState: ChamberState = memory ? 'ready' : result.status === 'loading' ? 'loading' : result.status
  const headingId = directEntry ? 'focus.heading' : 'focus.resting'
  const heading = memory?.title ?? locale.text(headingId)
  const description = memory?.narrator.focus ?? (directEntry ? locale.text('focus.chooseMemory') : result.message)
  const appearance = focusMemoryAppearance(memory, replayAssets.primary.src)
  const style = { '--memory-accent': appearance.accent, '--memory-light': appearance.light, '--memory-sky': memory?.visuals.sky ?? '#020712', '--memory-ground': memory?.visuals.ground ?? '#07121c', '--focus-asset': assetCssStack(focusAssets.primary) } as CSSProperties
  const webglUsable = webglAvailable === true && webglState !== 'failed'
  const readinessKey = JSON.stringify([memory?.ownerId, memory?.id, memory?.replayManifest.id, appearance.imageUrl, webglState, renderEpoch])
  const onFirstFrame = useCallback(() => setRenderedSceneKey(readinessKey), [readinessKey])
  const onMemoryState = useCallback((state: StellarMemoryState) => setMemoryReveal({ key: readinessKey, state }), [readinessKey])
  const memoryRevealState = appearance.imageUrl ? memoryReveal?.key === readinessKey ? memoryReveal.state : 'loading' : 'absent'
  const fieldReady = webglUsable && webglState === 'ready' && inputReady && renderedSceneKey === readinessKey
  const semanticFallback = webglAvailable === false || webglState === 'failed'
  const preparingField = Boolean(memory) && !semanticFallback && (!fieldReady || memoryRevealState === 'loading')
  const fieldStatusId = semanticFallback || memoryRevealState === 'unavailable' ? 'common.spatialAccessible' : webglState === 'lost' ? 'focus.paused' : webglState === 'restoring' ? 'focus.restoring' : fieldReady ? memoryRevealState === 'loading' ? 'focus.openingSelected' : 'focus.ready' : 'focus.opening'

  return <main ref={shellRef} className="focusWorld" style={style} data-testid="urai-final-focus-chamber" data-focus-composition="stellar-photosphere-corona-with-living-memory-vfx" data-focus-spatial="inside-memory-star" data-focus-movement="walk-keyboard-orbit-touch" data-focus-input-ready="false" data-focus-memory-reveal-state={semanticFallback ? 'absent' : memoryRevealState} data-focus-render-ready={fieldReady ? 'true' : 'false'} data-focus-pointer-lock="false" data-focus-entry-continuity={entryFrame ? 'life-map-arrival' : 'default'} data-focus-camera-x={DEFAULT_CAMERA[0].toFixed(3)} data-focus-camera-y={DEFAULT_CAMERA[1].toFixed(3)} data-focus-camera-z={DEFAULT_CAMERA[2].toFixed(3)} data-focus-distance="0.000" data-focus-moving="false" data-memory-status={result.status} data-chamber-state={chamberState} data-webgl-state={webglState} data-canonical-asset={focusAssets.primary.src} data-focus-renderer-mode={softwareRenderer ? 'software' : 'hardware-or-unknown'} data-spatial-quality={profile.tier} data-memory-id={memory?.id} data-manifest-id={memory?.replayManifest.id} data-star-id={memory?.star.id} data-node={memory?.star.id}>
    <h1 className="srOnly" {...locale.props('focus.title')}>{locale.text('focus.title')}</h1>
    <div className="focusBackdrop" aria-hidden="true" />
    {!webglUsable ? <div className="focusFog" aria-hidden="true" /> : null}
    <div className="focusCanvas" aria-label={locale.text('focus.canvasLabel')} {...locale.props('focus.canvasLabel')}>
      {webglAvailable === null ? <div className="focusFallback" role="status" {...locale.props('focus.preparing')}>{locale.text('focus.preparing')}</div> : webglUsable ? <Suspense fallback={<div className="focusFallback" role="status" {...locale.props('focus.opening')}>{locale.text('focus.opening')}</div>}><Canvas camera={{ position: DEFAULT_CAMERA, fov: INITIAL_FRAME.fov, near: 0.08, far: 120 }} dpr={[1, profile.pixelRatioMax]} shadows={profile.shadows} frameloop={profile.documentVisible ? 'always' : 'never'} gl={{ antialias: profile.antialias, alpha: false, powerPreference: 'high-performance' }} onCreated={({ gl }) => setSoftwareRenderer(isSoftwareWebGLRenderer(gl))}><FocusScene memory={memory} profile={profile} recenterSignal={recenterSignal} onActivate={enterReplay} controls={controls} onWebGLState={onWebGLState} shellRef={shellRef} entryFrame={entryFrame} readinessKey={readinessKey} onFirstFrame={onFirstFrame} onInputReadyChange={setInputReady} onMemoryState={onMemoryState} /></Canvas></Suspense> : <div className="focusFallback" role="status" data-focus-fallback="semantic"><strong {...locale.props('common.spatialUnavailable')}>{locale.text('common.spatialUnavailable')}</strong><span {...locale.props('common.spatialAccessible')}>{locale.text('common.spatialAccessible')}</span></div>}
    </div>
    <header className="focusHeading"><p>{memory ? (memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : `${memory.privacy} memory`) : 'URAI · FOCUS MEMORY STAR'}</p><h2 {...(!memory ? locale.props(headingId) : {dir:'auto' as const})} style={{overflowWrap:'anywhere'}}>{heading}</h2>{memory ? <span {...(Number.isFinite(new Date(memory.occurredAt).getTime()) ? locale.formatProps : {dir:'auto'})}>{dateLabel(memory.occurredAt, locale)}</span> : null}<details className="focusNarration"><summary {...locale.props(memory ? 'focus.selectedMemory' : 'focus.threshold')}>{locale.text(memory ? 'focus.selectedMemory' : 'focus.threshold')}</summary><strong {...(!memory && directEntry ? locale.props('focus.chooseMemory') : {dir:'auto' as const})} style={{overflowWrap:'anywhere'}}>{description}</strong></details></header>
    {!webglUsable && <section className="artifactStage" aria-label={memory ? `Selected memory ${memory.title}` : 'Neutral stellar Focus field'} data-focus-visual-owner="stellar-photosphere-corona" aria-hidden="true">
      <div className="focusPhotosphereVisual" />
    </section>}
    <aside className="memoryMeaning" aria-labelledby="focus-memory-context-label"><span id="focus-memory-context-label" className="sr-only" {...locale.props('focus.selectedContext')}>{locale.text('focus.selectedContext')}</span><p {...locale.props(memory ? 'focus.heldContext' : result.status === 'loading' ? 'focus.openingSafely' : 'focus.emptyContext')}>{memory ? locale.text('focus.heldContext') : result.status === 'loading' ? locale.text('focus.openingSafely') : locale.locale === 'en' ? 'No personal memory is displayed in this neutral stellar field.' : locale.text('focus.emptyContext')}</p>{memory ? <dl><div><dt {...locale.props('focus.emotion')}>{locale.text('focus.emotion')}</dt><dd dir="auto">{memory.emotionalState}</dd></div><div><dt {...locale.props('focus.place')}>{locale.text('focus.place')}</dt><dd {...(memory.place?.label ? {dir:'auto' as const} : locale.props('common.notRecorded'))}>{memory.place?.label ?? locale.text('common.notRecorded')}</dd></div><div><dt {...locale.props('focus.people')}>{locale.text('focus.people')}</dt><dd {...(memory.people.length ? {dir:'auto' as const} : locale.props('common.notRecorded'))}>{memory.people.map((person) => person.relationship ? `${person.label} · ${person.relationship}` : person.label).join(', ') || locale.text('common.notRecorded')}</dd></div><div><dt {...locale.props('focus.privacy')}>{locale.text('focus.privacy')}</dt><dd dir="auto">{memory.privacy}</dd></div></dl> : <div className="neutralActions"><button type="button" onClick={unwind} {...locale.props('focus.openLifeMap')}>{locale.text('focus.openLifeMap')}</button><span {...(result.status === 'loading' ? locale.props('focus.loading') : {})}>{result.status === 'loading' ? locale.text('focus.loading') : result.message}</span></div>}{memory && !memory.demo && memory.privacy === 'private' && memory.authorization === 'owner' ? <MemoryMediaAttachment key={`${memory.ownerId}:${memory.id}`} memory={memory} /> : null}{memory && !semanticFallback && memoryRevealState === 'unavailable' ? <p role="status" {...locale.props('common.spatialAccessible')}>{locale.text('common.spatialAccessible')}</p> : null}<JourneyOfflineNotice /></aside>
    <div className="focusControlDock">
    <nav className="focusControls" aria-label={locale.text('focus.controls')} {...locale.props('focus.controls')}>
      {memory ? <button type="button" className="primary" disabled={committed} onClick={enterReplay} {...locale.props(memory ? 'focus.openReplayFor' : 'focus.chooseReplay')} aria-label={memory ? locale.text('focus.openReplayFor', {title:memory.title}) : locale.text('focus.chooseReplay')}><span {...locale.props(committed ? 'common.loading' : 'focus.enterReplay')}>{committed ? locale.text('common.loading') : locale.text('focus.enterReplay')}</span></button> : null}
      <button type="button" onClick={() => setRecenterSignal((value) => value + 1)} {...locale.props('focus.recenter')}>{locale.text('focus.recenter')}</button>
      <button className="unwind" type="button" onClick={unwind} {...locale.props('nav.lifeMap')}>← {locale.text('nav.lifeMap')}</button>
    </nav>
    <div className="focusUtilities">
      <AdamLauncherSlot name="focus-memory-controls" as="div" />
      <details className="focusHelp"><summary {...locale.props('focus.explore')}>{locale.text('focus.explore')}</summary><p {...locale.props('focus.instructions')}>{locale.text('focus.instructions')}</p></details>
    </div>
    </div>
    {webglState !== 'ready' && webglState !== 'failed' ? <section className="webglRecovery" role="status" aria-live="assertive"><strong {...locale.props(webglState === 'lost' ? 'focus.paused' : 'focus.restoring')}>{locale.text(webglState === 'lost' ? 'focus.paused' : 'focus.restoring')}</strong><span {...locale.props('focus.preserved')}>{locale.text('focus.preserved')}</span><button type="button" onClick={() => setRecenterSignal((value) => value + 1)} {...locale.props('focus.recenterRestored')}>{locale.text('focus.recenterRestored')}</button></section> : null}
    <div className="focusStatus" role={result.status === 'loading' || preparingField ? 'status' : 'note'} aria-live="polite">{memory ? <span {...locale.props(fieldStatusId)}>{locale.text(fieldStatusId)}</span> : result.status === 'loading' ? <span {...locale.props('focus.openingSelected')}>{locale.text('focus.openingSelected')}</span> : directEntry ? <span {...locale.props('focus.neutral')}>{locale.text('focus.neutral')}</span> : result.message}</div>
    <style>{focusCss + focusAccessibilityCss}</style>
  </main>
}


const focusCss = `.focusWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:var(--memory-ground);isolation:isolate;font-family:Inter,system-ui,sans-serif}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.focusBackdrop{position:absolute;inset:0;z-index:-4;background:radial-gradient(circle at 50% 44%,color-mix(in srgb,var(--memory-accent) 9%,transparent) 0 7%,transparent 34%),radial-gradient(circle at 50% 50%,rgba(8,27,43,.34),rgba(1,4,10,.96) 72%);opacity:1}.focusFog{position:absolute;inset:0;z-index:2;pointer-events:none;background:radial-gradient(circle at 50% 45%,color-mix(in srgb,var(--memory-accent) 10%,transparent),transparent 28%),linear-gradient(180deg,rgba(1,4,10,.04),rgba(1,4,10,.25) 72%);mix-blend-mode:screen}.focusCanvas{position:absolute;inset:0;z-index:1}.focusCanvas canvas{touch-action:none}.focusFallback{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:8px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 42%,rgba(76,202,255,.14),transparent 32%),linear-gradient(180deg,#020712,#06101d);color:#fff}.focusFallback span{max-width:520px;color:rgba(235,247,255,.72)}.focusHeading{position:absolute;z-index:6;left:max(22px,env(safe-area-inset-left));top:max(24px,env(safe-area-inset-top));width:min(470px,42vw);pointer-events:none;text-shadow:0 8px 34px #000}.focusHeading>p{margin:0;color:var(--memory-light);font-size:10px;font-weight:900;letter-spacing:.24em;text-transform:uppercase}.focusHeading h2{max-width:11ch;margin:12px 0 8px;font:500 clamp(2.8rem,5.8vw,6.8rem)/.88 Georgia,serif;letter-spacing:-.06em;text-wrap:balance}.focusHeading>span{font-size:11px;color:rgba(255,255,255,.7)}.focusNarration{max-width:430px;margin-top:22px;padding:14px 16px;border-left:1px solid color-mix(in srgb,var(--memory-light) 58%,transparent);background:linear-gradient(90deg,rgba(2,7,12,.72),rgba(2,7,12,.06));backdrop-filter:blur(14px)}.focusNarration small{display:block;margin-bottom:6px;color:var(--memory-light);font-size:9px;font-weight:900;letter-spacing:.18em;text-transform:uppercase}.focusNarration strong{display:block;font:500 clamp(1rem,1.8vw,1.45rem)/1.3 Georgia,serif}.artifactStage{position:absolute;z-index:0;left:50%;top:46%;width:min(43vw,560px);aspect-ratio:1;transform:translate(-50%,-50%);pointer-events:none}.focusPhotosphereVisual{position:absolute;left:50%;top:50%;width:56%;aspect-ratio:1;transform:translate(-50%,-50%) rotate(-7deg) scaleY(.94);border-radius:52% 48% 46% 54%/44% 55% 45% 56%;background:radial-gradient(ellipse at 30% 28%,rgba(255,255,224,.9) 0 3%,transparent 14%),radial-gradient(ellipse at 69% 61%,rgba(255,244,170,.74) 0 7%,transparent 20%),radial-gradient(ellipse at 46% 74%,rgba(143,37,7,.72) 0 6%,transparent 19%),radial-gradient(ellipse at 49% 47%,#fff6bf 0 12%,#ffd261 34%,#ed861f 61%,#802607 100%);box-shadow:0 0 12px rgba(255,238,158,.72),0 0 38px rgba(255,178,56,.52),0 0 96px rgba(255,128,28,.32),0 0 166px color-mix(in srgb,var(--memory-accent) 22%,transparent);filter:saturate(1.12) contrast(1.05);mix-blend-mode:screen;opacity:.58}.focusPhotosphereVisual::before,.focusPhotosphereVisual::after{content:"";position:absolute;inset:-31%;border-radius:48% 52% 57% 43%/55% 43% 57% 45%;background:radial-gradient(ellipse at 50% 4%,rgba(255,224,128,.6) 0 4%,transparent 22%),radial-gradient(ellipse at 88% 41%,rgba(255,173,52,.48) 0 3%,transparent 19%),radial-gradient(ellipse at 18% 72%,rgba(255,126,24,.4) 0 4%,transparent 21%),radial-gradient(ellipse at 58% 94%,rgba(255,222,132,.48) 0 3%,transparent 20%);filter:blur(7px);opacity:.72}.focusPhotosphereVisual::after{inset:-8%;border-radius:57% 43% 48% 52%/46% 57% 43% 54%;background:radial-gradient(ellipse at 26% 63%,rgba(94,20,4,.68) 0 7%,transparent 20%),radial-gradient(ellipse at 63% 29%,rgba(255,250,195,.5) 0 4%,transparent 15%),radial-gradient(ellipse at 72% 75%,rgba(168,49,7,.52) 0 5%,transparent 19%);filter:blur(1px);mix-blend-mode:multiply;opacity:.55}.apertureOrbit{position:absolute;inset:3%;border:1px solid color-mix(in srgb,var(--memory-light) 14%,transparent);border-radius:50%;opacity:.12}.apertureOrbitInner{inset:22%;transform:rotate(22deg) scaleY(.72);border-color:color-mix(in srgb,var(--memory-accent) 20%,transparent)}.memoryMeaning{position:absolute;z-index:7;left:max(22px,env(safe-area-inset-left));bottom:max(22px,calc(env(safe-area-inset-bottom) + 8px));width:min(500px,40vw);padding:13px 15px;border:1px solid color-mix(in srgb,var(--memory-light) 18%,transparent);border-radius:18px;background:linear-gradient(135deg,rgba(2,7,12,.82),rgba(2,7,12,.38));backdrop-filter:blur(18px)}.memoryMeaning p{margin:0 0 10px;font-size:11px;font-weight:800}.memoryMeaning dl{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0}.memoryMeaning dt{font-size:8px;text-transform:uppercase;letter-spacing:.15em;color:var(--memory-light)}.memoryMeaning dd{margin:3px 0 0;font-size:10px;line-height:1.35;color:rgba(255,255,255,.72)}.neutralActions{display:flex;align-items:center;gap:10px}.neutralActions button,.focusControls button,.webglRecovery button{min-height:48px;padding:0 17px;border-radius:999px;border:1px solid rgba(220,248,255,.24);background:rgba(6,20,31,.84);color:#fff;font-weight:850}.neutralActions span{font-size:10px;color:rgba(235,247,255,.68)}.focusControls{position:absolute;z-index:9;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:flex;gap:8px;padding:7px;border:1px solid rgba(215,246,255,.17);border-radius:999px;background:rgba(2,7,12,.68);backdrop-filter:blur(16px)}.focusControls .primary{background:linear-gradient(135deg,var(--memory-light),var(--memory-accent));color:#031019}.focusControls button:focus-visible,.neutralActions button:focus-visible,.focusHelp summary:focus-visible,.focus-spatial-aperture-button:focus-visible,.webglRecovery button:focus-visible{outline:3px solid var(--memory-light);outline-offset:3px}.focusHelp{position:absolute;z-index:9;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:min(380px,calc(100vw - 40px));border:1px solid rgba(215,246,255,.17);border-radius:18px;background:rgba(2,7,12,.72);backdrop-filter:blur(16px)}.focusHelp summary{min-height:48px;display:flex;align-items:center;padding:0 17px;font-weight:850;cursor:pointer}.focusHelp p{margin:0;padding:0 17px 16px;color:rgba(235,247,255,.78);font-size:12px;line-height:1.55}.focusStatus{position:absolute;z-index:8;left:50%;top:max(18px,env(safe-area-inset-top));transform:translateX(-50%);padding:8px 12px;border-radius:999px;background:rgba(2,7,12,.62);font-size:10px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.webglRecovery{position:absolute;z-index:15;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:rgba(1,5,12,.88)}.focus-spatial-aperture-button{min-width:170px;min-height:48px;border:1px solid rgba(220,248,255,.3);border-radius:999px;background:rgba(4,15,24,.86);color:#fff;font-weight:900;cursor:pointer}.focus-spatial-aperture-button:disabled{opacity:.55;cursor:not-allowed}@media(max-width:760px){.focusHeading{left:16px;top:16px;width:calc(100vw - 32px)}.focusHeading h2{font-size:clamp(2.25rem,12vw,4rem);max-width:9ch}.focusNarration{margin-top:12px;max-width:min(82vw,380px)}.memoryMeaning{left:16px;bottom:max(142px,calc(env(safe-area-inset-bottom) + 130px));width:calc(100vw - 32px);max-height:26vh;overflow:auto}.memoryMeaning dl{grid-template-columns:repeat(2,minmax(0,1fr))}.focusControls{left:16px;right:16px;top:auto;bottom:max(16px,env(safe-area-inset-bottom));justify-content:center}.focusControls button{flex:1;padding:0 10px}.focusHelp{right:16px;bottom:max(76px,calc(env(safe-area-inset-bottom) + 64px))}.focusStatus{width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);clip-path:inset(50%);white-space:nowrap;border:0}.artifactStage{top:42%;width:min(82vw,460px)}}@media(prefers-reduced-motion:reduce){.focusWorld *{animation:none!important;transition:none!important;scroll-behavior:auto!important}.focusBackdrop{transform:none}.focusPhotosphereVisual{filter:saturate(1.05) contrast(1.03);transform:translate(-50%,-50%) rotate(-7deg) scaleY(.94)}.focusNarration,.memoryMeaning,.focusControls,.focusHelp{backdrop-filter:none}}`
