'use client'

import type { CSSProperties } from 'react'

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

const phaseCopy: Record<AscentPhase, { label: string; status: string }> = {
  idle: { label: 'Life Map ready', status: 'Waiting for entry' },
  homeExiting: { label: 'Opening your Life Map.', status: 'Leaving home field' },
  ascentOpening: { label: 'Opening your Life Map.', status: 'Gathering remembered moments' },
  ascentRevealing: { label: 'Your Life Map is forming.', status: 'Memories are becoming constellations' },
  waitingForLifeMap: { label: 'Your Life Map is forming.', status: 'Waiting for the constellation to finish loading' },
  lifemapReady: { label: 'Life Map ready.', status: 'Constellation settled' },
  error: { label: 'Life Map could not open.', status: 'The constellation is unavailable' },
}

const shellStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 40,
  overflow: 'hidden',
  pointerEvents: 'auto',
  color: '#f8fbff',
  background: 'radial-gradient(circle at 50% 42%, rgba(103,232,249,.24), transparent 24%), radial-gradient(circle at 38% 26%, rgba(99,102,241,.22), transparent 33%), linear-gradient(180deg,#020617 0%,#050816 52%,#02030b 100%)',
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
  background: 'radial-gradient(circle at 50% 48%,#f8fbff 0%,#67e8f9 26%,#8b5cf6 64%,rgba(30,27,75,.1) 100%)',
  boxShadow: '0 0 72px rgba(103,232,249,.76),0 0 160px rgba(139,92,246,.36)',
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

export function AscentOverlay({ phase, dataStatus, reducedMotion }: AscentOverlayProps) {
  if (phase === 'idle' || phase === 'lifemapReady') return null

  const copy = phaseCopy[phase]
  const status = phase === 'error' || dataStatus === 'error' ? phaseCopy.error.status : copy.status
  const opacity = reducedMotion ? 0.92 : 1

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
      <div style={{ ...ringBase, width: 'min(72vw,760px)', height: 'min(72vw,760px)' }} aria-hidden="true" />
      <div style={{ ...ringBase, width: 'min(48vw,520px)', height: 'min(48vw,520px)', borderColor: 'rgba(167,139,250,.26)' }} aria-hidden="true" />
      <div style={{ ...ringBase, width: 'min(28vw,310px)', height: 'min(28vw,310px)', borderColor: 'rgba(125,211,252,.28)' }} aria-hidden="true" />
      <div style={orbStyle} aria-hidden="true" />

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
