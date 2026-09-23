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

// Locked product authority; V360 is the current literal-pixel implementation:
// Life Map shows stellar memory points. Focus resolves the selected point into the
// same memory star at intimate scale, with authorized source media (or a truthful
// generated visualization when no media exists) visible inside/through the star.
// Focus is not Ground, terrain, a biome, a chamber, or a walkable landscape.

const DEFAULT_CAMERA: [number, number, number] = [0, 0.08, 4.8]
const STAR_POSITION: [number, number, number] = [0, 0, -1.05]
const STAR_TARGET = new THREE.Vector3(...STAR_POSITION)
const MIN_CAMERA_RADIUS = 2.75
const MAX_CAMERA_RADIUS = 8.2

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
    const angle = Math.atan2(dy, dx);
    const warpedAngle = angle + Math.sin(angle * 3.0 + .37) * .16 + Math.sin(angle * 7.0 - .61) * .055;
    const broadPlume = rays
      ? Math.pow(Math.max(0, .60 * Math.cos(warpedAngle * 5 + .2) + .27 * Math.cos(warpedAngle * 11 - .8) + .13 * Math.cos(warpedAngle * 19 + .35)), 3)
      : 0;
    const finePlume = rays
      ? Math.pow(Math.max(0, .56 * Math.cos(warpedAngle * 9 - .45) + .31 * Math.cos(warpedAngle * 17 + .73) + .13 * Math.cos(warpedAngle * 29 - .2)), 6) * .68
      : 0;
    const rayBoundary = rays
      ? THREE.MathUtils.clamp(.56
        + Math.sin(warpedAngle * 3.0 + .4) * .12
        + Math.sin(warpedAngle * 7.0 - .7) * .08
        + broadPlume * .32
        + finePlume * .22, .40, .995)
      : 1;
    const outerCorona = rays
      ? (1 - THREE.MathUtils.smoothstep(distance, Math.max(.16, rayBoundary - .38), rayBoundary))
        * THREE.MathUtils.smoothstep(distance, .28, .50)
      : 0;
    const alpha = distance >= 1
      ? 0
      : rays
        ? Math.min(1, outerCorona * (.34 + broadPlume * 2.20 + finePlume * 1.60))
        : Math.min(1, Math.pow(radial, power));
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

function makeFocusPhotosphereTexture() {
  const size = 256;
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
    const dx = ((x + .5) / size - .5) * 2;
    const dy = ((y + .5) / size - .5) * 2;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const boundary = .965
      + Math.sin(angle * 7 + .52) * .026
      + Math.sin(angle * 13 - .81) * .016
      + Math.sin(angle * 23 + .34) * .009;
    const offset = (y * size + x) * 4;
    if (distance >= boundary) {
      data[offset + 3] = 0;
      continue;
    }
    const normalizedDistance = distance / boundary;
    const limb = Math.sqrt(Math.max(0, 1 - normalizedDistance * normalizedDistance));
    const granulation = .46
      + Math.sin(x * .47 + Math.sin(y * .19) * 2.2) * .19
      + Math.sin(y * .61 + Math.cos(x * .23) * 1.7) * .15
      + Math.sin((x + y) * .17) * .10
      + Math.sin((x * .071) - (y * .093)) * .07;
    const activeRegion = Math.max(0, Math.sin(x * .11 - y * .07) + Math.sin(x * .031 + y * .13)) * .075;
    const brightness = THREE.MathUtils.clamp(.16 + limb * .50 + granulation * .32 + activeRegion, 0, 1);
    const edgeFade = THREE.MathUtils.clamp((boundary - distance) / .042, 0, 1);
    data[offset] = 255;
    data[offset + 1] = Math.round(102 + brightness * 136);
    data[offset + 2] = Math.round(18 + brightness * 92);
    data[offset + 3] = Math.round(edgeFade * (.88 + limb * .12) * 255);
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeFocusSphereTexture() {
  const width = 256;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const u = (x + .5) / width;
    const v = (y + .5) / height;
    const latitude = (v - .5) * Math.PI;
    const longitude = (u - .5) * Math.PI * 2;
    const cellular = .5
      + Math.sin(longitude * 19 + Math.sin(latitude * 11) * 2.4) * .16
      + Math.sin(latitude * 27 + Math.cos(longitude * 13) * 1.8) * .14
      + Math.sin((longitude + latitude) * 41) * .08
      + Math.sin(longitude * 67 - latitude * 31) * .055;
    const active = Math.max(0,
      Math.sin(longitude * 5.2 - latitude * 3.7)
      + Math.sin(longitude * 8.7 + latitude * 6.1) - .55) * .17;
    const banding = Math.sin(latitude * 9 + Math.sin(longitude * 4) * .8) * .055;
    const darkFilament = Math.abs(
      Math.sin(longitude * 31 + latitude * 17)
      * Math.cos(longitude * 13 - latitude * 29)
    ) * .18;
    const brightness = THREE.MathUtils.clamp(.16 + cellular * .66 + active + banding - darkFilament, 0, 1);
    const offset = (y * width + x) * 4;
    data[offset] = Math.round(232 + brightness * 23);
    data[offset + 1] = Math.round(34 + brightness * 176);
    data[offset + 2] = Math.round(3 + brightness * 66);
    data[offset + 3] = 255;
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function makeFocusPhotosphereGeometry() {
  const geometry = new THREE.SphereGeometry(1, 128, 96)
  const position = geometry.getAttribute('position') as THREE.BufferAttribute
  const vertex = new THREE.Vector3()
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index).normalize()
    const warp = 1
      + Math.sin(vertex.x * 17 + vertex.y * 11 + vertex.z * 7) * .010
      + Math.sin(vertex.x * 31 - vertex.y * 13 + vertex.z * 19) * .006
      + Math.sin((vertex.x + vertex.y - vertex.z) * 43) * .003
    vertex.multiplyScalar(warp)
    position.setXYZ(index, vertex.x, vertex.y, vertex.z)
  }
  position.needsUpdate = true
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
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
  const starScale = memory ? THREE.MathUtils.clamp(memory.star.scale * 1.35, 1.26, 1.42) : 1.08
  const coronaTexture = useMemo(() => makeFocusCoronaTexture(2.25), [])
  const rayTexture = useMemo(() => makeFocusCoronaTexture(4.2, true), [])
  const photosphereTexture = useMemo(() => makeFocusPhotosphereTexture(), [])
  const sphereTexture = useMemo(() => makeFocusSphereTexture(), [])
  const photosphereGeometry = useMemo(() => makeFocusPhotosphereGeometry(), [])
  useEffect(() => () => {
    coronaTexture.dispose()
    rayTexture.dispose()
    photosphereTexture.dispose()
    sphereTexture.dispose()
    photosphereGeometry.dispose()
  }, [coronaTexture, photosphereGeometry, photosphereTexture, rayTexture, sphereTexture])

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
      visualAuthority: 'selected-memory-star-resolving-through-memory-v360',
      lifeMapContinuity: 'same-selected-star-resolved-at-close-range',
      terrainOwner: false,
    }}
  >
    <>
    <sprite raycast={() => null} position={[-.05, .03, -.08]} scale={[3.34, 3.18, 1]} rotation={-.11} name="focus-memory-star-corona-glow">
      <spriteMaterial map={coronaTexture} color="#ffbd63" transparent opacity={memory ? .58 : .04} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <sprite raycast={() => null} position={[.04, -.03, .11]} scale={[3.78, 3.42, 1]} rotation={.19} name="focus-memory-star-photosphere-rays">
      <spriteMaterial map={rayTexture} color="#ffe09a" transparent opacity={memory ? .30 : .03} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <sprite raycast={() => null} position={[-.04, .04, .10]} scale={[3.28, 3.82, 1]} rotation={-.43} name="focus-memory-star-photosphere-rays-secondary">
      <spriteMaterial map={rayTexture} color="#fff7dc" transparent opacity={memory ? .18 : .02} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <sprite raycast={() => null} position={[0, 0, .12]} scale={[2.24, 2.10, 1]} rotation={.09} name="focus-memory-star-photosphere-surface">
      <spriteMaterial map={photosphereTexture} color="#ffe7aa" transparent opacity={memory ? .98 : .14} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <sprite raycast={() => null} position={[0, 0, .16]} scale={[2.92, 2.76, 1]} rotation={-.07} name="focus-memory-star-white-hot-limb">
      <spriteMaterial map={photosphereTexture} color="#fffbe8" transparent opacity={memory ? .82 : .08} depthWrite={false} depthTest={false} blending={THREE.AdditiveBlending} toneMapped={false} />
    </sprite>
    <group raycast={() => null} name="focus-memory-star-explicit-corona-rays" position={[0, 0, -0.04]} />
    <mesh raycast={() => null} geometry={photosphereGeometry} scale={0.34} name="focus-memory-star-photosphere-core" rotation={[0.08, -0.18, 0]}>
      <meshBasicMaterial
        map={sphereTexture}
        color="#fff3b8"
        transparent
        opacity={memory ? 0 : 0.16}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </mesh>
    </>
    <mesh
      name="focus-memory-star-glass-shell"
      onClick={activateMoment}
      onPointerOver={(event) => pointer(event, true)}
      onPointerOut={(event) => pointer(event, false)}
    >
      <sphereGeometry args={[0.86, 64, 48]} />
      <meshPhysicalMaterial
        color={light}
        emissive={accent}
        emissiveIntensity={memory ? (hovered ? 0.58 : 0.38) : 0.24}
        transmission={0}
        thickness={0.08}
        roughness={0.22}
        metalness={0}
        transparent
        opacity={memory ? 0 : 0.09}
        clearcoat={0}
        clearcoatRoughness={0.44}
        depthWrite={false}
      />
    </mesh>
    <mesh raycast={() => null} scale={0.64} name="focus-memory-star-interior-depth">
      <sphereGeometry args={[1, 48, 36]} />
      <meshBasicMaterial color={accent} transparent opacity={memory ? 0 : 0.012} depthWrite={false} side={THREE.BackSide} blending={THREE.AdditiveBlending} />
    </mesh>
    <pointLight color="#ffb45f" intensity={memory ? 6.4 : 1.1} distance={8.4} decay={2} />
    <pointLight position={[-1.1, 1.25, 1.7]} color="#fff0c8" intensity={memory ? 1.55 : .42} distance={6.2} decay={2} />
    <Html center transform position={[0.02, -0.01, 0.42]} distanceFactor={1.62} zIndexRange={[20, 10]}>
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
    data-focus-visual-revision="v360-stellar-photosphere-memory-aperture"
    data-focus-selected-framing={memory ? 'selected-memory-star-approach' : 'neutral-star-awaiting-selection'}
    data-focus-spatial="selected-memory-star"
    data-focus-movement="orbit-zoom-keyboard-touch"
    data-focus-pointer-lock="false"
    data-focus-terrain-owner="false"
    data-focus-memory-visual={memoryVisual}
    data-focus-life-map-star-morphology="stellar-point-photosphere-layered-corona"
    data-focus-stellar-treatment="selected-sphere-hidden-stellar-photosphere-owned-v360"
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

const focusCss = ".focusWorld{position:fixed;inset:0;overflow:hidden;color:#fff;background:#02040b;isolation:isolate;font-family:Inter,system-ui,sans-serif}.srOnly{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}.focusBackdrop{position:absolute;inset:-12%;z-index:0;pointer-events:none;background:radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--memory-accent) 14%,transparent),transparent 24%),radial-gradient(circle at 50% 55%,rgba(70,95,170,.08),transparent 48%),linear-gradient(180deg,#01030a 0%,#030714 56%,#010208 100%)}.focusCanvas{position:absolute;inset:0;z-index:1}.focusCanvas canvas{touch-action:none}.focusHeading{position:absolute;z-index:8;left:max(22px,env(safe-area-inset-left));top:max(24px,env(safe-area-inset-top));width:min(370px,34vw);pointer-events:none;text-shadow:0 8px 34px #000}.focusHeading>p{margin:0;color:var(--memory-light);font-size:9px;font-weight:900;letter-spacing:.22em;text-transform:uppercase}.focusHeading h2{max-width:14ch;margin:9px 0 6px;font:500 clamp(1.9rem,3.7vw,4rem)/.94 Georgia,serif;letter-spacing:-.045em;text-wrap:balance}.focusHeading>span{font-size:10px;color:rgba(255,255,255,.62)}.focusNarration{max-width:340px;margin-top:13px;padding:10px 12px;border-left:1px solid color-mix(in srgb,var(--memory-light) 42%,transparent);background:linear-gradient(90deg,rgba(2,7,18,.55),rgba(2,7,18,0));backdrop-filter:blur(10px)}.focusNarration small{display:block;margin-bottom:4px;color:var(--memory-light);font-size:8px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.focusNarration strong{display:block;font:500 clamp(.86rem,1.3vw,1.08rem)/1.35 Georgia,serif;color:rgba(247,250,255,.9)}.focusStarMemoryButton{position:relative;display:block;width:184px;height:164px;padding:0;border:0;border-radius:43% 57% 48% 52%/55% 44% 56% 45%;overflow:visible;isolation:isolate;background:transparent;color:#fff;cursor:pointer}.focusStarMemoryButton::before{content:'';position:absolute;left:50%;top:50%;width:142%;height:142%;transform:translate(-50%,-50%) rotate(-3deg);border-radius:46% 54% 48% 52%/57% 43% 55% 45%;background:radial-gradient(ellipse at 48% 51%,rgba(255,255,244,.98) 0 25%,rgba(255,239,189,.84) 36%,rgba(255,183,81,.38) 52%,rgba(255,122,39,.14) 66%,transparent 79%);filter:blur(4.5px);mix-blend-mode:screen;pointer-events:none;z-index:0}.focusStarMemoryButton::after{content:'';position:absolute;left:50%;top:50%;width:184%;height:176%;transform:translate(-50%,-50%) rotate(-5deg);border-radius:43% 57% 46% 54%/59% 41% 56% 44%;background:radial-gradient(ellipse at 8% 45%,rgba(255,238,188,.38) 0 3%,rgba(255,167,70,.15) 9%,transparent 22%),radial-gradient(ellipse at 82% 17%,rgba(255,251,228,.42) 0 2.5%,rgba(255,197,105,.16) 10%,transparent 25%),radial-gradient(ellipse at 96% 61%,rgba(255,225,153,.34) 0 3%,rgba(255,138,51,.13) 11%,transparent 25%),radial-gradient(ellipse at 27% 96%,rgba(255,246,211,.32) 0 2.5%,rgba(255,172,75,.12) 10%,transparent 26%),radial-gradient(ellipse at 56% 4%,rgba(255,232,164,.30) 0 2%,rgba(255,151,57,.10) 9%,transparent 21%);filter:blur(4.5px);mix-blend-mode:screen;pointer-events:none;z-index:0}.focusStarMemoryButton:disabled{cursor:default}.focusMemoryVisual{position:relative;z-index:2;display:block;width:100%;height:100%;overflow:hidden;border:0;border-radius:43% 57% 48% 52%/55% 44% 56% 45%;background:transparent;opacity:.94;filter:saturate(1.14) contrast(1.17) brightness(1.08);box-shadow:0 0 18px rgba(255,246,205,.78),0 0 46px rgba(255,164,66,.32);-webkit-mask-image:radial-gradient(ellipse at 49% 51%,#000 0 52%,rgba(0,0,0,.94) 66%,rgba(0,0,0,.42) 80%,transparent 97%);mask-image:radial-gradient(ellipse at 49% 51%,#000 0 52%,rgba(0,0,0,.94) 66%,rgba(0,0,0,.42) 80%,transparent 97%);mix-blend-mode:normal}.focusMemoryVisualSource video{width:100%;height:100%;object-fit:cover}.focusMemoryVisualImage{background-size:cover;background-position:center}.focusMemoryVisualGenerated{background:radial-gradient(circle at 58% 31%,rgba(255,235,188,.72) 0 5%,rgba(255,170,96,.28) 13%,transparent 32%),radial-gradient(ellipse at 43% 66%,rgba(109,155,176,.28) 0 24%,transparent 52%),radial-gradient(ellipse at 69% 74%,rgba(41,83,106,.25) 0 20%,transparent 49%),linear-gradient(155deg,rgba(255,126,60,.12) 0%,rgba(98,86,105,.14) 44%,rgba(35,80,103,.18) 68%,rgba(7,22,36,.05) 100%)}.generatedMemoryGlow{position:absolute;left:2%;right:2%;top:34%;height:34%;background:radial-gradient(ellipse at 58% 10%,rgba(255,190,128,.34),transparent 42%),linear-gradient(180deg,rgba(242,174,128,.16),rgba(80,111,128,.09) 46%,rgba(5,16,27,.16));filter:blur(5px);opacity:.92}.generatedMemoryHorizon{position:absolute;left:-9%;right:-9%;top:53%;height:50%;background:radial-gradient(ellipse at 34% 28%,rgba(85,109,120,.40),transparent 46%),radial-gradient(ellipse at 68% 42%,rgba(31,60,77,.72),transparent 54%),linear-gradient(180deg,rgba(31,48,61,.14),rgba(5,18,29,.82));clip-path:polygon(0 42%,11% 31%,22% 38%,34% 21%,45% 36%,58% 26%,70% 41%,83% 29%,100% 39%,100% 100%,0 100%);filter:blur(.9px);opacity:.68}.generatedMemoryThread{position:absolute;left:-8%;width:116%;transform-origin:center;pointer-events:none}.generatedMemoryThreadA{top:48%;height:19%;background:linear-gradient(180deg,rgba(255,183,110,.06),rgba(24,52,67,.32));clip-path:polygon(0 78%,13% 42%,25% 64%,39% 22%,52% 65%,66% 35%,80% 62%,92% 30%,100% 57%,100% 100%,0 100%);filter:blur(.35px)}.generatedMemoryThreadB{top:57%;height:25%;background:linear-gradient(180deg,rgba(64,99,112,.18),rgba(8,25,38,.46));clip-path:polygon(0 73%,12% 54%,24% 61%,36% 38%,48% 70%,61% 50%,73% 67%,86% 45%,100% 58%,100% 100%,0 100%);opacity:.90}.generatedMemoryThreadC{top:63%;height:24%;background:linear-gradient(180deg,rgba(215,174,130,.10),rgba(20,49,63,.35));clip-path:polygon(0 58%,16% 47%,30% 61%,44% 41%,57% 56%,70% 39%,84% 53%,100% 44%,100% 100%,0 100%);opacity:.62;filter:blur(1.4px)}.focusMemoryGlass{position:absolute;inset:0;opacity:.10;border-radius:50%;background:radial-gradient(circle at 31% 23%,rgba(255,255,255,.14),transparent 15%),radial-gradient(circle at 50% 55%,transparent 54%,rgba(91,157,255,.05) 80%,rgba(255,255,255,.06) 100%);box-shadow:inset 0 0 22px rgba(255,255,255,.08);pointer-events:none}.focusMemoryTruthLabel{position:absolute;left:50%;bottom:18px;transform:translateX(-50%);width:68%;max-width:68%;box-sizing:border-box;padding:3px 5px;border-radius:999px;background:rgba(2,7,18,.42);color:rgba(240,248,255,.78);font-size:7px;font-weight:850;line-height:1.2;letter-spacing:.07em;text-align:center;text-transform:uppercase;white-space:normal;backdrop-filter:blur(6px)}.focusMemoryVisualNeutral{display:grid;place-items:center;background:radial-gradient(circle at 50% 48%,rgba(103,232,249,.11),transparent 28%),#020712}.focusMemoryNeutralCore{width:22px;height:22px;border-radius:999px;background:#effcff;box-shadow:0 0 18px rgba(190,242,255,.9),0 0 48px rgba(103,232,249,.46)}.focusFallback{position:absolute;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:radial-gradient(circle at 50% 45%,rgba(76,202,255,.12),transparent 30%),linear-gradient(180deg,#02040b,#040917);color:#fff}.focusFallbackStarField{gap:14px}.focusFallbackStar{width:min(48vw,360px);aspect-ratio:1;border-radius:999px;padding:16px;background:radial-gradient(circle,rgba(103,232,249,.14),rgba(139,92,246,.07) 50%,transparent 72%);box-shadow:0 0 80px color-mix(in srgb,var(--memory-accent) 24%,transparent)}.focusFallbackStar .focusMemoryVisual{box-shadow:inset 0 0 42px rgba(255,255,255,.14),0 0 30px color-mix(in srgb,var(--memory-accent) 42%,transparent)}.focusFallback span:not(.focusMemoryVisual):not(.focusMemoryGlass):not(.generatedMemoryGlow):not(.generatedMemoryHorizon):not(.generatedMemoryThread):not(.focusMemoryTruthLabel){max-width:520px;color:rgba(235,247,255,.72)}.memoryMeaning{position:absolute;z-index:8;left:max(22px,env(safe-area-inset-left));bottom:max(22px,calc(env(safe-area-inset-bottom) + 8px));width:min(390px,36vw);padding:10px 12px;border:1px solid rgba(205,235,255,.14);border-radius:16px;background:rgba(2,7,18,.52);backdrop-filter:blur(16px)}.memoryMeaning p{margin:0 0 8px;font-size:10px;color:rgba(240,248,255,.75)}.memoryMeta{display:flex;flex-wrap:wrap;gap:7px}.memoryMeta span{display:grid;gap:2px;padding:5px 8px;border-radius:10px;background:rgba(255,255,255,.04);font-size:10px;color:rgba(240,248,255,.82)}.memoryMeta b{font-size:7px;letter-spacing:.12em;text-transform:uppercase;color:var(--memory-light)}.neutralActions{display:flex;align-items:center;gap:10px}.neutralActions button,.focusControls button,.webglRecovery button{min-height:48px;padding:0 15px;border-radius:999px;border:1px solid rgba(220,248,255,.2);background:rgba(6,15,30,.72);color:#fff;font-weight:850}.neutralActions span{font-size:9px;color:rgba(235,247,255,.65)}.focusControls{position:absolute;z-index:10;right:max(20px,env(safe-area-inset-right));top:max(20px,env(safe-area-inset-top));display:flex;gap:7px;padding:6px;border:1px solid rgba(215,246,255,.14);border-radius:999px;background:rgba(2,7,18,.54);backdrop-filter:blur(14px)}.focusControls .primary{background:linear-gradient(135deg,var(--memory-light),var(--memory-accent));color:#031019}.focusControls button:focus-visible,.neutralActions button:focus-visible,.focusHelp summary:focus-visible,.focusStarMemoryButton:focus-visible,.webglRecovery button:focus-visible{outline:3px solid var(--memory-light);outline-offset:3px}.focusHelp{position:absolute;z-index:9;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));max-width:min(360px,calc(100vw - 40px));border:1px solid rgba(215,246,255,.14);border-radius:16px;background:rgba(2,7,18,.56);backdrop-filter:blur(14px)}.focusHelp summary{min-height:48px;display:flex;align-items:center;padding:0 15px;font-weight:850;cursor:pointer;font-size:11px}.focusHelp p{margin:0;padding:0 15px 14px;color:rgba(235,247,255,.74);font-size:11px;line-height:1.5}.focusStatus{position:absolute;z-index:9;left:50%;top:max(16px,env(safe-area-inset-top));transform:translateX(-50%);padding:6px 10px;border-radius:999px;background:rgba(2,7,18,.45);font-size:8px;font-weight:850;letter-spacing:.1em;text-transform:uppercase}.webglRecovery{position:absolute;z-index:15;inset:0;display:grid;place-content:center;justify-items:center;gap:10px;padding:24px;text-align:center;background:rgba(1,5,12,.88)}@media(max-width:760px){.focusHeading{left:14px;top:14px;width:calc(100vw - 28px);max-width:270px}.focusHeading h2{font-size:clamp(1.7rem,8.4vw,2.8rem);max-width:10ch}.focusNarration{margin-top:8px;max-width:250px;padding:8px 10px}.focusNarration strong{font-size:.86rem}.focusControls{right:10px;top:auto;bottom:max(12px,env(safe-area-inset-bottom));max-width:calc(100vw - 20px);overflow-x:auto}.focusControls button{min-height:48px;padding:0 12px;font-size:10px}.memoryMeaning{left:12px;bottom:max(70px,calc(env(safe-area-inset-bottom) + 62px));width:min(300px,calc(100vw - 24px));padding:8px 10px}.memoryMeaning p{display:none}.memoryMeta{gap:5px}.memoryMeta span{font-size:9px;padding:4px 6px}.focusHelp{display:none}.focusStatus{top:10px;font-size:7px}.focusStarMemoryButton{width:150px;height:132px}.focusFallbackStar{width:min(72vw,290px)}}@media(max-height:460px){.focusHeading{top:10px;max-width:250px}.focusHeading h2{font-size:1.45rem;margin:5px 0}.focusNarration{display:none}.memoryMeaning{display:none}.focusControls{top:10px;bottom:auto}.focusStarMemoryButton{width:136px;height:120px}}@media(prefers-reduced-motion:reduce){.focusBackdrop{background:radial-gradient(circle at 50% 48%,color-mix(in srgb,var(--memory-accent) 9%,transparent),transparent 25%),#02040b}}@media(forced-colors:active){.focusControls,.memoryMeaning,.focusHelp{background:Canvas;border-color:CanvasText}.focusControls button,.neutralActions button,.focusHelp summary{forced-color-adjust:auto}.focusStarMemoryButton{border:2px solid CanvasText;box-shadow:none}}"
