'use client'
import Starfield3D from '@/spatial/components/Starfield3D'
import React, { useEffect, useMemo, useReducer, useRef, useState } from 'react'

type Phase = 'HOME' | 'ASCENT' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
type StarNode = { id: string; x: number; y: number; z: number; size: number; label: string; tone: string }
type SceneState = { phase: Phase; selectedStarId: string | null; inputLocked: boolean }
type SceneAction = { type: 'START_ASCENT' } | { type: 'COMPLETE_ASCENT' } | { type: 'OPEN_FOCUS'; starId: string } | { type: 'OPEN_REPLAY' } | { type: 'ESC' }

const publicDemoMode = true
const recordingMode = false
const ASCENT_MS = 2200
const RETURN_HOME_MS = 1600

const MAJOR_STARS: StarNode[] = [
  { id: 'charged', x: 24, y: 29, z: 0, size: 14, label: 'Charged Memory', tone: 'tense' },
  { id: 'recovery', x: 40, y: 21, z: 1, size: 13, label: 'Recovery Signal', tone: 'recovery' },
  { id: 'relationship', x: 58, y: 34, z: 0, size: 13, label: 'Relationship Echo', tone: 'relationship' },
  { id: 'focus', x: 70, y: 58, z: 2, size: 12, label: 'Focus Thread', tone: 'focus' },
  { id: 'joy', x: 28, y: 60, z: 1, size: 14, label: 'Joy Marker', tone: 'joy' },
  { id: 'quiet', x: 52, y: 67, z: 2, size: 12, label: 'Quiet Shift', tone: 'neutral' },
]

function sceneReducer(state: SceneState, action: SceneAction): SceneState {
  switch (action.type) {
    case 'START_ASCENT': return state.phase === 'HOME' ? { ...state, phase: 'ASCENT', inputLocked: true } : state
    case 'COMPLETE_ASCENT': return state.phase === 'ASCENT' ? { ...state, phase: 'LIFEMAP', inputLocked: false } : state
    case 'OPEN_FOCUS': return state.phase === 'LIFEMAP' ? { ...state, phase: 'FOCUS', selectedStarId: action.starId } : state
    case 'OPEN_REPLAY': return state.phase === 'FOCUS' ? { ...state, phase: 'REPLAY' } : state
    case 'ESC':
      if (state.phase === 'REPLAY') return { ...state, phase: 'FOCUS' }
      if (state.phase === 'FOCUS') return { ...state, phase: 'LIFEMAP' }
      if (state.phase === 'LIFEMAP') return { phase: 'HOME', selectedStarId: null, inputLocked: false }
      return state
  }
}

export default function SpatialScene() {
  const [state, dispatch] = useReducer(sceneReducer, { phase: 'HOME', selectedStarId: null, inputLocked: false })
  const [openingVisible, setOpeningVisible] = useState(true)
  const [statusToast, setStatusToast] = useState('')
  const [pulse, setPulse] = useState(false)
  const transitionFrameRef = useRef<number | null>(null)
  const selectedStar = useMemo(() => MAJOR_STARS.find((s) => s.id === state.selectedStarId) ?? null, [state.selectedStarId])

  useEffect(() => {
    const t = setTimeout(() => setOpeningVisible(false), 3000)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'ESC' })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const startAscent = () => {
    if (state.phase !== 'HOME') return
    setPulse(true)
    setOpeningVisible(false)
    setTimeout(() => {
      dispatch({ type: 'START_ASCENT' })
      const start = performance.now()
      const tick = (now: number) => {
        if (now - start < ASCENT_MS) transitionFrameRef.current = requestAnimationFrame(tick)
        else dispatch({ type: 'COMPLETE_ASCENT' })
      }
      transitionFrameRef.current = requestAnimationFrame(tick)
    }, 360)
  }

  const openReplay = () => dispatch({ type: 'OPEN_REPLAY' })
  const completeReplay = () => {
    setStatusToast('Replay complete. Pattern saved to your Life Map.')
    dispatch({ type: 'ESC' })
    setTimeout(() => setStatusToast(''), 1500)
  }

  return <div style={{ position: 'fixed', inset: 0, color: '#F4EDFF', background: 'radial-gradient(circle at 50% 20%, #3b2168 0%, #160a29 42%, #05040c 100%)' }}>
    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(168,129,255,0.2), transparent 40%)' }} />
    <div style={{ position: 'absolute', inset: 0, opacity: state.phase === 'HOME' ? 1 : 0.7 }}>
      <Starfield3D stars={Array.from({ length: 40 }, (_, i) => ({ id: `bg-${i}`, x: (i * 37) % 100, y: (i * 17) % 100, z: i % 4 }))} phase={state.phase} />
      <Starfield3D stars={MAJOR_STARS} phase={state.phase} onSelect={(id) => dispatch({ type: 'OPEN_FOCUS', starId: id })} />
    </div>

    {state.phase === 'HOME' && <button aria-label='Open Life Map' onClick={startAscent} style={{ position: 'absolute', left: '50%', top: '70%', width: 132, height: 132, borderRadius: '50%', border: '1px solid rgba(212,187,255,.7)', background: pulse ? 'radial-gradient(circle,#f2e8ff 0,#9e6dff 45%,#4d2b84 100%)' : 'radial-gradient(circle,#c7adff 0,#7b4bcc 50%,#31144e 100%)', transform: `translate(-50%, -50%) scale(${pulse ? 1.08 : 1})`, boxShadow: '0 0 80px rgba(141,97,255,0.55)', cursor: 'pointer' }} />}

    {openingVisible && <div style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', background: 'rgba(7,6,16,.55)', backdropFilter: 'blur(8px)', padding: '16px 22px', borderRadius: 14 }}><h1 style={{ margin: 0, fontSize: 36 }}>URAI Spatial Life Map</h1><p style={{ margin: '8px 0 0', fontSize: 20 }}>A living map of memory, mood, and reflection.</p></div>}

    <div style={{ position: 'absolute', bottom: 26, left: 24, fontSize: 18, background: 'rgba(5,4,14,.65)', padding: '10px 12px', borderRadius: 10 }}>Open Life Map · Select a memory · Press Esc to return</div>

    {state.phase === 'FOCUS' && selectedStar && <div style={{ position: 'absolute', right: 20, top: 20, width: 400, background: 'rgba(8,8,20,.78)', border: '1px solid rgba(191,164,255,.5)', borderRadius: 14, padding: 18 }}>
      <h2 style={{ margin: 0 }}>Selected memory</h2><p>{selectedStar.label} · {selectedStar.tone}</p><p>A recurring memory pattern appeared.</p>
      <button onClick={openReplay}>Replay gently</button>
    </div>}

    {state.phase === 'REPLAY' && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'radial-gradient(circle at 50% 50%, rgba(180,140,255,.2) 0%, rgba(0,0,0,.9) 65%)' }}>
      <div style={{ width: 220, height: 220, borderRadius: '50%', border: '10px solid rgba(168,123,255,.7)', boxShadow: '0 0 80px rgba(130,84,255,.7)' }} />
      <div style={{ position: 'absolute', bottom: 80, textAlign: 'center' }}><p>This replay is emotionally weighted. URAI will slow the pace.</p><button onClick={completeReplay}>Finish replay</button></div>
    </div>}

    {statusToast && <div style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(31,18,58,.9)', padding: '10px 14px', borderRadius: 10 }}>{statusToast}</div>}

    <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 12, opacity: 0.85 }}>Your memories stay private. You control what is saved, replayed, or exported.</div>
    {!publicDemoMode && !recordingMode && <div>internal</div>}
  </div>
}
