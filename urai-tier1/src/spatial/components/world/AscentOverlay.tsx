'use client'

import { useMemo, type CSSProperties } from 'react'

export type AscentPhase =
  | 'idle'
  | 'homeExiting'
  | 'ascentOpening'
  | 'ascentRevealing'
  | 'waitingForLifeMap'
  | 'lifemapReady'
  | 'error'

export type LifeMapDataStatus = 'idle' | 'loading' | 'ready' | 'empty' | 'error'

type AscentOverlayProps = {
  phase: AscentPhase
  dataStatus: LifeMapDataStatus
  reducedMotion: boolean
}

type AscentParticle = {
  left: string
  top: string
  size: number
  opacity: number
  delay: string
}

const phaseCopy: Record<AscentPhase, { label: string; status: string }> = {
  idle: { label: 'Life Map ready', status: 'Waiting for entry' },
  homeExiting: { label: 'Opening your Life Map.', status: 'Leaving home field' },
  ascentOpening: { label: 'Opening your Life Map.', status: 'Gathering remembered moments' },
  ascentRevealing: { label: 'Your Life Map is forming.', status: 'Memories are becoming constellations' },
  waitingForLifeMap: { label: 'Your Life Map is forming.', status: 'Waiting for the constellation to finish loading' },
  lifemapReady: { label: 'Life Map ready.', status: 'Constellation settled' },
  error: { label: 'Life Map could not open.', status: 'The constellation is unavailable' },
}

const PHASE_INTENSITY: Record<AscentPhase, number> = {
  idle: 0,
  homeExiting: 0.72,
  ascentOpening: 0.86,
  ascentRevealing: 1,
  waitingForLifeMap: 0.94,
  lifemapReady: 0,
  error: 0.58,
}

const shellStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 40,
  overflow: 'hidden',
  pointerEvents: 'auto',
  color: '#f8fbff',
  background:
    'radial-gradient(circle at 50% 42%, rgba(103,232,249,.24), transparent 24%), radial-gradient(circle at 38% 26%, rgba(99,102,241,.22), transparent 33%), linear-gradient(180deg,#020617 0%,#050816 52%,#02030b 100%)',
}

const atmosphereStyle: CSSProperties = {
  position: 'absolute',
  inset: '-18%',
  background:
    'radial-gradient(circle at 50% 42%, rgba(186,230,253,.18), transparent 18%), radial-gradient(circle at 68% 56%, rgba(139,92,246,.16), transparent 28%), radial-gradient(circle at 22% 68%, rgba(45,212,191,.13), transparent 30%)',
  filter: 'blur(2px)',
}

const ringBase: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '45%',
  borderRadius: 9999,
  transform: 'translate(-50%, -50%)',
  border: '1px solid rgba(147,197,253,.22)',
  boxShadow: '0 0 56px rgba(103,232,249,.08), inset 0 0 28px rgba(103,232,249,.08)',
}

const orbStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  top: '45%',
  width: 'min(16vw, 150px)',
  height: 'min(16vw, 150px)',
  minWidth: 96,
  minHeight: 96,
  borderRadius: 9999,
  transform: 'translate(-50%, -50%)',
  background: 'radial-gradient(circle at 35% 28%, #ffffff 0%, #dff8ff 18%, #67e8f9 34%, #8b5cf6 67%, rgba(30,27,75,.12) 100%)',
  boxShadow: '0 0 72px rgba(103,232,249,.76), 0 0 160px rgba(139,92,246,.36), inset -18px -24px 42px rgba(15,23,42,.32)',
}

const copyStyle: CSSProperties = {
  position: 'absolute',
  left: 'max(22px, env(safe-area-inset-left))',
  top: 'max(22px, env(safe-area-inset-top))',
  width: 'min(390px, calc(100vw - 44px))',
  border: '1px solid rgba(160,220,255,.18)',
  borderRadius: 28,
  background: 'rgba(8,18,40,.58)',
  padding: 22,
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,.08), 0 24px 90px rgba(0,0,0,.28)',
  backdropFilter: 'blur(18px)',
}

const statusStyle: CSSProperties = {
  position: 'absolute',
  left: '50%',
  bottom: 'max(28px, env(safe-area-inset-bottom))',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 10,
  maxWidth: 'calc(100vw - 32px)',
  transform: 'translateX(-50%)',
  border: '1px solid rgba(160,220,255,.18)',
  borderRadius: 999,
  background: 'rgba(8,18,40,.58)',
  padding: '10px 14px',
  whiteSpace: 'nowrap',
  backdropFilter: 'blur(18px)',
}

function buildParticles(): AscentParticle[] {
  return Array.from({ length: 34 }, (_, index) => {
    const lane = index % 9
    const row = Math.floor(index / 9)
    return {
      left: `${8 + lane * 10.6 + ((index * 7) % 5)}%`,
      top: `${16 + row * 17 + ((index * 11) % 9)}%`,
      size: 1.8 + (index % 4) * 0.7,
      opacity: 0.28 + (index % 5) * 0.08,
      delay: `${index * 80}ms`,
    }
  })
}

export function AscentOverlay({ phase, dataStatus, reducedMotion }: AscentOverlayProps) {
  const particles = useMemo(buildParticles, [])

  if (phase === 'idle' || phase === 'lifemapReady') return null

  const copy = phaseCopy[phase]
  const status = phase === 'error' || dataStatus === 'error' ? phaseCopy.error.status : copy.status
  const intensity = PHASE_INTENSITY[phase]
  const opacity = reducedMotion ? 0.94 : 1
  const phaseScale = phase === 'ascentRevealing' ? 1.04 : phase === 'waitingForLifeMap' ? 1.02 : 1
  const revealOpacity = phase === 'ascentRevealing' || phase === 'waitingForLifeMap' ? 0.22 : 0.1

  return (
    <section
      aria-label="Life Map opening transition"
      aria-live="polite"
      role="status"
      data-testid="urai-ascent-cover"
      data-ascent-phase={phase}
      data-lifemap-data-status={dataStatus}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{ ...shellStyle, opacity }}
    >
      <div style={{ ...atmosphereStyle, opacity: 0.72 + intensity * 0.2 }} aria-hidden="true" />

      <svg viewBox="0 0 100 100" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.28 + intensity * 0.22 }}>
        <path d="M18 70 C 35 42, 52 66, 82 28" fill="none" stroke="rgba(147,197,253,.5)" strokeWidth="0.12" />
        <path d="M14 38 C 34 52, 48 20, 76 58" fill="none" stroke="rgba(45,212,191,.38)" strokeWidth="0.1" />
        <path d="M24 82 C 44 56, 58 78, 88 48" fill="none" stroke="rgba(167,139,250,.42)" strokeWidth="0.1" />
      </svg>

      {particles.map((particle, index) => (
        <span
          key={index}
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: particle.left,
            top: particle.top,
            width: particle.size,
            height: particle.size,
            borderRadius: 999,
            background: '#e0f7ff',
            opacity: reducedMotion ? particle.opacity * 0.6 : particle.opacity,
            boxShadow: '0 0 12px rgba(186,230,253,.9)',
            transform: `translate3d(0, ${reducedMotion ? 0 : -10 * intensity}px, 0)`,
            transition: reducedMotion ? 'none' : `transform 900ms ease ${particle.delay}, opacity 900ms ease ${particle.delay}`,
          }}
        />
      ))}

      <div style={{ ...ringBase, width: 'min(76vw, 820px)', height: 'min(76vw, 820px)', opacity: 0.18 + intensity * 0.28, transform: `translate(-50%, -50%) scale(${phaseScale})` }} aria-hidden="true" />
      <div style={{ ...ringBase, width: 'min(52vw, 560px)', height: 'min(52vw, 560px)', borderColor: 'rgba(167,139,250,.3)', opacity: 0.24 + intensity * 0.34, transform: `translate(-50%, -50%) rotate(12deg) scale(${phaseScale})` }} aria-hidden="true" />
      <div style={{ ...ringBase, width: 'min(30vw, 330px)', height: 'min(30vw, 330px)', borderColor: 'rgba(125,211,252,.32)', opacity: 0.34 + intensity * 0.4 }} aria-hidden="true" />
      <div style={{ ...orbStyle, transform: `translate(-50%, -50%) scale(${phaseScale})` }} aria-hidden="true" />
      <div style={{ position: 'absolute', left: '50%', top: '45%', width: 'min(24vw, 260px)', height: 'min(24vw, 260px)', transform: 'translate(-50%, -50%)', borderRadius: 999, background: 'radial-gradient(circle, rgba(255,255,255,.2), transparent 62%)', opacity: revealOpacity }} aria-hidden="true" />

      <div style={copyStyle}>
        <p style={{ margin: '0 0 9px', color: 'rgba(168,223,255,.88)', fontSize: 11, fontWeight: 800, letterSpacing: '.22em', textTransform: 'uppercase' }}>Opening Life Map</p>
        <h1 style={{ margin: 0, fontSize: 'clamp(28px,4vw,42px)', lineHeight: 0.98, letterSpacing: '-.04em' }}>{copy.label}</h1>
        <span style={{ display: 'block', marginTop: 13, color: 'rgba(235,244,255,.82)', fontSize: 14, lineHeight: 1.45 }}>Gathering remembered moments into constellation.</span>
      </div>

      <div style={statusStyle}>
        <span style={{ width: 8, height: 8, flex: '0 0 auto', borderRadius: 999, background: '#67e8f9', boxShadow: '0 0 18px rgba(103,232,249,.9)' }} aria-hidden="true" />
        <strong style={{ overflow: 'hidden', textOverflow: 'ellipsis', fontSize: 11, letterSpacing: '.13em', textTransform: 'uppercase' }}>{status}</strong>
      </div>
    </section>
  )
}

export default AscentOverlay
