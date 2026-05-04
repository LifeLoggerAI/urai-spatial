'use client'
import Starfield3D from '@/spatial/components/Starfield3D'

import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'

// CANON: URAI Tier 1 Visual and Interaction Canon
// 1. PHASE LAW: Legal forward path is HOME -> ASCENT -> LIFEMAP -> FOCUS -> REPLAY.
// 2. UNWIND LAW: Legal unwind path is REPLAY -> FOCUS -> LIFEMAP -> HOME. Strict ESC-only.
// 3. HOME LAW: Must have low ground, anchored orb, dominant sky. Entry to LifeMap is sky-click ONLY.
// 4. ASCENT LAW: Must be a cinematic departure, not a mode swap. Severance from Home must be visible.
// 5. LIFEMAP LAW: Must be fully severed from Home. Must have layered depth & parallax.
// 6. FOCUS LAW: Must isolate the selected star, subordinating the field.
// 7. REPLAY LAW: Must be an immersive, memory-dominant environment. NOT a panel over the starfield.
// 8. AUTHORITY LAW: Reducer owns phase. CameraDirector is the single camera writer. No illegal shortcuts.

import { getAscentChannels, type Phase, sceneReducer, type SceneState } from './phaseMachine'

type TransitionKind = 'homeToLifemap' | 'lifemapToHome' | null

type StarNode = {
id: string
x: number
y: number
z: number // Added for z-depth to enforce LifeMap depth canon
size: number
memoryRef: string
label: string
}

function clamp01(v: number) {
return Math.max(0, Math.min(1, v))
}

function easeInOutCubic(t: number) {
return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// CAMERA_DIRECTOR: Single writer for camera state. Complies with AUTHORITY LAW.
// Values updated to enforce visual canon for all phases.
function getCameraDirector(progress: number, phase: Phase, selectedStar: StarNode | null) {
const p = clamp01(progress)
const e = easeInOutCubic(p)

if (phase === 'HOME') {
return {
scale: 1,
translateY: 0,
background: '#020748', // Dominant sky
starOpacity: 0, // No stars at home
vignette: 0.1,
homeOpacity: 1, // Home elements fully visible
replayOpacity: 0,
orbScale: 1,
groundOpacity: 1, // Ground visible
translateX: 0,
nebulaOpacity: 0,
cameraY: 0.8,
near: 0.1,
far: 150,
}
}
if (phase === 'ASCENT') {
const ascent = getAscentChannels(p)
return {
scale: 1 + ascent.cameraLift * 0.6,
translateY: ascent.cameraLift * -18,
translateX: 0,
background: '#020748',
starOpacity: ascent.starStreak * 0.85,
vignette: 0.1 + ascent.nebulaReveal * 0.22,
homeOpacity: 1 - ascent.groundRecession,
replayOpacity: 0,
orbScale: 1 - ascent.groundRecession * 0.55,
groundOpacity: 1 - ascent.groundRecession,
nebulaOpacity: ascent.nebulaReveal,
cameraY: 1.0 + ascent.cameraLift * 0.6,
near: 0.09 + ascent.nebulaReveal * 0.06,
far: 130 + ascent.cameraLift * 50,
}
}
if (phase === 'LIFEMAP') {
// Fully severed from home, per LIFEMAP LAW.
return {
scale: 1,
translateY: 0,
background: '#01031a',
starOpacity: 1,
vignette: 0.2,
homeOpacity: 0,
replayOpacity: 0,
orbScale: 0,
groundOpacity: 0,
translateX: 0,
nebulaOpacity: 0,
cameraY: 0.8,
near: 0.1,
far: 150,
}
}
if (phase === 'FOCUS') {
// Stronger isolation, per FOCUS LAW.
const focusX = selectedStar ? 50 - selectedStar.x : 0
const focusY = selectedStar ? 50 - selectedStar.y : 0
return {
scale: 2.5, // Zoom in more to isolate
translateY: focusY,
translateX: focusX,
background: '#010210',
starOpacity: 0.1, // Subordinate non-selected stars
vignette: 0.4, // Darken edges to create focus cone
homeOpacity: 0,
replayOpacity: 0,
orbScale: 0,
groundOpacity: 0,
nebulaOpacity: 0,
cameraY: 1.3,
near: 0.15,
far: 180,
}
}
// REPLAY Phase, per REPLAY LAW (immersive, not a panel).
return {
scale: 1,
translateY: 0,
background: '#000000',
starOpacity: 0, // Starfield is gone
vignette: 1.0, // Fully dark vignette for immersion
homeOpacity: 0,
replayOpacity: 1, // Replay environment takes over
orbScale: 0,
groundOpacity: 0,
nebulaOpacity: 0,
cameraY: 1.3,
near: 0.15,
far: 180,
}
}

export default function SpatialScene() {
const [state, dispatch] = useReducer(sceneReducer, {
phase: 'HOME',
selectedStarId: null,
inputLocked: false,
})
const [hoveredStarId, setHoveredStarId] = useState<string | null>(null)
const [transitionKind, setTransitionKind] = useState<TransitionKind>(null)
const [transitionProgress, setTransitionProgress] = useState(0)
const [replayVisible, setReplayVisible] = useState(false)
const [focusVisible, setFocusVisible] = useState(false)
const transitionFrameRef = useRef<number | null>(null)

const selectedStar = useMemo(
() => STAR_DATA.find((s) => s.id === state.selectedStarId) ?? null,
[state.selectedStarId]
)

const phaseForView: Phase = transitionKind === 'lifemapToHome' ? 'ASCENT' : state.phase

const camera = getCameraDirector(
transitionKind ? (transitionKind === 'lifemapToHome' ? 1 - transitionProgress : transitionProgress) : 0,
phaseForView,
selectedStar
)
const clampedCameraY = Math.max(0.45, Math.min(3.5, camera.cameraY ?? 0.8))
const clampedNear = Math.max(0.08, Math.min(0.25, camera.near ?? 0.1))
const clampedFar = Math.max(80, Math.min(220, camera.far ?? 150))

useEffect(() => {
const onKeyDown = (event: KeyboardEvent) => {
if (event.key !== 'Escape') return

if (state.phase === 'REPLAY') {
setReplayVisible(false)
dispatch({ type: 'ESC' })
} else if (state.phase === 'FOCUS') {
dispatch({ type: 'ESC' })
} else if (state.phase === 'LIFEMAP' || state.phase === 'ASCENT') {
setTransitionKind('lifemapToHome')
const start = performance.now()
const tick = (now: number) => {
const t = clamp01((now - start) / RETURN_HOME_MS)
setTransitionProgress(t)
if (t < 1) {
transitionFrameRef.current = requestAnimationFrame(tick)
} else {
setTransitionKind(null)
setTransitionProgress(0)
dispatch({ type: 'ESC' })
}
}
if (transitionFrameRef.current) cancelAnimationFrame(transitionFrameRef.current)
transitionFrameRef.current = requestAnimationFrame(tick)
}
}

window.addEventListener('keydown', onKeyDown)
return () => {
window.removeEventListener('keydown', onKeyDown)
if (transitionFrameRef.current) cancelAnimationFrame(transitionFrameRef.current)
}
}, [state.inputLocked, state.phase])

const startAscent = () => {
if (state.phase !== 'HOME' || state.inputLocked || transitionKind) return
dispatch({ type: 'START_ASCENT' })
setTransitionKind('homeToLifemap')
const start = performance.now()
const tick = (now: number) => {
const t = clamp01((now - start) / ASCENT_MS)
setTransitionProgress(t)
if (t < 1) {
transitionFrameRef.current = requestAnimationFrame(tick)
} else {
setTransitionKind(null)
setTransitionProgress(0)
dispatch({ type: 'COMPLETE_ASCENT' })
}
}
if (transitionFrameRef.current) cancelAnimationFrame(transitionFrameRef.current)
transitionFrameRef.current = requestAnimationFrame(tick)
}

const openFocus = (star: StarNode) => {
if (state.phase !== 'LIFEMAP' || state.inputLocked || transitionKind) return
setFocusVisible(false)
dispatch({ type: 'OPEN_FOCUS', starId: star.id })
setTimeout(() => setFocusVisible(true), FOCUS_ENTER_MS)
}

const openReplay = () => {
if (state.phase !== 'FOCUS' || state.inputLocked || !selectedStar) return
dispatch({ type: 'OPEN_REPLAY' })
setTimeout(() => setReplayVisible(true), REPLAY_ENTER_MS)
}

const showHome = phaseForView === 'HOME' || phaseForView === 'ASCENT'
const showField = phaseForView === 'LIFEMAP' || phaseForView === 'FOCUS' || phaseForView === 'ASCENT'

return (
<div
style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: camera.background, color: '#fff' }}
>
<div
style={{
position: 'absolute',
inset: 0,
transform: `translateY(${camera.translateY}%) translateX(${camera.translateX || 0}%) scale(${camera.scale})`,
transformOrigin: '50% 50%',
transition: transitionKind ? 'none' : 'transform 750ms ease-out, background 750ms ease-out',
}}
>
{/* HOME ENVIRONMENT: Restored to canon */}
{showHome && (
<>
{/* Sky click target - HOME LAW */}
<div
aria-label="Enter spatial field via sky"
onClick={startAscent}
style={{
position: 'absolute', left: 0, right: 0, top: 0, height: '60%',
cursor: state.phase === 'HOME' && !state.inputLocked ? 'pointer' : 'default',
background: 'linear-gradient(to bottom, #010541 0%, #020748 100%)',
opacity: camera.homeOpacity,
transition: 'opacity 400ms linear',
}}
/>
{/* Ground Plane - HOME LAW */}
<div
aria-hidden="true"
style={{
position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
background: 'linear-gradient(to top, #0a0a10, transparent)',
opacity: camera.groundOpacity,
transition: 'opacity 400ms linear',
}}
/>
{/* Anchored Orb - HOME LAW */}
<div
aria-hidden="true"
style={{
position: 'absolute', left: '50%', top: '85%', // Lowered orb
width: '100px', height: '100px', // Resized
borderRadius: '50%',
background: '#dddddf',
transform: `translate(-50%, -50%) scale(${camera.orbScale})`,
opacity: camera.homeOpacity,
transition: 'opacity 400ms linear, transform 400ms ease-out',
boxShadow: '0 0 0 1px rgba(255,255,255,0.02)',
}}
/>
</>
)}
{/* STARFIELD: Reworked for depth, per LIFEMAP LAW */}
{showField && (
<div style={{ position: 'absolute', inset: 0 }}>
  <Starfield3D
    stars={STAR_DATA}
    phase={state.phase}
    onSelect={(id) => dispatch({ type: 'OPEN_FOCUS', starId: id })}
    cameraY={clampedCameraY}
    cameraNear={clampedNear}
    cameraFar={clampedFar}
    streakIntensity={camera.starOpacity}
    nebulaReveal={camera.nebulaOpacity ?? 0}
  />
</div>
)}


{phaseForView === 'ASCENT' && (
<div aria-hidden="true" style={{position:'absolute',inset:0,opacity:camera.nebulaOpacity ?? 0,transition:'opacity 120ms linear',background:'radial-gradient(circle at 50% 40%, rgba(109,133,255,0.24) 0%, rgba(57,33,102,0.16) 28%, rgba(1,3,26,0.02) 64%, transparent 85%)',pointerEvents:'none'}} />
)}

{/* REPLAY ENVIRONMENT: Reworked to be immersive, per REPLAY LAW */}
{state.phase === 'REPLAY' && (
<div
aria-hidden={!replayVisible}
style={{
position: 'absolute',
inset: 0,
opacity: camera.replayOpacity,
transition: 'opacity 600ms ease-in',
background: 'radial-gradient(circle at 50% 50%, rgba(204,174,58,0.1) 0%, transparent 40%), #000',
}}
>
{/* Immersive content, not a panel. */}
<div
style={{
position: 'absolute',
top: '50%',
left: '50%',
transform: 'translate(-50%, -50%)',
textAlign: 'center',
color: '#f8f3dc',
fontFamily: 'ui-sans-serif, system-ui, -apple-system',
opacity: replayVisible ? 1 : 0,
transition: 'opacity 500ms ease-out',
}}
>
<p style={{ letterSpacing: '0.16em', fontSize: '0.8rem', margin: 0, textTransform: 'uppercase', opacity: 0.65 }}>Memory Trace</p>
<h2 style={{ margin: '0.45rem 0 0', fontWeight: 500, fontSize: '2rem', textShadow: '0 0 24px rgba(255,227,163,0.35)' }}>{selectedStar?.label}</h2>
</div>
</div>
)}

{state.phase === 'FOCUS' && selectedStar && (
<div
aria-hidden={!focusVisible}
style={{
position: 'absolute',
inset: 0,
pointerEvents: 'none',
opacity: focusVisible ? 1 : 0,
transition: 'opacity 500ms ease-out',
background:
'radial-gradient(circle at 50% 50%, rgba(137,177,255,0.2) 0%, rgba(66,98,177,0.1) 22%, rgba(0,0,0,0.45) 60%, rgba(0,0,0,0.75) 100%)',
}}
/>
)}
</div>

{/* Vignette Overlay */}
<div
aria-hidden="true"
style={{
position: 'absolute',
inset: 0,
boxShadow: `inset 0 0 180px rgba(0,0,0,${camera.vignette})`,
pointerEvents: 'none',
transition: 'box-shadow 750ms ease-out',
}}
/>
</div>
)
}
