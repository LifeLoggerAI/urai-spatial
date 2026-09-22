'use client'

import { Canvas } from '@react-three/fiber'
import { Environment, PerspectiveCamera } from '@react-three/drei'
import { useEffect, useMemo, useRef, useState } from 'react'
import RitualPlatform from '@/scene/RitualPlatform'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { requestUraiWorldReturn } from '@/spatial/world/worldEvents'
import { sacredUXDisclosure } from '@/spatial/companion/CompanionRitualTimingEngine'

type RitualPhase = 'invitation' | 'silence-before' | 'action' | 'silence-after' | 'complete'

const THRESHOLD_RITUAL = {
  id: 'threshold-small-ritual',
  title: 'Small Map Ritual',
  line: 'Only the next small light matters right now.',
  action: 'Keep the map small',
  silenceBeforeMs: 2600,
  silenceAfterMs: 2200,
} as const

function RitualWorld({ reducedMotion, reducedStimulation, active }: { reducedMotion: boolean; reducedStimulation: boolean; active: boolean }) {
  return <Canvas
    aria-hidden="true"
    dpr={[1, reducedStimulation ? 1.1 : 1.5]}
    gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
    style={{ position: 'absolute', inset: 0 }}
  >
    <color attach="background" args={['#05070d']} />
    <fog attach="fog" args={['#05070d', 8, 20]} />
    <PerspectiveCamera makeDefault position={[0, 3.15, 7.15]} fov={43} />
    <ambientLight intensity={reducedStimulation ? 0.18 : 0.28} color="#c9d4e2" />
    <hemisphereLight intensity={reducedStimulation ? 0.22 : 0.34} color="#dbeafe" groundColor="#11131a" />
    <directionalLight position={[-3, 6, 4]} intensity={reducedStimulation ? 0.5 : 0.82} color="#e9e5d4" />
    <pointLight position={[0, 2.1, -1.2]} intensity={active && !reducedStimulation ? 4.2 : 2.1} distance={8} color="#d8c48d" />
    <RitualPlatform reducedMotion={reducedMotion} reducedStimulation={reducedStimulation} reflectionMode={reducedStimulation ? 'off' : 'faked'} />
    <Environment preset="night" environmentIntensity={reducedStimulation ? 0.05 : 0.12} />
  </Canvas>
}

export default function RitualsClient() {
  const prefersReducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<RitualPhase>('invitation')
  const [reducedStimulation, setReducedStimulation] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  useEffect(() => clearTimer, [])

  const begin = () => {
    clearTimer()
    setPhase('silence-before')
    timerRef.current = setTimeout(() => setPhase('action'), THRESHOLD_RITUAL.silenceBeforeMs)
  }

  const act = () => {
    clearTimer()
    setPhase('silence-after')
    timerRef.current = setTimeout(() => setPhase('complete'), THRESHOLD_RITUAL.silenceAfterMs)
  }

  const cancel = () => {
    clearTimer()
    setPhase('invitation')
  }

  const phaseCopy = useMemo(() => {
    if (phase === 'invitation') return 'Nothing has been inferred about you. This quiet ritual begins only if you choose it.'
    if (phase === 'silence-before') return 'A brief intentional silence. No prompt is required.'
    if (phase === 'action') return THRESHOLD_RITUAL.line
    if (phase === 'silence-after') return 'Stay only as long as you want. The pause ends automatically.'
    return 'Complete. Return to the world exactly where you left it.'
  }, [phase])

  const active = phase !== 'invitation' && phase !== 'complete'

  return <main
    data-testid="urai-ritual-world"
    data-ritual-authority="urai-ref-ritual-001"
    data-ritual-id={THRESHOLD_RITUAL.id}
    data-ritual-phase={phase}
    data-ritual-truth="symbolic-user-started"
    data-voice-allowed="false"
    data-visual-bloom-allowed="false"
    style={{ position:'fixed', inset:0, overflow:'hidden', background:'#05070d', color:'#f4f2eb', fontFamily:'Inter,ui-sans-serif,system-ui' }}
  >
    <RitualWorld reducedMotion={prefersReducedMotion} reducedStimulation={reducedStimulation} active={active} />

    <section style={{ position:'absolute', left:'50%', bottom:'clamp(20px,6vh,70px)', transform:'translateX(-50%)', zIndex:20, width:'min(680px,calc(100vw - 32px))', padding:'clamp(20px,4vw,32px)', border:'1px solid rgba(220,228,240,.15)', borderRadius:28, background:'rgba(5,7,13,.72)', backdropFilter:'blur(18px)', boxShadow:'0 28px 80px rgba(0,0,0,.38)' }}>
      <p style={{ margin:0, fontSize:10, fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(222,228,238,.62)' }}>Ritual · optional symbolic moment</p>
      <h1 style={{ margin:'8px 0 0', fontSize:'clamp(30px,6vw,56px)', lineHeight:1, letterSpacing:'-.045em' }}>{THRESHOLD_RITUAL.title}</h1>
      <p role="status" aria-live="polite" style={{ margin:'14px 0 0', maxWidth:'54ch', fontSize:'clamp(15px,2.1vw,18px)', lineHeight:1.55, color:'rgba(244,242,235,.78)' }}>{phaseCopy}</p>
      <p style={{ margin:'10px 0 0', fontSize:12, lineHeight:1.5, color:'rgba(220,226,234,.55)' }}>{sacredUXDisclosure()}</p>

      <div style={{ display:'flex', flexWrap:'wrap', gap:9, marginTop:18 }}>
        {phase === 'invitation' || phase === 'complete' ? <button type="button" onClick={begin} style={{ minHeight:48, padding:'0 17px', borderRadius:999, border:0, fontWeight:800 }}>{phase === 'complete' ? 'Begin again' : 'Enter quietly'}</button> : null}
        {phase === 'action' ? <button type="button" onClick={act} style={{ minHeight:48, padding:'0 17px', borderRadius:999, border:0, fontWeight:800 }}>{THRESHOLD_RITUAL.action}</button> : null}
        {active ? <button type="button" onClick={cancel} style={{ minHeight:48, padding:'0 17px', borderRadius:999, border:'1px solid rgba(255,255,255,.18)', background:'rgba(15,18,25,.74)', color:'inherit', fontWeight:750 }}>Cancel ritual</button> : null}
        <button type="button" onClick={requestUraiWorldReturn} style={{ minHeight:48, padding:'0 17px', borderRadius:999, border:'1px solid rgba(255,255,255,.18)', background:'rgba(15,18,25,.74)', color:'inherit', fontWeight:750 }}>Return to origin</button>
      </div>

      <label style={{ display:'flex', gap:9, alignItems:'center', marginTop:16, fontSize:13, color:'rgba(232,236,242,.7)' }}>
        <input type="checkbox" checked={reducedStimulation} onChange={event => setReducedStimulation(event.target.checked)} />
        Reduced stimulation
      </label>
    </section>

    <p className="sr-only">This ritual is user-started symbolic interface behavior. It is not a religious, supernatural, diagnostic, predictive, or clinical claim.</p>
  </main>
}
