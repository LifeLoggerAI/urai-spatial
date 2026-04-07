'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

type Phase = 'home' | 'lifemap' | 'focus' | 'replay'
type TransitionKind =
| 'home_to_lifemap'
| 'lifemap_to_focus'
| 'focus_to_replay'
| 'replay_to_focus'
| 'focus_to_lifemap'
| 'lifemap_to_home'

type TransitionState = {
active: boolean
kind: TransitionKind | null
startedAt: number
durationMs: number
}

type StarNode = {
id: string
layer: 'near' | 'mid' | 'far'
position: [number, number, number]
radius: number
memoryRef: string
}

const BG = '#01082f'

const HOME_POS = new THREE.Vector3(0, 1.72, 12.2)
const HOME_TARGET = new THREE.Vector3(0, 0.08, 0)

const ASCENT_A_POS = new THREE.Vector3(0, 2.7, 10.2)
const ASCENT_A_TARGET = new THREE.Vector3(0, 0.28, -4.0)

const ASCENT_B_POS = new THREE.Vector3(0, 5.8, 5.0)
const ASCENT_B_TARGET = new THREE.Vector3(0, 0.10, -13.5)

const ASCENT_C_POS = new THREE.Vector3(0, 3.3, 1.2)
const ASCENT_C_TARGET = new THREE.Vector3(0, 0.00, -19.0)

const LIFEMAP_POS = new THREE.Vector3(0, 0.28, 11.1)
const LIFEMAP_TARGET = new THREE.Vector3(0, 0.00, -22.0)

const FOCUS_OFFSET = new THREE.Vector3(0, 0.05, 0.82)
const REPLAY_OFFSET = new THREE.Vector3(0, 0.01, 0.16)

const T_HOME_TO_LIFEMAP = 2200
const T_LIFEMAP_TO_FOCUS = 980
const T_FOCUS_TO_REPLAY = 1300
const T_REPLAY_TO_FOCUS = 950
const T_FOCUS_TO_LIFEMAP = 880
const T_LIFEMAP_TO_HOME = 1300

function clamp01(n: number): number {
return Math.max(0, Math.min(1, n))
}

function smoothstep(a: number, b: number, x: number): number {
const t = clamp01((x - a) / (b - a))
return t * t * (3 - 2 * t)
}

function easeOutCubic(t: number): number {
return 1 - Math.pow(1 - t, 3)
}

function easeInOutCubic(t: number): number {
return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerp(a: number, b: number, t: number): number {
return a + (b - a) * t
}

function vlerp(a: THREE.Vector3, b: THREE.Vector3, t: number): THREE.Vector3 {
return new THREE.Vector3(
lerp(a.x, b.x, t),
lerp(a.y, b.y, t),
lerp(a.z, b.z, t),
)
}

function transitionProgress(tr: TransitionState): number {
if (!tr.active || !tr.kind) return 0
return clamp01((performance.now() - tr.startedAt) / tr.durationMs)
}

function buildStars(): StarNode[] {
return [
{ id: 'far_00', layer: 'far', position: [-17.0,  9.2, -36.0], radius: 0.040, memoryRef: 'memory_far_00' },
{ id: 'far_01', layer: 'far', position: [-12.8,  7.8, -34.0], radius: 0.042, memoryRef: 'memory_far_01' },
{ id: 'far_02', layer: 'far', position: [ -8.2,  9.8, -35.0], radius: 0.040, memoryRef: 'memory_far_02' },
{ id: 'far_03', layer: 'far', position: [ -2.0, 11.0, -37.0], radius: 0.043, memoryRef: 'memory_far_03' },
{ id: 'far_04', layer: 'far', position: [  4.0, 10.0, -36.0], radius: 0.040, memoryRef: 'memory_far_04' },
{ id: 'far_05', layer: 'far', position: [  9.2,  8.0, -35.0], radius: 0.041, memoryRef: 'memory_far_05' },
{ id: 'far_06', layer: 'far', position: [ 14.2,  5.0, -34.0], radius: 0.040, memoryRef: 'memory_far_06' },
{ id: 'far_07', layer: 'far', position: [ 16.4,  0.0, -36.0], radius: 0.042, memoryRef: 'memory_far_07' },
{ id: 'far_08', layer: 'far', position: [ 13.6, -4.8, -35.0], radius: 0.041, memoryRef: 'memory_far_08' },
{ id: 'far_09', layer: 'far', position: [  8.6, -7.0, -34.0], radius: 0.042, memoryRef: 'memory_far_09' },
{ id: 'far_10', layer: 'far', position: [  1.6, -8.2, -36.0], radius: 0.040, memoryRef: 'memory_far_10' },
{ id: 'far_11', layer: 'far', position: [ -5.8, -7.0, -35.0], radius: 0.041, memoryRef: 'memory_far_11' },
{ id: 'far_12', layer: 'far', position: [-11.8, -4.5, -34.0], radius: 0.041, memoryRef: 'memory_far_12' },
{ id: 'far_13', layer: 'far', position: [-16.0,  0.8, -36.0], radius: 0.040, memoryRef: 'memory_far_13' },

```
{ id: 'mid_00', layer: 'mid', position: [-11.0,  6.3, -21.0], radius: 0.090, memoryRef: 'memory_mid_00' },
{ id: 'mid_01', layer: 'mid', position: [ -7.2,  3.9, -19.5], radius: 0.090, memoryRef: 'memory_mid_01' },
{ id: 'mid_02', layer: 'mid', position: [ -3.5,  6.8, -20.5], radius: 0.095, memoryRef: 'memory_mid_02' },
{ id: 'mid_03', layer: 'mid', position: [  2.1,  7.3, -22.0], radius: 0.095, memoryRef: 'memory_mid_03' },
{ id: 'mid_04', layer: 'mid', position: [  7.0,  5.7, -20.5], radius: 0.095, memoryRef: 'memory_mid_04' },
{ id: 'mid_05', layer: 'mid', position: [ 11.2,  2.2, -21.0], radius: 0.095, memoryRef: 'memory_mid_05' },
{ id: 'mid_06', layer: 'mid', position: [  8.7, -2.4, -19.5], radius: 0.095, memoryRef: 'memory_mid_06' },
{ id: 'mid_07', layer: 'mid', position: [  3.8, -5.1, -20.0], radius: 0.090, memoryRef: 'memory_mid_07' },
{ id: 'mid_08', layer: 'mid', position: [ -2.4, -5.8, -21.0], radius: 0.095, memoryRef: 'memory_mid_08' },
{ id: 'mid_09', layer: 'mid', position: [ -8.2, -3.8, -19.5], radius: 0.095, memoryRef: 'memory_mid_09' },

{ id: 'near_00', layer: 'near', position: [-8.2,  2.0,  -9.2], radius: 0.150, memoryRef: 'memory_near_00' },
{ id: 'near_01', layer: 'near', position: [-4.0,  4.0,  -8.4], radius: 0.138, memoryRef: 'memory_near_01' },
{ id: 'near_02', layer: 'near', position: [ 5.5,  3.8,  -9.6], radius: 0.145, memoryRef: 'memory_near_02' },
{ id: 'near_03', layer: 'near', position: [ 3.5, -4.3,  -8.8], radius: 0.138, memoryRef: 'memory_near_03' },
{ id: 'near_04', layer: 'near', position: [-3.3, -4.1,  -7.9], radius: 0.142, memoryRef: 'memory_near_04' },
```

]
}

const STARS: StarNode[] = buildStars()

function getStar(id: string | null): StarNode | null {
return STARS.find((s) => s.id === id) || null
}

function BackgroundDust(props: { opacity: number }) {
const dust = useMemo(() => {
const out: Array<[number, number, number, number]> = []
for (let i = 0; i < 180; i += 1) {
const x = Math.sin(i * 1.57) * 76
const y = Math.cos(i * 2.07) * 42
const z = -46 - (i % 14) * 2.4
const r = 0.012 + (i % 3) * 0.007
out.push([x, y, z, r])
}
return out
}, [])

return ( <group>
{dust.map((d, i) => (
<mesh key={i} position={[d[0], d[1], d[2]]}>
<sphereGeometry args={[d[3], 6, 6]} />
<meshBasicMaterial color="#6c7da2" transparent opacity={props.opacity * 0.18} /> </mesh>
))} </group>
)
}

function HomeWorld(props: {
phase: Phase
transition: TransitionState
onSkyClick: () => void
}) {
const p = transitionProgress(props.transition)

let homeAlpha = props.phase === 'home' ? 1 : 0
let orbAlpha = homeAlpha

if (props.transition.active && props.transition.kind === 'home_to_lifemap') {
homeAlpha = 1 - smoothstep(0.20, 0.58, p)
orbAlpha = 1 - smoothstep(0.15, 0.48, p)
}

if (props.transition.active && props.transition.kind === 'lifemap_to_home') {
homeAlpha = smoothstep(0.42, 0.98, p)
orbAlpha = smoothstep(0.50, 1.00, p)
}

if (homeAlpha <= 0.001) return null

return ( <group>
<mesh position={[0, -2.75, 0]} receiveShadow>
<boxGeometry args={[220, 0.25, 180]} />
<meshStandardMaterial color="#9b9ba1" transparent opacity={0.98 * homeAlpha} /> </mesh>

```
  <mesh position={[0, -1.34, -20]}>
    <planeGeometry args={[220, 74]} />
    <meshBasicMaterial color="#02114b" transparent opacity={0.98 * homeAlpha} />
  </mesh>

  <mesh position={[0, 0.24, 0]} castShadow>
    <sphereGeometry args={[0.84, 48, 48]} />
    <meshStandardMaterial
      color="#d8d8dc"
      emissive="#ffffff"
      emissiveIntensity={0.02 + 0.05 * orbAlpha}
      transparent
      opacity={orbAlpha}
    />
  </mesh>

  <mesh
    position={[0, 6.8, -14]}
    onClick={(e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation()
      if (props.phase === 'home' && !props.transition.active) props.onSkyClick()
    }}
  >
    <planeGeometry args={[94, 30]} />
    <meshBasicMaterial transparent opacity={0.001} />
  </mesh>
</group>
```

)
}

function LifemapWorld(props: {
phase: Phase
transition: TransitionState
selectedStarId: string | null
driftX: number
driftY: number
onStarClick: (id: string) => void
onReplayClick: () => void
}) {
const p = transitionProgress(props.transition)

let fieldAlpha = props.phase === 'home' ? 0 : 1
if (props.transition.active && props.transition.kind === 'home_to_lifemap') {
fieldAlpha = smoothstep(0.55, 0.92, p)
}
if (props.transition.active && props.transition.kind === 'lifemap_to_home') {
fieldAlpha = 1 - smoothstep(0.05, 0.40, p)
}

const selectedId = props.selectedStarId

return ( <group visible={fieldAlpha > 0.001}> <BackgroundDust opacity={fieldAlpha} />
{STARS.map((star) => {
const isSelected = star.id === selectedId

```
    let alpha = fieldAlpha
    let scaleMul = 1
    let parallaxMul = 1

    if (star.layer === 'far') {
      alpha *= 0.40
      scaleMul = 0.60
      parallaxMul = 0.12
    } else if (star.layer === 'mid') {
      alpha *= 0.72
      scaleMul = 1.00
      parallaxMul = 0.35
    } else {
      alpha *= 0.96
      scaleMul = 1.60
      parallaxMul = 1.00
    }

    if (props.phase === 'focus') {
      if (isSelected) {
        alpha = 1
        scaleMul *= 1.24
      } else {
        alpha *= 0.04
        scaleMul *= 0.45
      }
    }

    if (props.phase === 'replay') {
      if (isSelected) {
        alpha = 0.01
        scaleMul *= 0.30
      } else {
        alpha *= 0.01
        scaleMul *= 0.20
      }
    }

    const radius = star.radius * scaleMul
    const color = isSelected ? '#d5b95c' : '#f1f3f7'
    const clickable = !props.transition.active && (props.phase === 'lifemap' || (props.phase === 'focus' && isSelected))
    const px = star.position[0] + props.driftX * parallaxMul
    const py = star.position[1] + props.driftY * parallaxMul

    return (
      <mesh
        key={star.id}
        position={[px, py, star.position[2]]}
        onClick={(e: ThreeEvent<MouseEvent>) => {
          e.stopPropagation()
          if (!clickable) return
          if (props.phase === 'lifemap') props.onStarClick(star.id)
          else if (props.phase === 'focus' && isSelected) props.onReplayClick()
        }}
      >
        <sphereGeometry args={[radius, 24, 24]} />
        <meshBasicMaterial color={color} transparent opacity={alpha} />
      </mesh>
    )
  })}
</group>
```

)
}

function ReplayWorld(props: {
phase: Phase
transition: TransitionState
selectedStarId: string | null
}) {
const selected = getStar(props.selectedStarId)
if (!selected) return null

const p = transitionProgress(props.transition)

let replayAlpha = props.phase === 'replay' ? 1 : 0
if (props.transition.active && props.transition.kind === 'focus_to_replay') {
replayAlpha = smoothstep(0.16, 0.92, p)
}
if (props.transition.active && props.transition.kind === 'replay_to_focus') {
replayAlpha = 1 - smoothstep(0.08, 0.74, p)
}

if (replayAlpha <= 0.001) return null

const [x, y, z] = selected.position

return (
<group position={[x, y, z - 4.6]}> <mesh>
<planeGeometry args={[60, 40]} />
<meshBasicMaterial color="#050d18" transparent opacity={0.985 * replayAlpha} /> </mesh>

```
  <mesh position={[0, 0, -0.1]}>
    <planeGeometry args={[34, 24]} />
    <meshBasicMaterial color="#0d1730" transparent opacity={0.965 * replayAlpha} />
  </mesh>

  <mesh position={[0, 0, -0.2]}>
    <ringGeometry args={[1.25, 2.5, 64]} />
    <meshBasicMaterial color="#c6a74c" transparent opacity={0.16 * replayAlpha} />
  </mesh>

  <mesh position={[0, 0, -0.34]}>
    <circleGeometry args={[0.62, 40]} />
    <meshBasicMaterial color="#11203d" transparent opacity={0.98 * replayAlpha} />
  </mesh>

  <mesh position={[-12.0, 7.0, -0.42]}>
    <circleGeometry args={[1.6, 28]} />
    <meshBasicMaterial color="#1c2b44" transparent opacity={0.30 * replayAlpha} />
  </mesh>

  <mesh position={[13.0, -7.5, -0.40]}>
    <circleGeometry args={[2.0, 28]} />
    <meshBasicMaterial color="#1d2f4c" transparent opacity={0.24 * replayAlpha} />
  </mesh>

  <mesh position={[16.0, 9.0, -0.45]}>
    <circleGeometry args={[1.2, 28]} />
    <meshBasicMaterial color="#213453" transparent opacity={0.20 * replayAlpha} />
  </mesh>
</group>
```

)
}

function CameraDirector(props: {
phase: Phase
transition: TransitionState
selectedStarId: string | null
onTransitionDone: () => void
onDrift: (x: number, y: number) => void
}) {
const { camera } = useThree()
const desiredPos = useRef(new THREE.Vector3().copy(HOME_POS))
const desiredTarget = useRef(new THREE.Vector3().copy(HOME_TARGET))
const smoothTarget = useRef(new THREE.Vector3().copy(HOME_TARGET))

useFrame((state) => {
const p = transitionProgress(props.transition)
const selected = getStar(props.selectedStarId)

```
let pos = HOME_POS.clone()
let target = HOME_TARGET.clone()

if (props.transition.active && props.transition.kind === 'home_to_lifemap') {
  const shake = Math.sin(p * 40) * (1 - smoothstep(0.35, 0.55, p)) * 0.08

  if (p < 0.25) {
    const t = easeOutCubic(smoothstep(0.0, 0.25, p))
    pos = vlerp(HOME_POS, ASCENT_A_POS, t)
    target = vlerp(HOME_TARGET, ASCENT_A_TARGET, t)
  } else if (p < 0.58) {
    const t = easeInOutCubic(smoothstep(0.25, 0.58, p))
    pos = vlerp(ASCENT_A_POS, ASCENT_B_POS, t)
    target = vlerp(ASCENT_A_TARGET, ASCENT_B_TARGET, t)
  } else if (p < 0.86) {
    const t = easeOutCubic(smoothstep(0.58, 0.86, p))
    pos = vlerp(ASCENT_B_POS, ASCENT_C_POS, t)
    target = vlerp(ASCENT_B_TARGET, ASCENT_C_TARGET, t)
  } else {
    const t = easeOutCubic(smoothstep(0.86, 1.00, p))
    pos = vlerp(ASCENT_C_POS, LIFEMAP_POS, t)
    target = vlerp(ASCENT_C_TARGET, LIFEMAP_TARGET, t)
  }

  pos.y += shake
  target.y += shake * 0.5
} else if (props.transition.active && props.transition.kind === 'lifemap_to_focus' && selected) {
  const t = easeOutCubic(p)
  const star = new THREE.Vector3(...selected.position)
  const focusPos = star.clone().add(FOCUS_OFFSET)
  pos = vlerp(LIFEMAP_POS, focusPos, t)
  target = vlerp(LIFEMAP_TARGET, star, t)
} else if (props.transition.active && props.transition.kind === 'focus_to_replay' && selected) {
  const t = easeInOutCubic(p)
  const star = new THREE.Vector3(...selected.position)
  const focusPos = star.clone().add(FOCUS_OFFSET)
  const replayPos = star.clone().add(REPLAY_OFFSET)
  pos = vlerp(focusPos, replayPos, t)
  target = vlerp(star, star.clone().add(new THREE.Vector3(0, 0, -4.2)), t)
} else if (props.transition.active && props.transition.kind === 'replay_to_focus' && selected) {
  const t = easeOutCubic(p)
  const star = new THREE.Vector3(...selected.position)
  const replayPos = star.clone().add(REPLAY_OFFSET)
  const focusPos = star.clone().add(FOCUS_OFFSET)
  pos = vlerp(replayPos, focusPos, t)
  target = vlerp(star.clone().add(new THREE.Vector3(0, 0, -4.2)), star, t)
} else if (props.transition.active && props.transition.kind === 'focus_to_lifemap' && selected) {
  const t = easeOutCubic(p)
  const star = new THREE.Vector3(...selected.position)
  const focusPos = star.clone().add(FOCUS_OFFSET)
  pos = vlerp(focusPos, LIFEMAP_POS, t)
  target = vlerp(star, LIFEMAP_TARGET, t)
} else if (props.transition.active && props.transition.kind === 'lifemap_to_home') {
  const t = easeInOutCubic(p)
  pos = vlerp(LIFEMAP_POS, HOME_POS, t)
  target = vlerp(LIFEMAP_TARGET, HOME_TARGET, t)
} else if (props.phase === 'home') {
  pos = HOME_POS.clone().add(new THREE.Vector3(0, Math.sin(state.clock.elapsedTime * 0.40) * 0.018, 0))
  target = HOME_TARGET.clone()
} else if (props.phase === 'lifemap') {
  pos = LIFEMAP_POS.clone().add(new THREE.Vector3(
    Math.sin(state.clock.elapsedTime * 0.16) * 0.18,
    Math.cos(state.clock.elapsedTime * 0.13) * 0.12,
    0
  ))
  target = LIFEMAP_TARGET.clone()
} else if (props.phase === 'focus' && selected) {
  const star = new THREE.Vector3(...selected.position)
  pos = star.clone().add(FOCUS_OFFSET)
  target = star
} else if (props.phase === 'replay' && selected) {
  const star = new THREE.Vector3(...selected.position)
  pos = star.clone().add(REPLAY_OFFSET).add(new THREE.Vector3(0, Math.sin(state.clock.elapsedTime * 0.52) * 0.010, 0))
  target = star.clone().add(new THREE.Vector3(0, 0, -4.2))
}

desiredPos.current.copy(pos)
desiredTarget.current.copy(target)

const lerpStrength =
  props.phase === 'home' ? 0.08 :
  props.phase === 'lifemap' ? 0.12 :
  props.phase === 'focus' ? 0.18 :
  0.22

camera.position.lerp(desiredPos.current, lerpStrength)
smoothTarget.current.lerp(desiredTarget.current, 0.19)
camera.lookAt(smoothTarget.current)

if (props.phase === 'lifemap' && !props.transition.active) {
  props.onDrift(camera.position.x - LIFEMAP_POS.x, camera.position.y - LIFEMAP_POS.y)
} else {
  props.onDrift(0, 0)
}

if (props.transition.active && p >= 1) {
  props.onTransitionDone()
}
```

})

return null
}

function SceneRoot() {
const [phase, setPhase] = useState<Phase>('home')
const [selectedStarId, setSelectedStarId] = useState<string | null>(null)
const [drift, setDrift] = useState<{ x: number; y: number }>({ x: 0, y: 0 })
const [transition, setTransition] = useState<TransitionState>({
active: false,
kind: null,
startedAt: 0,
durationMs: 0,
})

const phaseRef = useRef<Phase>('home')
const selectedRef = useRef<string | null>(null)

useEffect(() => {
phaseRef.current = phase
}, [phase])

useEffect(() => {
selectedRef.current = selectedStarId
}, [selectedStarId])

const begin = useCallback((kind: TransitionKind, durationMs: number) => {
setTransition({
active: true,
kind,
startedAt: performance.now(),
durationMs,
})
}, [])

const completeTransition = useCallback(() => {
const kind = transition.kind
setTransition({ active: false, kind: null, startedAt: 0, durationMs: 0 })

```
if (kind === 'home_to_lifemap') setPhase('lifemap')
if (kind === 'lifemap_to_focus') setPhase('focus')
if (kind === 'focus_to_replay') setPhase('replay')
if (kind === 'replay_to_focus') setPhase('focus')
if (kind === 'focus_to_lifemap') setPhase('lifemap')
if (kind === 'lifemap_to_home') {
  setPhase('home')
  setSelectedStarId(null)
}
```

}, [transition.kind])

const onSkyClick = useCallback(() => {
if (transition.active) return
if (phaseRef.current !== 'home') return
console.log('SKY CLICK')
begin('home_to_lifemap', T_HOME_TO_LIFEMAP)
}, [begin, transition.active])

const onStarClick = useCallback((id: string) => {
if (transition.active) return
if (phaseRef.current !== 'lifemap') return
setSelectedStarId(id)
console.log('STAR CLICK DIRECT ' + id)
console.log('STAR CLICK ' + id + ' lifemap')
begin('lifemap_to_focus', T_LIFEMAP_TO_FOCUS)
}, [begin, transition.active])

const onReplayClick = useCallback(() => {
if (transition.active) return
if (phaseRef.current !== 'focus') return
if (!selectedRef.current) return
console.log('STAR CLICK ' + selectedRef.current + ' focus')
begin('focus_to_replay', T_FOCUS_TO_REPLAY)
}, [begin, transition.active])

useEffect(() => {
const onKey = (e: KeyboardEvent) => {
if (e.key !== 'Escape') return
if (transition.active) return

```
  if (phaseRef.current === 'replay') {
    console.log('ESC KEY replay')
    begin('replay_to_focus', T_REPLAY_TO_FOCUS)
    return
  }

  if (phaseRef.current === 'focus') {
    console.log('ESC KEY focus')
    begin('focus_to_lifemap', T_FOCUS_TO_LIFEMAP)
    return
  }

  if (phaseRef.current === 'lifemap') {
    console.log('ESC KEY lifemap')
    begin('lifemap_to_home', T_LIFEMAP_TO_HOME)
  }
}

window.addEventListener('keydown', onKey)
return () => window.removeEventListener('keydown', onKey)
```

}, [begin, transition.active])

return (
<> <color attach="background" args={[BG]} />
<fog attach="fog" args={[BG, 18, 70]} /> <ambientLight intensity={0.64} />
<directionalLight position={[5, 12, 10]} intensity={0.82} />

```
  <HomeWorld phase={phase} transition={transition} onSkyClick={onSkyClick} />
  <LifemapWorld
    phase={phase}
    transition={transition}
    selectedStarId={selectedStarId}
    driftX={drift.x}
    driftY={drift.y}
    onStarClick={onStarClick}
    onReplayClick={onReplayClick}
  />
  <ReplayWorld
    phase={phase}
    transition={transition}
    selectedStarId={selectedStarId}
  />
  <CameraDirector
    phase={phase}
    transition={transition}
    selectedStarId={selectedStarId}
    onTransitionDone={completeTransition}
    onDrift={(x, y) => setDrift({ x, y })}
  />
</>
```

)
}

export default function SpatialScene() {
return (
<div style={{ width: '100vw', height: '100vh', background: BG }}>
<Canvas dpr={[1, 2]} camera={{ position: [0, 1.72, 12.2], fov: 41, near: 0.1, far: 300 }}> <SceneRoot /> </Canvas> </div>
)
}
