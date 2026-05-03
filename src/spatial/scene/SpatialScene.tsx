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

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
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

type SceneState = {
phase: Phase
selectedStarId: string | null
inputLocked: boolean
}

type SceneAction =
| { type: 'START_ASCENT' }
| { type: 'COMPLETE_ASCENT' }
| { type: 'OPEN_FOCUS'; starId: string }
| { type: 'OPEN_REPLAY' }
| { type: 'ESC' }

const ASCENT_MS = 2200
const RETURN_HOME_MS = 1600
const REPLAY_ENTER_MS = 750
const FOCUS_ENTER_MS = 520

// CANON COMPLIANCE: Star data now includes a 'z' index for depth layering.
const STAR_DATA: StarNode[] = [
{ id: 'star_1', x: 24, y: 29, z: 0, size: 14, memoryRef: 'memory_ref_star_1', label: 'Threshold' },
{ id: 'star_2', x: 40, y: 21, z: 1, size: 12, memoryRef: 'memory_ref_star_2', label: 'Signal' },
{ id: 'star_3', x: 58, y: 34, z: 0, size: 13, memoryRef: 'memory_ref_star_3', label: 'Echo' },
{ id: 'star_4', x: 70, y: 58, z: 2, size: 11, memoryRef: 'memory_ref_star_4', label: 'Memory' },
{ id: 'star_5', x: 28, y: 60, z: 1, size: 12, memoryRef: 'memory_ref_star_5', label: 'Return' },
]

// REDUCER: Single source of truth for phase state. Complies with AUTHORITY LAW.
function validateTransition(state: SceneState, action: SceneAction): boolean {
switch (action.type) {
case 'START_ASCENT':
return state.phase === 'HOME' && !state.inputLocked
case 'COMPLETE_ASCENT':
return state.phase === 'ASCENT'
case 'OPEN_FOCUS':
return state.phase === 'LIFEMAP' && !!action.starId && !state.inputLocked
case 'OPEN_REPLAY':
return state.phase === 'FOCUS' && !!state.selectedStarId && !state.inputLocked
case 'ESC':
return state.phase === 'REPLAY' || state.phase === 'FOCUS' || state.phase === 'LIFEMAP'
default:
return false
}
}

function sceneReducer(state: SceneState, action: SceneAction): SceneState {
if (!validateTransition(state, action)) return state

switch (action.type) {
case 'START_ASCENT':
return { ...state, phase: 'ASCENT', inputLocked: true }
case 'COMPLETE_ASCENT':
return { ...state, phase: 'LIFEMAP', inputLocked: false }
case 'OPEN_FOCUS':
return { ...state, phase: 'FOCUS', selectedStarId: action.starId, inputLocked: false }
case 'OPEN_REPLAY':
return { ...state, phase: 'REPLAY', inputLocked: true }
case 'ESC':
if (state.phase === 'REPLAY') return { ...state, phase: 'FOCUS', inputLocked: false }
if (state.phase === 'FOCUS') return { ...state, phase: 'LIFEMAP', selectedStarId: state.selectedStarId, inputLocked: false }
return { phase: 'HOME', selectedStarId: null, inputLocked: false }
default:
return state
}
}

function clamp01(v: number) {
return Math.max(0, Math.min(1, v))
}

function easeInOutCubic(t: number) {
return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// CAMERA_DIRECTOR: Single writer for camera state. Complies with AUTHORITY LAW.
// Values updated to enforce visual canon for all phases.
function getCameraDirector(progress: number, phase: Phase, selectedStarId: StarNode | null) {
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
}
}
if (phase === 'ASCENT') {
// Enhanced cinematic departure, per ASCENT LAW.
return {
scale: 1 + e * 0.8,
translateY: e * -25, // Stronger lift to show ground severance
background: '#020748',
starOpacity: e * 0.7, // Stars fade in during ascent
vignette: 0.1 + e * 0.1,
homeOpacity: 1 - e, // Home elements (orb, ground) fade out
replayOpacity: 0,
orbScale: 1 - e * 0.5,
groundOpacity: 1 - e,
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
const [hasInteracted, setHasInteracted] = useState(false)
const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)
const [focusedControl, setFocusedControl] = useState<string | null>(null)
const transitionFrameRef = useRef<number | null>(null)

useEffect(() => {
const media = window.matchMedia('(prefers-reduced-motion: reduce)')
const update = () => setPrefersReducedMotion(media.matches)
update()
media.addEventListener('change', update)
return () => media.removeEventListener('change', update)
}, [])

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

useEffect(() => {
const onKeyDown = (event: KeyboardEvent) => {
if (event.key !== 'Escape' || state.inputLocked) return

if (state.phase === 'REPLAY') {
setReplayVisible(false)
dispatch({ type: 'ESC' })
} else if (state.phase === 'FOCUS') {
dispatch({ type: 'ESC' })
} else if (state.phase === 'LIFEMAP') {
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
setHasInteracted(true)
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
setHasInteracted(true)
setFocusVisible(false)
dispatch({ type: 'OPEN_FOCUS', starId: star.id })
setTimeout(() => setFocusVisible(true), prefersReducedMotion ? 0 : FOCUS_ENTER_MS)
}

const openReplay = () => {
if (state.phase !== 'FOCUS' || state.inputLocked || !selectedStar) return
setHasInteracted(true)
dispatch({ type: 'OPEN_REPLAY' })
setTimeout(() => setReplayVisible(true), prefersReducedMotion ? 0 : REPLAY_ENTER_MS)
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
transition: transitionKind ? 'none' : (prefersReducedMotion ? 'none' : 'transform 750ms ease-out, background 750ms ease-out'),
}}
>
{/* HOME ENVIRONMENT: Restored to canon */}
{showHome && (
<>
{/* Sky click target - HOME LAW */}
<button
type="button"
aria-label="Enter spatial field via sky"
onClick={startAscent}
onFocus={() => setFocusedControl('sky')}
onBlur={() => setFocusedControl(null)}
style={{
position: 'absolute', left: 0, right: 0, top: 0, height: '60%',
cursor: state.phase === 'HOME' && !state.inputLocked ? 'pointer' : 'default',
background: 'linear-gradient(to bottom, #010541 0%, #020748 100%)',
opacity: camera.homeOpacity,
transition: prefersReducedMotion ? 'none' : 'opacity 400ms linear',
border: 'none',
padding: 0,
outline: focusedControl === 'sky' ? '3px solid rgba(159,215,255,0.95)' : 'none',
outlineOffset: '-4px',
}}
/>
{/* Ground Plane - HOME LAW */}
<div
aria-hidden="true"
style={{
position: 'absolute', left: 0, right: 0, bottom: 0, height: '40%',
background: 'linear-gradient(to top, #0a0a10, transparent)',
opacity: camera.groundOpacity,
transition: prefersReducedMotion ? 'none' : 'opacity 400ms linear',
}}
/>
{/* Anchored Orb - HOME LAW */}
<button
type="button"
aria-label="Enter spatial field via orb"
onClick={startAscent}
onFocus={() => setFocusedControl('orb')}
onBlur={() => setFocusedControl(null)}
style={{
position: 'absolute', left: '50%', top: '85%', // Lowered orb
width: '100px', height: '100px', // Resized
borderRadius: '50%',
background: '#dddddf',
transform: `translate(-50%, -50%) scale(${camera.orbScale})`,
opacity: camera.homeOpacity,
transition: prefersReducedMotion ? 'none' : 'opacity 400ms linear, transform 400ms ease-out',
boxShadow: '0 0 0 1px rgba(255,255,255,0.02)',
border: 'none',
cursor: state.phase === 'HOME' && !state.inputLocked ? 'pointer' : 'default',
outline: focusedControl === 'orb' ? '3px solid #9fd7ff' : '2px solid transparent',
outlineOffset: '4px',
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
    onSelect={(id) => {
      const star = STAR_DATA.find((s) => s.id === id)
      if (star) openFocus(star)
    }}
  />
</div>
)}

<div
style={{
position: 'absolute',
top: hasInteracted ? '0.9rem' : '1.8rem',
left: '50%',
transform: 'translateX(-50%)',
opacity: hasInteracted ? 0.52 : 1,
padding: hasInteracted ? '0.45rem 0.8rem' : '0.9rem 1.2rem',
borderRadius: '14px',
backdropFilter: 'blur(8px)',
background: 'rgba(5, 10, 25, 0.72)',
border: '1px solid rgba(255,255,255,0.22)',
textAlign: 'center',
maxWidth: '90vw',
transition: prefersReducedMotion ? 'none' : 'all 450ms ease-out',
pointerEvents: 'none',
}}
>
<h1 style={{ margin: 0, fontSize: hasInteracted ? '1.24rem' : '1.5rem', fontWeight: 600, letterSpacing: '0.02em' }}>URAI Spatial Life Map</h1>
<p style={{ margin: '0.35rem 0 0', fontSize: hasInteracted ? '0.95rem' : '1.08rem', opacity: 0.88 }}>A living map of memory, mood, and reflection.</p>
</div>


{(state.phase === 'LIFEMAP' || state.phase === 'FOCUS') && (
<div style={{ position: 'absolute', right: '0.9rem', bottom: '3.1rem', display: 'flex', gap: '0.42rem', flexWrap: 'wrap', maxWidth: '18rem' }}>
  {STAR_DATA.map((star) => (
    <button
      key={star.id}
      type="button"
      onClick={() => openFocus(star)}
      onFocus={() => setFocusedControl(star.id)}
      onBlur={() => setFocusedControl(null)}
      style={{
        fontSize: '0.9rem',
        borderRadius: '999px',
        border: focusedControl === star.id ? '2px solid #9fd7ff' : '1px solid rgba(255,255,255,0.28)',
        background: 'rgba(8, 13, 28, 0.66)',
        color: '#f6fbff',
        padding: '0.3rem 0.65rem',
        cursor: 'pointer',
      }}
      aria-label={`Focus star ${star.label}`}
    >
      ✦ {star.label}
    </button>
  ))}
</div>
)}
<p style={{ position: 'absolute', bottom: '0.9rem', left: '50%', transform: 'translateX(-50%)', margin: 0, fontSize: '0.92rem', opacity: 0.84, background: 'rgba(7, 10, 22, 0.62)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', padding: '0.35rem 0.8rem', backdropFilter: 'blur(5px)' }}>
  Your memories stay private. You control what is saved, replayed, or exported.
</p>

{/* REPLAY ENVIRONMENT: Reworked to be immersive, per REPLAY LAW */}
{state.phase === 'REPLAY' && (
<div
aria-hidden={!replayVisible}
style={{
position: 'absolute',
inset: 0,
opacity: camera.replayOpacity,
transition: prefersReducedMotion ? 'none' : 'opacity 600ms ease-in',
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
border: '1px solid rgba(255,255,255,0.26)',
background: 'rgba(9, 12, 24, 0.65)',
padding: '1rem 1.3rem',
borderRadius: '14px',
backdropFilter: 'blur(10px)',
}}
>
<p style={{ letterSpacing: '0.16em', fontSize: '0.95rem', margin: 0, textTransform: 'uppercase', opacity: 0.8 }}>Memory Trace</p>
<h2 style={{ margin: '0.45rem 0 0', fontWeight: 600, fontSize: '2.35rem', textShadow: '0 0 24px rgba(255,227,163,0.35)' }}>{selectedStar?.label}</h2>
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

{state.phase === 'FOCUS' && selectedStar && (
<div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(6, 10, 22, 0.74)', border: '1px solid rgba(255,255,255,0.24)', borderRadius: '12px', backdropFilter: 'blur(8px)', padding: '0.8rem 0.95rem', maxWidth: '18rem' }}>
  <p style={{ margin: 0, fontSize: '0.95rem', letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.78 }}>Focus</p>
  <h3 style={{ margin: '0.2rem 0 0', fontSize: '1.35rem' }}>{selectedStar.label}</h3>
</div>
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
