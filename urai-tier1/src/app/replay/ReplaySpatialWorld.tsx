'use client'

import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import { Float, Html, Sparkles, Stars } from '@react-three/drei'
import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { SelectedMemory, SelectedMemoryReplaySegment } from '@/spatial/memory/selectedMemoryContract'

type ReplaySpatialWorldProps = {
  memory: SelectedMemory
  active?: SelectedMemoryReplaySegment
  progressMs: number
  durationMs: number
  playing: boolean
  reducedMotion: boolean
  explorationEnabled: boolean
  onSelectAnchor: (label: string, detail: string) => void
}

type MovementState = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

const initialMovement: MovementState = { forward: false, backward: false, left: false, right: false }
const interactiveSelector = 'button,input,textarea,select,summary,a,[role="button"],[contenteditable="true"]'

function replayPhase(progressMs: number, durationMs: number) {
  if (durationMs <= 0) return 0
  return THREE.MathUtils.clamp(progressMs / durationMs, 0, 1)
}

function CameraRig({ progressMs, durationMs, reducedMotion, explorationEnabled }: Pick<ReplaySpatialWorldProps, 'progressMs' | 'durationMs' | 'reducedMotion' | 'explorationEnabled'>) {
  const { camera, size } = useThree()
  const movement = useRef<MovementState>({ ...initialMovement })
  const freePosition = useRef(new THREE.Vector3(0, 2.2, 7.5))
  const yaw = useRef(0)
  const pitch = useRef(-0.05)
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })
  const desired = useRef(new THREE.Vector3())
  const target = useRef(new THREE.Vector3())
  const direction = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const look = useRef(new THREE.Vector3())

  useEffect(() => {
    const update = (pressed: boolean) => (event: KeyboardEvent) => {
      const targetElement = event.target instanceof Element ? event.target : null
      if (targetElement?.closest(interactiveSelector)) return
      const key = event.key.toLowerCase()
      if (key === 'w' || key === 'arrowup') movement.current.forward = pressed
      if (key === 's' || key === 'arrowdown') movement.current.backward = pressed
      if (key === 'a' || key === 'arrowleft') movement.current.left = pressed
      if (key === 'd' || key === 'arrowright') movement.current.right = pressed
    }
    const down = update(true)
    const up = update(false)
    const clear = () => { movement.current = { ...initialMovement } }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', clear)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', clear)
    }
  }, [])

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!explorationEnabled) return
      const targetElement = event.target instanceof Element ? event.target : null
      if (targetElement?.closest(interactiveSelector)) return
      dragging.current = true
      lastPointer.current = { x: event.clientX, y: event.clientY }
    }
    const onPointerMove = (event: PointerEvent) => {
      if (!dragging.current || !explorationEnabled) return
      const dx = event.clientX - lastPointer.current.x
      const dy = event.clientY - lastPointer.current.y
      yaw.current -= dx * 0.003
      pitch.current = THREE.MathUtils.clamp(pitch.current - dy * 0.0022, -0.55, 0.42)
      lastPointer.current = { x: event.clientX, y: event.clientY }
    }
    const onPointerUp = () => { dragging.current = false }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('pointermove', onPointerMove)
    window.addEventListener('pointerup', onPointerUp)
    window.addEventListener('pointercancel', onPointerUp)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerup', onPointerUp)
      window.removeEventListener('pointercancel', onPointerUp)
    }
  }, [explorationEnabled])

  useFrame((state, delta) => {
    const mobile = size.width < 720
    const phase = replayPhase(progressMs, durationMs)
    const easing = reducedMotion ? 1 : 1 - Math.exp(-delta * 3.8)

    if (!explorationEnabled) {
      const angle = phase * Math.PI * 1.05 - 0.35
      const radius = mobile ? 8.3 : 9.8
      desired.current.set(
        Math.sin(angle) * radius * 0.42,
        (mobile ? 2.45 : 2.8) + Math.sin(phase * Math.PI) * 1.2,
        Math.cos(angle) * radius + 1.1 - phase * 4.3,
      )
      target.current.set(0, 1.2 + Math.sin(phase * Math.PI) * 0.45, -2.8 - phase * 2.2)
      camera.position.lerp(desired.current, easing)
      camera.lookAt(target.current)
      freePosition.current.copy(camera.position)
      return
    }

    const speed = reducedMotion ? 2.3 : 3.8
    const forward = Number(movement.current.forward) - Number(movement.current.backward)
    const strafe = Number(movement.current.right) - Number(movement.current.left)
    direction.current.set(Math.sin(yaw.current), 0, -Math.cos(yaw.current))
    right.current.set(direction.current.z * -1, 0, direction.current.x)
    freePosition.current.addScaledVector(direction.current, forward * speed * delta)
    freePosition.current.addScaledVector(right.current, strafe * speed * delta)
    freePosition.current.x = THREE.MathUtils.clamp(freePosition.current.x, -8.2, 8.2)
    freePosition.current.y = THREE.MathUtils.clamp(freePosition.current.y, 1.35, 3.5)
    freePosition.current.z = THREE.MathUtils.clamp(freePosition.current.z, -10.5, 8.5)
    camera.position.lerp(freePosition.current, easing)
    look.current.set(
      camera.position.x + Math.sin(yaw.current) * Math.cos(pitch.current),
      camera.position.y + Math.sin(pitch.current),
      camera.position.z - Math.cos(yaw.current) * Math.cos(pitch.current),
    )
    camera.lookAt(look.current)
    state.invalidate()
  })

  return null
}

function MemoryAnchor({ position, label, detail, accent, inferred, reducedMotion, onSelect }: { position: [number, number, number]; label: string; detail: string; accent: string; inferred?: boolean; reducedMotion: boolean; onSelect: (label: string, detail: string) => void }) {
  const ref = useRef<THREE.Group>(null)
  const activate = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    onSelect(label, detail)
  }
  useFrame((state) => {
    if (!ref.current || reducedMotion) return
    ref.current.rotation.y = state.clock.getElapsedTime() * 0.16
  })
  return (
    <group ref={ref} position={position}>
      <Float speed={reducedMotion ? 0 : 1.2} rotationIntensity={reducedMotion ? 0 : 0.12} floatIntensity={reducedMotion ? 0 : 0.18}>
        <mesh onClick={activate} onPointerOver={() => { document.body.style.cursor = 'pointer' }} onPointerOut={() => { document.body.style.cursor = '' }}>
          <icosahedronGeometry args={[inferred ? 0.34 : 0.46, inferred ? 1 : 2]} />
          <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={inferred ? 0.55 : 1.1} transparent opacity={inferred ? 0.42 : 0.82} roughness={0.22} metalness={0.08} wireframe={inferred} />
        </mesh>
        <Html center distanceFactor={10} style={{ pointerEvents: 'none' }}>
          <span className="replayAnchorLabel" data-inferred={inferred ? 'true' : 'false'}>{label}</span>
        </Html>
      </Float>
    </group>
  )
}

function MemoryWorld({ memory, active, progressMs, durationMs, reducedMotion, explorationEnabled, onSelectAnchor }: ReplaySpatialWorldProps) {
  const accent = memory.visuals.accent
  const light = memory.visuals.light
  const anchors = useMemo(() => {
    const people = memory.people.slice(0, 4).map((person, index) => ({
      position: [index % 2 === 0 ? -3.6 - index * 0.45 : 3.6 + index * 0.35, 1.1 + (index % 2) * 0.55, -4.5 - index * 1.75] as [number, number, number],
      label: person.label,
      detail: person.relationship ? `${person.relationship} · confirmed person reference` : 'Confirmed person reference',
      inferred: false,
    }))
    const segmentAnchors = memory.replayManifest.segments.map((segment, index) => ({
      position: [index % 2 === 0 ? -1.7 : 1.7, 0.85 + index * 0.23, -2.7 - index * 2.5] as [number, number, number],
      label: segment.label,
      detail: `${segment.caption} · reconstructed narrative segment`,
      inferred: segment.id === 'emotion' || segment.id === 'pattern',
    }))
    return [...people, ...segmentAnchors]
  }, [memory.people, memory.replayManifest.segments])

  return (
    <>
      <color attach="background" args={[memory.visuals.sky]} />
      <fog attach="fog" args={[memory.visuals.ground, 8, 31]} />
      <ambientLight intensity={0.32} color={light} />
      <directionalLight castShadow position={[5, 10, 7]} color={light} intensity={1.8} shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <pointLight position={[0, 3.4, -4]} color={accent} intensity={3.6} distance={18} />
      <Stars radius={55} depth={26} count={reducedMotion ? 450 : 900} factor={2.2} saturation={0.25} fade speed={reducedMotion ? 0 : 0.18} />
      <Sparkles count={reducedMotion ? 18 : Math.round(35 + memory.visuals.particles * 95)} scale={[18, 8, 28]} size={1.15} speed={reducedMotion ? 0 : 0.16} color={accent} opacity={reducedMotion ? 0.24 : 0.48} />

      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.35, -3]}>
        <planeGeometry args={[28, 36, 1, 1]} />
        <meshStandardMaterial color={memory.visuals.ground} roughness={0.72} metalness={memory.visuals.reflection * 0.28} />
      </mesh>

      {[0, 1, 2, 3].map((index) => (
        <mesh key={index} position={[0, 0.25 + index * 0.44, -3.2 - index * 3.2]} rotation={[0, index % 2 ? 0.12 : -0.12, 0]}>
          <torusGeometry args={[3.2 + index * 0.72, 0.035 + index * 0.008, 12, 96, Math.PI]} />
          <meshStandardMaterial color={index === memory.replayManifest.segments.indexOf(active ?? memory.replayManifest.segments[0]) ? light : accent} emissive={accent} emissiveIntensity={0.6} transparent opacity={0.2 + index * 0.045} />
        </mesh>
      ))}

      <mesh castShadow position={[0, 1.35, -5.6]}>
        <sphereGeometry args={[1.05, 48, 48]} />
        <meshPhysicalMaterial color={accent} emissive={accent} emissiveIntensity={1.15} transmission={0.55} thickness={0.8} roughness={0.08} metalness={0.05} transparent opacity={0.84} />
      </mesh>

      {anchors.map((anchor) => <MemoryAnchor key={`${anchor.label}-${anchor.position.join('-')}`} {...anchor} reducedMotion={reducedMotion} accent={anchor.inferred ? '#b9a9ff' : accent} onSelect={onSelectAnchor} />)}

      <CameraRig progressMs={progressMs} durationMs={durationMs} reducedMotion={reducedMotion} explorationEnabled={explorationEnabled} />
    </>
  )
}

export function ReplaySpatialWorld(props: ReplaySpatialWorldProps) {
  const [webglLost, setWebglLost] = useState(false)
  return (
    <section className="replaySpatialStage" data-testid="replay-spatial-world" data-exploration={props.explorationEnabled ? 'true' : 'false'} data-webgl-lost={webglLost ? 'true' : 'false'}>
      <Canvas
        shadows
        dpr={[1, 1.7]}
        camera={{ position: [0, 2.2, 8.5], fov: 48, near: 0.1, far: 90 }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          const canvas = gl.domElement
          const lost = (event: Event) => { event.preventDefault(); setWebglLost(true) }
          const restored = () => setWebglLost(false)
          canvas.addEventListener('webglcontextlost', lost, { passive: false })
          canvas.addEventListener('webglcontextrestored', restored)
        }}
      >
        <Suspense fallback={null}><MemoryWorld {...props} /></Suspense>
      </Canvas>
      {webglLost ? <div className="replayWebglRecovery" role="status"><strong>Restoring the memory space…</strong><span>Your replay data remains private and unchanged.</span></div> : null}
      <style>{worldCss}</style>
    </section>
  )
}

const worldCss = `.replaySpatialStage{position:absolute;inset:0;z-index:0;background:#02050a}.replaySpatialStage canvas{display:block;width:100%;height:100%;touch-action:none}.replayAnchorLabel{display:block;max-width:150px;padding:6px 9px;border:1px solid rgba(255,255,255,.3);border-radius:999px;background:rgba(2,7,14,.72);color:white;font:700 11px/1.2 system-ui,sans-serif;white-space:nowrap;box-shadow:0 8px 24px rgba(0,0,0,.35);backdrop-filter:blur(10px)}.replayAnchorLabel[data-inferred=true]{border-style:dashed;color:#ddd6ff}.replayWebglRecovery{position:absolute;inset:0;display:grid;place-content:center;gap:6px;text-align:center;background:rgba(2,5,10,.9);color:#fff}.replayWebglRecovery span{font-size:12px;color:rgba(255,255,255,.72)}@media(prefers-reduced-motion:reduce){.replayAnchorLabel{transition:none}}`