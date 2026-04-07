
'use client'

import * as React from 'react'

type Phase = 'home' | 'lifemap' | 'focus' | 'replay'

type NarratorOverlayProps = {
  phase: Phase
  selectedStarId?: string | null
}

function getNarratorCopy(phase: Phase, selectedStarId?: string | null): string {
  if (phase === 'home') return 'The system is already here.'
  if (phase === 'lifemap') return 'You are inside your map.'
  if (phase === 'focus') return selectedStarId ? 'One node overrides the field.' : 'The field collapses toward a single point.'
  if (phase === 'replay') return 'Context narrows. You are no longer observing.'
  return ''
}

export default function NarratorOverlay({
  phase,
  selectedStarId = null,
}: NarratorOverlayProps) {
  const copy = React.useMemo(() => getNarratorCopy(phase, selectedStarId), [phase, selectedStarId])
  const fadeIn = 1

  if (!copy) return null

  return (
    <div
      aria-live="polite"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 42,
        transform: 'translateX(-50%)',
        pointerEvents: 'none',
        zIndex: 30,
        width: 'min(820px, calc(100vw - 48px))',
        textAlign: 'center',
        opacity: fadeIn,
        transition: 'opacity 240ms ease',
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '12px 16px',
          borderRadius: 14,
          background: 'rgba(0,0,0,0.30)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          color: 'rgba(255,255,255,0.92)',
          fontSize: 14,
          lineHeight: 1.45,
          letterSpacing: '0.01em',
          textShadow: '0 1px 8px rgba(0,0,0,0.35)',
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
        }}
      >
        {copy}
      </div>

      <div
        style={{
          position: 'fixed',
          right: 20,
          bottom: 20,
          fontSize: 10,
          opacity: 0.25,
          color: 'rgba(255,255,255,0.92)',
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          pointerEvents: 'none',
        }}
      >
        urai.app
      </div>
    </div>
  )
}
