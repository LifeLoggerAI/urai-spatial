'use client'

import { Html, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type RefObject } from 'react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { markFirstSpatialFrame, useAdaptiveSpatialQuality, type SpatialQualityProfile } from '@/spatial/performance/useAdaptiveSpatialQuality'
import { useSelectedMemory } from '@/spatial/memory/useSelectedMemory'
import type { SelectedMemory } from '@/spatial/memory/selectedMemoryContract'
import { requestUraiWorldReturn, requestUraiWorldTravel } from '@/spatial/world/worldEvents'

// Locked product authority; V334 is the current literal-pixel implementation:
// Life Map shows stellar memory points. Focus resolves the selected point into the
// same memory star at intimate scale, with authorized source media (or a truthful
// generated visualization when no media exists) visible inside/through the star.
// Focus is not Ground, terrain, a biome, a chamber, or a walkable landscape.

const DEFAULT_CAMERA: [number, number, number] = [0, 0.08, 4.8]
const STAR_POSITION: [number, number, number] = [0, 0, -1.7]
const STAR_TARGET = new THREE.Vector3(...STAR_POSITION)
const MIN_CAMERA_RADIUS = 2.75
const MAX_CAMERA_RADIUS = 8.2
const FOCUS_AUTHORED_MEMORY_STAR = '/urai/assets/focus/generated/focus-memory-star-v333.webp'

type ChamberState = 'neutral' | 'loading' | 'ready' | 'unavailable' | 'unauthorized' | 'corrupt' | 'deleted'
type WebGLState = 'ready' | 'lost' | 'restoring' | 'failed'

function makeFocusCoronaTexture(power: number, rays = false) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const dx = ((x + .5) / size - .5) * 2;
    const dy = ((y + .5) / size - .5) * 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const radial = Math.max(0, 1 - distance);
    const axial = rays
      ? Math.max(0, 1 - Math.min(Math.abs(dx), Math.abs(dy)) * 16) * Math.max(0, 1 - distance * .88)
      : 0;
    const diagonal = rays
      ? Math.max(0, 1 - Math.min(Math.abs(dx - dy), Math.abs(dx + dy)) * 12) * Math.max(0, 1 - distance * .92)
      : 0;
    const alpha = Math.min(1, Math.pow(radial, power) + axial * .18 + diagonal * .10);
    const offset = (y * size + x) * 4;
    data[offset] = 255;
    data[offset + 1] = 255;
    data[offset + 2] = 255;
    data[offset + 3] = Math.round(alpha * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function dateLabel(value: string) {
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
  } catch {
    return value
  }
}

function focusMemoryVisualKind(memory: SelectedMemory | null) {
  if (!memory) return 'none'
  if (memory.sourceMedia.some((item) => item.kind === 'image')) return 'source-image-still'
  if (memory.sourceMedia.some((item) => item.kind === 'video')) return 'source-video-still'
  return 'generated-memory-visualization'
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

function FocusRenderReady({ shellRef }: { shellRef: RefObject<HTMLElement | null> }) {
  const frames = useRef(0)
  useFrame(({ gl }) => {
    if (frames.current >= 2 || !gl.info.render.calls) return
    frames.current += 1
    if (frames.current === 2 && shellRef.current) shellRef.current.dataset.focusRenderReady = 'true'
  })
  useEffect(() => () => {
    if (shellRef.current) delete shellRef.current.dataset.focusRenderReady
  }, [shellRef])
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

function MemoryVisualContent({ memory, compact = false }: { memory: SelectedMemory | null; compact?: boolean }) {
  if (!memory) {
    return <span className={'focusMemoryVisual focusMemoryVisualNeutral' + (compact ? ' compact' : '')}>
      <span className="focusMemoryNeutralCore" aria-hidden="true" />
      <span className="focusMemoryTruthLabel">Awaiting a selected star</span>
    </span>
  }

  const media = memory.sourceMedia.find((item) => item.kind === 'image')
    ?? memory.sourceMedia.find((item) => item.kind === 'video')
  if (media?.kind === 'video') {
    return <span className={'focusMemoryVisual focusMemoryVisualSource' + (compact ? ' compact' : '')}>
      <video src={media.url} muted playsInline preload="metadata" data-focus-source-motion="still" aria-label={media.caption || 'Still frame from source video for ' + memory.title} />
      <span className="focusMemoryGlass" aria-hidden="true" />
      <span className="focusMemoryTruthLabel">Source moment</span>
    </span>
  }

  if (media?.kind === 'image') {
    const backgroundImage = 'linear-gradient(180deg,rgba(3,7,18,.02),rgba(3,7,18,.38)),url(' + JSON.stringify(media.url) + ')'
    return <span
      className={'focusMemoryVisual focusMemoryVisualSource focusMemoryVisualImage' + (compact ? ' compact' : '')}
      role="img"
      aria-label={media.caption || 'Source image for ' + memory.title}
      style={{ backgroundImage }}
    >
      <span className="focusMemoryGlass" aria-hidden="true" />
      <span className="focusMemoryTruthLabel">Source moment</span>
    </span>
  }

  return <span
    className={'focusMemoryVisual focusMemoryVisualGenerated' + (compact ? ' compact' : '')}
    role="img"
    aria-label={(memory.demo ? 'Generated demo visualization for ' : 'Generated memory visualization for ') + memory.title}
  >
    <span className="generatedMemoryGlow" aria-hidden="true" />
    <span className="generatedMemoryHorizon" aria-hidden="true" />
    <span className="generatedMemoryThread generatedMemoryThreadA" aria-hidden="true" />
    <span className="generatedMemoryThread generatedMemoryThreadB" aria-hidden="true" />
    <span className="generatedMemoryThread generatedMemoryThreadC" aria-hidden="true" />
    <span className="focusMemoryGlass" aria-hidden="true" />
    <span className="srOnly">{memory.demo ? 'Generated demo visualization' : 'Generated memory visualization'}</span>
  </span>
}

function FocusMemoryStar({
  memory,
  accent,
  light,
  reducedMotion,
  onActivate,
}: {
  memory: SelectedMemory | null
  accent: string
  light: string
  reducedMotion: boolean
  onActivate: () => void
}) {
  const group = useRef<THREE.Group | null>(null)
  const [hovered, setHovered] = useState(false)
  const activationProgress = useRef(0)
  const [activating, setActivating] = useState(false)
  useThree()
  const authoredMemoryStar = useTexture(FOCUS_AUTHORED_MEMORY_STAR)
  const authoredStarScale = size.width < 760 ? 1.78 : size.width < 1024 ? 2.24 : 2.65
  const authoredStarY = size.width < 760 ? -.28 : 0
  const starScale = memory ? THREE.MathUtils.clamp(memory.star.scale * 1.34, 1.18, 1.36) : 1.08
  const coronaTexture = useMemo(() => makeFocusCoronaTexture(2.25), [])
  const rayTexture = useMemo(() => makeFocusCoronaTexture(4.2, true), [])
  useEffect(() => () => {
    coronaTexture.dispose()
    rayTexture.dispose()
  }, [coronaTexture, rayTexture])

  useFrame((state, delta) => {
    if (!group.current) return
    if (activating) activationProgress.current = Math.min(1, activationProgress.current + delta / (reducedMotion ? 0.26 : 1.9))
    const expansion = activating ? THREE.MathUtils.lerp(1, reducedMotion ? 1.08 : 5.4, THREE.MathUtils.smootherstep(activationProgress.current, 0, 1)) : 1
    if (!reducedMotion) {
      group.current.rotation.y += Math.min(delta, 0.05) * 0.075
      const breathe = 1 + Math.sin(state.clock.elapsedTime * 0.72) * 0.010
      group.current.scale.setScalar(starScale * breathe * expansion)
    } else {
      group.current.scale.setScalar(starScale * expansion)
    }
  })

  const activateMoment = (event?: ThreeEvent<PointerEvent>) => {
    event?.stopPropagation()
    if (!memory || activating) return
    activationProgress.current = 0
    setActivating(true)
    onActivate()
  }

  const pointer = (event: ThreeEvent<PointerEvent>, state: boolean) => {
    event.stopPropagation()
    setHovered(state)
    document.body.style.cursor = state && memory ? 'pointer' : ''
  }

  return <group
    ref={group}
    position={STAR_POSITION}
    name="focus-selected-memory-star"
    userData={{
      visualAuthority: 'selected-memory-star-with-contained-memory-v334',
      lifeMapContinuity: 'same-selected-star-resolved-at-close-range',
      terrainOwner: false,
    }}
  >
    <>
    <sprite raycast={() => null} position={[-.12, .08, -.22]} scale={[3.05, 3.05, 1]} name="focus-memory-star-corona-glow">
      <spriteMaterial map={coronaTexture} color={accent} transparent opacity={memory ? .27 : .05} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <sprite raycast={() => null} position={[.10, -.05, -.08]} scale={[2.72, 2.72, 1]} rotation={.22} name="focus-memory-star-photosphere-rays">
      <spriteMaterial map={rayTexture} color={light} transparent opacity={memory ? .22 : .05} depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <mesh raycast={() => null} scale={0.72} name="focus-memory-star-outer-corona">
      <sphereGeometry args={[1, 64, 40]} />
      <meshBasicMaterial color={accent} transparent opacity={memory ? 0.004 : 0.002} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh raycast={() => null} scale={0.54} name="focus-memory-star-inner-corona">
      <sphereGeometry args={[1, 64, 40]} />
      <meshBasicMaterial color={light} transparent opacity={memory ? 0.006 : 0.003} depthWrite={false} blending={THREE.AdditiveBlending} />
    </mesh>
    <mesh raycast={() => null} scale={0.38} name="focus-memory-star-photosphere-core">
      <sphereGeometry args={[1, 64, 48]} />
      <meshStandardMaterial
        color={light}
        emissive={accent}
        emissiveIntensity={memory ? 1.85 : 0.20}
        roughness={0.66}
        metalness={0}
        transparent
        opacity={memory ? 0.62 : 0.18}
        depthWrite={false}
      />
    </mesh>
    </> : null}
    <mesh
      name="focus-memory-star-glass-shell"
      onClick={activateMoment}
      onPointerOver={(event) => pointer(event, true)}
      onPointerOut={(event) => pointer(event, false)}
    >
      <sphereGeometry args={[0.68, 64, 48]} />
      <meshPhysicalMaterial
        color={light}
        emissive={accent}
        emissiveIntensity={memory ? (hovered ? 0.58 : 0.38) : 0.24}
        transmission={0}
        thickness={0.08}
        roughness={0.22}
        metalness={0}
        transparent
        opacity={memory ? 0.035 : 0.09}
        clearcoat={0}
        clearcoatRoughness={0.44}
        depthWrite={false}
      />
    </mesh>
    <mesh raycast={() => null} scale={0.46} name="focus-memory-star-interior-depth">
      <sphereGeometry args={[1, 48, 36]} />
      <meshBasicMaterial color={accent} transparent opacity={memory ? 0.055 : 0.020} depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
    </mesh> : null}
    <pointLight color={accent} intensity={memory ? 1.35 : .9} distance={7.2} decay={2} />
    <pointLight position={[-1.1, 1.25, 1.7]} color={light} intensity={memory ? .82 : .35} distance={5.4} decay={2} />
    <Html center transform position={[0, 0, 0.31]} distanceFactor={6.1} zIndexRange={[20, 10]}>
      <button
        type="button"
        className="focusStarMemoryButton"
        disabled={!memory}
        onClick={() => activateMoment()}
        aria-label={memory ? 'Enter Replay for ' + memory.title : 'Select a memory in Life Map to enter Replay'}
      >
        <MemoryVisualContent memory={memory} />
      </button>
    </Html>
  </group>
}

function MemoryDust({ accent, reducedMotion }: { accent: string; reducedMotion: boolean }) {
  const points = useRef<THREE.Points | null>(null)
  const geometry = useMemo(() => {
    const positions: number[] = []
    for (let index = 0; index < 420; index += 1) {
      const seed = index * 12.9898
      const radius = 5.8 + ((Math.sin(seed) + 1) * 0.5) * 15
      const angle = index * 2.399963229728653
      const y = Math.sin(index * 1.713) * 5.8
      positions.push(Math.cos(angle) * radius, y, STAR_POSITION[2] + Math.sin(angle) * radius)
    }
    const result = new THREE.BufferGeometry()
    result.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    return result
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((_, delta) => {
    if (!points.current || reducedMotion) return
    points.current.rotation.y += Math.min(delta, 0.05) * 0.008
  })

  return <points ref={points} geometry={geometry} name="focus-deep-space-memory-dust">
    <pointsMaterial color={accent} size={0.024} transparent opacity={0.26} depthWrite={false} sizeAttenuation />
  </points>
}

function FocusCameraRig({
  controls,
  recenterSignal,
  shellRef,
}: {
  controls: RefObject<OrbitControlsImpl | null>
  recenterSignal: number
  shellRef: RefObject<HTMLElement | null>
}) {
  const { camera, invalidate } = useThree()
  const keys = useRef(new Set<string>())
  const defaultCamera = useMemo(() => new THREE.Vector3(...DEFAULT_CAMERA), [])
  const target = useMemo(() => STAR_TARGET.clone(), [])
  const offset = useRef(new THREE.Vector3())
  const radial = useRef(new THREE.Vector3())

  const setTelemetry = useCallback((moving: boolean) => {
    const shell = shellRef.current
    if (!shell) return
    shell.dataset.focusCameraX = camera.position.x.toFixed(3)
    shell.dataset.focusCameraY = camera.position.y.toFixed(3)
    shell.dataset.focusCameraZ = camera.position.z.toFixed(3)
    shell.dataset.focusDistance = camera.position.distanceTo(defaultCamera).toFixed(3)
    shell.dataset.focusMoving = moving ? 'true' : 'false'
  }, [camera, defaultCamera, shellRef])

  useEffect(() => {
    camera.position.set(...DEFAULT_CAMERA)
    controls.current?.target.copy(target)
    controls.current?.update()
    setTelemetry(false)
  }, [camera, controls, recenterSignal, setTelemetry, target])

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.matches('input,textarea,select,[contenteditable="true"]')) return
      if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
        keys.current.add(event.code)
        invalidate()
        event.preventDefault()
      }
    }
    const up = (event: KeyboardEvent) => {
      keys.current.delete(event.code)
      invalidate()
    }
    const clear = () => {
      keys.current.clear()
      invalidate()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      clear()
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [invalidate])

  useFrame((_, delta) => {
    const moving = keys.current.size > 0
    if (moving) {
      const step = 2.0 * Math.min(delta, 0.12)
      if (keys.current.has('KeyW') || keys.current.has('ArrowUp') || keys.current.has('KeyS') || keys.current.has('ArrowDown')) {
        radial.current.copy(target).sub(camera.position).normalize()
        const direction = keys.current.has('KeyW') || keys.current.has('ArrowUp') ? 1 : -1
        camera.position.addScaledVector(radial.current, step * direction)
      }
      if (keys.current.has('KeyA') || keys.current.has('ArrowLeft') || keys.current.has('KeyD') || keys.current.has('ArrowRight')) {
        offset.current.copy(camera.position).sub(target)
        const direction = keys.current.has('KeyA') || keys.current.has('ArrowLeft') ? 1 : -1
        offset.current.applyAxisAngle(camera.up, direction * 0.58 * Math.min(delta, 0.12))
        camera.position.copy(target).add(offset.current)
      }
      offset.current.copy(camera.position).sub(target)
      const radius = THREE.MathUtils.clamp(offset.current.length(), MIN_CAMERA_RADIUS, MAX_CAMERA_RADIUS)
      if (offset.current.lengthSq() > 0.0001) camera.position.copy(target).add(offset.current.normalize().multiplyScalar(radius))
      controls.current?.target.copy(target)
      controls.current?.update()
      camera.lookAt(target)
    }
    setTelemetry(moving)
  })

  return null
}

function FocusScene({
  memory,
  profile,
  recenterSignal,
  onActivate,
  controls,
  onWebGLState,
  shellRef,
}: {
  memory: SelectedMemory | null
  profile: SpatialQualityProfile
  recenterSignal: number
  onActivate: () => void
  controls: RefObject<OrbitControlsImpl | null>
  onWebGLState: (state: WebGLState) => void
  shellRef: RefObject<HTMLElement | null>
}) {
  const accent = memory?.star.aura ?? memory?.visuals.accent ?? '#79dfff'
  const light = memory?.visuals.light ?? '#e7fbff'
  return <>
    <FirstFrame profile={profile} />
    <FocusRenderReady shellRef={shellRef} />
    <WebGLRecoveryBridge onStateChange={onWebGLState} />
    <color attach="background" args={['#02040b']} />
    <fog attach="fog" args={['#02040b', 18, 55]} />
    <ambientLight intensity={0.08} color="#9ab6d8" />
    <Stars radius={55} depth={26} count={profile.reducedMotion ? 520 : 1100} factor={2.4} saturation={0.18} fade speed={profile.reducedMotion ? 0 : 0.18} />
    <MemoryDust accent={accent} reducedMotion={profile.reducedMotion} />
    <pointLight position={[0, 3.2, 3.8]} intensity={0.42} color={light} distance={12} decay={2} />
    <FocusMemoryStar memory={memory} accent={accent} light={light} reducedMotion={profile.reducedMotion} onActivate={onActivate} />
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping={!profile.reducedMotion}
      dampingFactor={0.06}
      enablePan={false}
      enableZoom
      minDistance={MIN_CAMERA_RADIUS}
      maxDistance={MAX_CAMERA_RADIUS}
      zoomSpeed={0.55}
      rotateSpeed={0.28}
      minPolarAngle={0.62}
      maxPolarAngle={2.42}
      target={STAR_POSITION}
    />
    <FocusCameraRig controls={controls} recenterSignal={recenterSignal} shellRef={shellRef} />
  </>
}

function isSoftwareWebGLRenderer(gl: THREE.WebGLRenderer) {
  const context = gl.getContext()
  const debugInfo = context.getExtension('WEBGL_debug_renderer_info') as { UNMASKED_RENDERER_WEBGL?: number } | null
  const renderer = debugInfo?.UNMASKED_RENDERER_WEBGL ? context.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : context.getParameter(context.RENDERER)
  return /swiftshader|llvmpipe|lavapipe|software/i.test(String(renderer || ''))
}

function FocusRenderCadence({ bounded, documentVisible }: { bounded: boolean; documentVisible: boolean }) {
  const { invalidate, setFrameloop } = useThree()
  useEffect(() => {
    if (!documentVisible) {
      setFrameloop('never')
      return
    }
    if (!bounded) {
      setFrameloop('always')
      return
    }
    setFrameloop('demand')
    let disposed = false
    const bootstrap = [0, 40, 80, 120, 180, 260].map((delay) => window.setTimeout(() => {
      if (!disposed) invalidate()
    }, delay))
    let cadenceTimer = 0
    const renderNext = () => {
      if (disposed) return
      invalidate()
      cadenceTimer = window.setTimeout(renderNext, 250)
    }
    cadenceTimer = window.setTimeout(renderNext, 250)
    return () => {
      disposed = true
      bootstrap.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(cadenceTimer)
    }
  }, [bounded, documentVisible, invalidate, setFrameloop])
  return null
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
  const [rendererClassified, setRendererClassified] = useState(false)
  const [softwareRenderer, setSoftwareRenderer] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setDirectEntry(!params.get('memoryId') && !params.get('node'))
    return () => { document.body.style.cursor = '' }
  }, [])

  const replayHref = useMemo(() => {
    if (!memory) return null
    const next = new URLSearchParams({
      memoryId: memory.id,
      manifestId: memory.replayManifest.id,
      node: memory.star.id,
      from: 'focus-artifact',
    })
    if (memory.demo) next.set('demo', '1')
    return '/replay?' + next.toString()
  }, [memory])

  const enterReplay = useCallback(() => {
    if (!memory || !replayHref || committed) return
    setCommitted(true)
    requestUraiWorldTravel({
      destination: 'replay',
      href: replayHref,
      entryPortal: 'focus-memory-aperture',
      cameraCheckpoint: 'focus:' + memory.star.id,
      context: {
        memoryId: memory.id,
        replayManifestId: memory.replayManifest.id,
        privacyMode: memory.privacy === 'private' ? 'held-private' : 'private',
      },
    })
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
  const heading = memory?.title ?? (directEntry ? 'Focus Observatory' : 'Selected memory unavailable')
  const description = memory?.narrator.focus ?? (directEntry ? 'Choose a star in Life Map to reveal the memory living inside it.' : result.message)
  const memoryVisual = focusMemoryVisualKind(memory)
  const accent = memory?.star.aura ?? memory?.visuals.accent ?? '#79dfff'
  const style = {
    '--memory-accent': accent,
    '--memory-light': memory?.visuals.light ?? '#e7fbff',
    '--memory-sky': memory?.visuals.sky ?? '#020712',
  } as CSSProperties
  const webglUsable = webglAvailable === true && webglState !== 'failed'
  const boundedCadence = !rendererClassified || softwareRenderer || profile.reducedMotion

  return <main
    ref={shellRef}
    className="focusWorld"
    style={style}
    data-testid="urai-final-focus-chamber"
    data-focus-composition="selected-memory-star-with-contained-memory"
    data-focus-visual-revision="v336-contained-memory-stellar-photosphere"
    data-focus-selected-framing={memory ? 'selected-memory-star-approach' : 'neutral-star-awaiting-selection'}
    data-focus-spatial="selected-memory-star"
    data-focus-movement="orbit-zoom-keyboard-touch"
    data-focus-pointer-lock="false"
    data-focus-terrain-owner="false"
    data-focus-memory-visual={memoryVisual}
    data-focus-life-map-star-morphology="stellar-point-photosphere-layered-corona"
    data-focus-closeup-morphology="resolved-dimensional-memory-star"
    data-focus-replay-transition="moment-expands-into-replay"
    data-focus-camera-x="0.000"
    data-focus-camera-y="0.080"
    data-focus-camera-z="4.800"
    data-focus-distance="0.000"
    data-focus-moving="false"
    data-memory-status={result.status}
    data-chamber-state={chamberState}
    data-webgl-state={webglState}
    data-spatial-quality={profile.tier}
    data-software-renderer={!rendererClassified ? 'detecting' : softwareRenderer ? 'true' : 'false'}
    data-render-cadence={boundedCadence ? 'bounded-demand-4fps' : 'continuous'}
    data-memory-id={memory?.id}
    data-manifest-id={memory?.replayManifest.id}
    data-star-id={memory?.star.id}
    data-node={memory?.star.id}
  >
    <h1 className="srOnly">URAI Focus selected memory star</h1>
    <div className="focusBackdrop" aria-hidden="true" />
    <div className="focusCanvas" aria-label="Selected Memory Star. Drag to orbit, scroll or pinch to move closer or farther, and use W S or arrow keys for depth and A D for orbit.">
      {webglAvailable === null
        ? <div className="focusFallback" role="status">Preparing Focus…</div>
        : webglUsable
          ? <Canvas
              camera={{ position: DEFAULT_CAMERA, fov: 44, near: 0.08, far: 120 }}
              dpr={[1, profile.pixelRatioMax]}
              frameloop={profile.documentVisible ? 'demand' : 'never'}
              gl={{ antialias: profile.antialias, alpha: false, powerPreference: 'high-performance' }}
              onCreated={({ gl }) => {
                gl.outputColorSpace = THREE.SRGBColorSpace
                gl.toneMapping = THREE.ACESFilmicToneMapping
                gl.toneMappingExposure = 0.92
                setSoftwareRenderer(isSoftwareWebGLRenderer(gl))
                setRendererClassified(true)
              }}
            >
              <FocusRenderCadence bounded={boundedCadence} documentVisible={profile.documentVisible} />
              <FocusScene
                memory={memory}
                profile={profile}
                recenterSignal={recenterSignal}
                onActivate={enterReplay}
                controls={controls}
                onWebGLState={setWebglState}
                shellRef={shellRef}
              />
            </Canvas>
          : <div className="focusFallback focusFallbackStarField" role="status" data-focus-fallback="semantic">
              <div className="focusFallbackStar" data-focus-fallback-star="true">
                <MemoryVisualContent memory={memory} compact />
              </div>
              <strong>Spatial view unavailable</strong>
              <span>{memory ? 'Held in context. Your memory remains private.' : 'No personal memory is displayed in this neutral observatory.'}</span>
            </div>}
    </div>

    <header className="focusHeading">
      <p>{memory ? (memory.demo ? 'DEMO FIXTURE · NOT PERSONAL DATA' : memory.privacy + ' memory') : 'URAI · FOCUS'}</p>
      <h2>{heading}</h2>
      {memory ? <span>{dateLabel(memory.occurredAt)}</span> : null}
      <div className="focusNarration">
        <small>{memory ? 'Selected memory star' : 'Focus Observatory'}</small>
        <strong>{description}</strong>
      </div>
    </header>

    <aside className="memoryMeaning" aria-label="Selected memory context">
      <p>{memory ? 'Held in context. Your selected memory remains private.' : result.status === 'loading' ? 'Opening the selected memory safely.' : 'No personal memory is displayed in this neutral observatory.'}</p>
      {memory
        ? <div className="memoryMeta">
            <span><b>Emotion</b>{memory.emotionalState}</span>
            <span><b>Place</b>{memory.place?.label ?? 'Not recorded'}</span>
            <span><b>Privacy</b>{memory.privacy}</span>
          </div>
        : <div className="neutralActions">
            <button type="button" onClick={unwind}>Open Life Map</button>
            <span>{result.status === 'loading' ? 'Loading' : result.message}</span>
          </div>}
    </aside>

    <nav className="focusControls" aria-label="Focus controls">
      <button type="button" onClick={() => setRecenterSignal((value) => value + 1)}>Recenter</button>
      {memory ? <button type="button" className="primary" disabled={committed} onClick={enterReplay} aria-label={'Enter Replay for ' + memory.title}>{committed ? 'Opening…' : 'Enter Replay'}</button> : null}
      <button className="unwind" type="button" onClick={unwind}>← Life Map</button>
    </nav>

    <details className="focusHelp">
      <summary>Explore</summary>
      <p>Drag around the selected Memory Star. Scroll, pinch, or use W and S to move closer or farther; A and D orbit. Select the moment itself to expand it into Replay. Escape returns to Life Map.</p>
    </details>

    {webglState !== 'ready' && webglState !== 'failed' ? <section className="webglRecovery" role="status" aria-live="assertive">
      <strong>{webglState === 'lost' ? 'Visual field paused safely' : 'Restoring visual field'}</strong>
      <span>Your selected memory and privacy state remain preserved.</span>
      <button type="button" onClick={() => setRecenterSignal((value) => value + 1)}>Recenter when restored</button>
    </section> : null}

    <div className="focusStatus" role={result.status === 'loading' ? 'status' : 'note'} aria-live="polite">
      {memory ? 'Focus ready' : result.status === 'loading' ? 'Opening selected memory' : directEntry ? 'Neutral observatory' : result.message}
    </div>
    <style>{focusCss + '.webglRecovery{pointer-events:none}.webglRecovery button{pointer-events:auto}'}</style>
  </main>
}

const focusCss = ".focusWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:#02040b;isolation:isolate;font-family:Inter,system-ui,sans-serif}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.focusBackdrop{position:absolute;inset:-12%;z-index:0;pointer-events:none;background:radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--memory-accent) 14%,transparent),transparent 24%),radial-gradient(circle at 50% 55%,rgba(70,95,170,.08),transparent 48%),linear-gradient(180deg,#01030a 0%,#030714 56%,#010208 100%)}.focusCanvas{position:absolute;inset:0;z-index:1}.focusCanvas canvas{touch-action:none}.focusHeading{position:absolute;z-index:8;left:max(22px,env(safe-area-inset-left));top:max(24px,env(safe-area-inset-top));width:min(370px,34vw);pointer-events:none;text-shadow:0 8px 34px #000}.focusHeading>p{margin:0;color:var(--memory-light);font-size:9px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.focusHeading h2{max-width:14ch;margin:9px 0 6px;font:500 clamp(1.9rem,3.7vw,4rem)/.94 Georgia,serif;letter-spacing:-.045em;text-wrap:balance}.focusHeading>span{font-size:10px;color:rgba(255,255,255,.62)}.focusNarration{max-width:340px;margin-top:13px;padding:10px 12px;border-left:1px solid color-mix(in srgb,var(--memory-light) 42%,transparent);background:linear-gradient(90deg,rgba(2,7,18,.55),rgba(2,7,18,0));backdrop-filter:blur(10px)}.focusNarration small{display:block;margin-bottom:4px;color:var(--memory-light);font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.focusNarration strong{display:block;font:500 clamp(.86rem,1.3vw,1.08rem)/1.35 Georgia,serif;color:rgba(247,250,255,.9)}.focusStarMemoryButton{display:block;width:56px;height:56px;padding:0;border:0;border-radius:999px;overflow:hidden;background:transparent;color:#fff;cursor:pointer;box-shadow:0 0 18px rgba(255,255,255,.20),0 0 46px color-mix(in srgb,var(--memory-light) 32%,transparent),0 0 108px color-mix(in srgb,var(--memory-accent) 30%,transparent);-webkit-mask-image:radial-gradient(circle at 48% 46%,#000 0 34%,rgba(0,0,0,.82) 48%,rgba(0,0,0,.18) 67%,transparent 88%);mask-image:radial-gradient(circle at 48% 46%,#000 0 34%,rgba(0,0,0,.82) 48%,rgba(0,0,0,.18) 67%,transparent 88%)}.focusStarMemoryButton:disabled{cursor:default}.focusMemoryVisual{position:relative;display:block;width:100%;height:100%;overflow:hidden;border-radius:inherit;background:#050a16;opacity:.72;filter:saturate(.78) contrast(.92) brightness(.82);mix-blend-mode:screen}.focusMemoryVisualSource video{width:100%;height:100%;object-fit:cover}.focusMemoryVisualImage{background-size:cover;background-position:center}.focusMemoryVisualGenerated{background:radial-gradient(circle at 58% 31%,rgba(255,240,195,.98) 0 2.2%,rgba(255,181,115,.42) 3.5%,transparent 17%),linear-gradient(180deg,#08111f 0%,#172538 30%,#6c5755 47%,#c07b5d 55%,#40505b 56%,#172432 72%,#07111c 100%)}.generatedMemoryGlow{position:absolute;left:2%;right:2%;top:34%;height:34%;background:radial-gradient(ellipse at 58% 10%,rgba(255,190,128,.34),transparent 42%),linear-gradient(180deg,rgba(242,174,128,.16),rgba(80,111,128,.09) 46%,rgba(5,16,27,.16));filter:blur(5px);opacity:.92}.generatedMemoryHorizon{position:absolute;left:-12%;right:-12%;top:55%;height:48%;background:linear-gradient(180deg,rgba(116,133,139,.32) 0%,rgba(37,60,73,.88) 11%,rgba(12,29,42,.98) 44%,rgba(3,12,22,1) 100%);clip-path:polygon(0 20%,10% 14%,20% 18%,31% 8%,41% 17%,51% 11%,62% 18%,73% 9%,85% 17%,100% 12%,100% 100%,0 100%);box-shadow:inset 0 5px 18px rgba(225,178,137,.12)}.generatedMemoryThread{position:absolute;left:-8%;width:116%;transform-origin:center;pointer-events:none}.generatedMemoryThreadA{top:48%;height:19%;background:linear-gradient(180deg,rgba(29,43,55,.08),rgba(9,20,31,.72));clip-path:polygon(0 78%,13% 42%,25% 64%,39% 22%,52% 65%,66% 35%,80% 62%,92% 30%,100% 57%,100% 100%,0 100%);filter:blur(.35px)}.generatedMemoryThreadB{top:57%;height:25%;background:linear-gradient(180deg,rgba(19,38,49,.36),rgba(3,13,24,.92));clip-path:polygon(0 73%,12% 54%,24% 61%,36% 38%,48% 70%,61% 50%,73% 67%,86% 45%,100% 58%,100% 100%,0 100%);opacity:.90}.generatedMemoryThreadC{top:63%;height:24%;background:linear-gradient(180deg,rgba(142,151,143,.12),rgba(10,25,36,.72));clip-path:polygon(0 58%,16% 47%,30% 61%,44% 41%,57% 56%,70% 39%,84% 53%,100% 44%,100% 100%,0 100%);opacity:.62;filter:blur(1.4px)}.focusMemoryGlass{position:absolute;inset:0;opacity:.34;border-radius:inherit;background:radial-gradient(circle at 31% 23%,rgba(255,255,255,.14),transparent 15%),radial-gradient(circle at 50% 55%,transparent 54%,rgba(91,157,255,.05) 80%,rgba(255,255,255,.06) 100%);box-shadow:inset 0 0 22px rgba(255,255,255,.08);pointer-events:none}.focusMemoryTruthLabel{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:68%;max-width:68%;box-sizing:border-box;padding:3px 5px;border-radius:999px;background:rgba(2,7,18,.42);color:rgba(240,248,255,.78);font-size:7px;font-weight:850;line-height:1.2;letter-spacing:.07em;text-align:center;text-transform:uppercase;white-space:normal;backdrop-filter:blur(6px)}.focusMemoryVisualNeutral{display:grid;place-items:center;background:radial-gradient(circle at 50% 48%,rgba(103,232,249,.11),transparent 28%),#020712}.focusMemoryNeutralCore{width:22px;height:22px;border-radius:999px;background:#effcff;box-shadow:0 0 18px rgba(190,242,255,.9),0 0 48px rgba(103,232,249,.46)}.focusFallback{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 45%,rgba(76,202,255,.12),transparent 30%),linear-gradient(180deg,#02040b,#040917);color:#fff}.focusFallbackStarField{gap:14px}.focusFallbackStar{width:min(48vw,360px);aspect-ratio:1;border-radius:999px;padding:16px;background:radial-gradient(circle,rgba(103,232,249,.14),rgba(139,92,246,.07) 50%,transparent 72%);box-shadow:0 0 80px color-mix(in srgb,var(--memory-accent) 24%,transparent)}.focusFallbackStar .focusMemoryVisual{box-shadow:inset 0 0 42px rgba(255,255,255,.14),0 0 30px color-mix(in srgb,var(--memory-accent) 42%,transparent)}.focusFallback span:not(.focusMemoryVisual):not(.focusMemoryGlass):not(.generatedMemoryGlow):not(.generatedMemoryHorizon):not(.generatedMemoryThread):not(.focusMemoryTruthLabel){max-width:520px;color:rgba(235,247,255,.72)}.memoryMeaning{position:absolute;z-index:8;left:max(22px,env(safe-area-inset-left));bottom:max(22px,calc(env(safe-area-inset-bottom) + 8px));width:min(390px,36vw);padding:10px 12px;border:1px solid rgba(205,235,255,.14);border-radius:16px;background:rgba(2,7,18,.52);backdrop-filter:blur(16px)}.memoryMeaning p{margin:0 0 8px;font-size:10px;color:rgba(240,248,255,.75)}.memoryMeta{display:flex;flex-wrap:wrap;gap:7px}.memoryMeta span{display:grid;gap:2px;padding:5px 8px;border-radius:10px;background:rgba(255,255,255,.04);font-size:10px;color:rgba(240,248,255,.82)}.memoryMeta b{font-size:7px;letter-spacing:.12em;text-transform:uppercase;color:var(--memory-light)}.neutralActions{display:flex;align-items:center;gap:10px}.neutralActions button,.focusControls button,.webglRecovery button{min-height:48px;padding:0 15px;border-radius:999px;border:1px solid rgba(220,248,255,.2);background:rgba(6,15,30,.72);color:#fff;font-weight:850}.neutralActions span{font-size:9px;color:rgba(235,247,255,.65)}.focusControls{position:absolute;z-index:10;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:flex;gap:7px;padding:6px;border:1px solid rgba(215,246,255,.14);border-radius:999px;background:rgba(2,7,18,.54);backdrop-filter:blur(14px)}.focusControls .primary{background:linear-gradient(135deg,var(--memory-light),var(--memory-accent));color:#031019}.focusControls button:focus-visible,.neutralActions button:focus-visible,.focusHelp summary:focus-visible,.focusStarMemoryButton:focus-visible,.webglRecovery button:focus-visible{outline:3px solid var(--memory-light);outline-offset:3px}.focusHelp{position:absolute;z-index:9;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:min(360px,calc(100vw - 40px));border:1px solid rgba(215,246,255,.14);border-radius:16px;background:rgba(2,7,18,.56);backdrop-filter:blur(14px)}.focusHelp summary{min-height:48px;display:flex;align-items:center;padding:0 15px;font-weight:850;cursor:pointer;font-size:11px}.focusHelp p{margin:0;padding:0 15px 14px;color:rgba(235,247,255,.74);font-size:11px;line-height:1.5}.focusStatus{position:absolute;z-index:9;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);padding:6px 10px;border-radius:999px;background:rgba(2,7,18,.45);font-size:8px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.webglRecovery{position:absolute;z-index:15;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:rgba(1,5,12,.88)}@media(max-width:760px){.focusHeading{left:14px;top:14px;width:calc(100vw - 28px);max-width:270px}.focusHeading h2{font-size:clamp(1.7rem,8.4vw,2.8rem);max-width:10ch}.focusNarration{margin-top:8px;max-width:250px;padding:8px 10px}.focusNarration strong{font-size:.86rem}.focusControls{right:10px;top:auto;bottom:max(12px,env(safe-area-inset-bottom));max-width:calc(100vw - 20px);overflow-x:auto}.focusControls button{min-height:48px;padding:0 12px;font-size:10px}.memoryMeaning{left:12px;bottom:max(70px,calc(env(safe-area-inset-bottom) + 62px));width:min(300px,calc(100vw - 24px));padding:8px 10px}.memoryMeaning p{display:none}.memoryMeta{gap:5px}.memoryMeta span{font-size:9px;padding:4px 6px}.focusHelp{display:none}.focusStatus{top:10px;font-size:7px}.focusStarMemoryButton{width:76px;height:76px}.focusFallbackStar{width:min(72vw,290px)}}@media(max-height:460px){.focusHeading{top:10px;max-width:250px}.focusHeading h2{font-size:1.45rem;margin:5px 0}.focusNarration{display:none}.memoryMeaning{display:none}.focusControls{top:10px;bottom:auto}.focusStarMemoryButton{width:70px;height:70px}}@media(prefers-reduced-motion:reduce){.focusBackdrop{background:radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--memory-accent) 9%,transparent),transparent 25%),#02040b}}@media(forced-colors:active){.focusControls,.memoryMeaning,.focusHelp{background:Canvas;border-color:CanvasText}.focusControls button,.neutralActions button,.focusHelp summary{forced-color-adjust:auto}.focusStarMemoryButton{border:2px solid CanvasText;box-shadow:none}}"
