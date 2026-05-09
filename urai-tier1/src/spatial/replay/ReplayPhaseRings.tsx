'use client'

import { REPLAY_SEGMENTS, ReplaySegmentDefinition } from '../scene/replayState'

export function ReplayPhaseRings({
  activeSegment,
  progressPercent,
  reducedMotion,
}: {
  activeSegment: ReplaySegmentDefinition
  progressPercent: number
  reducedMotion: boolean
}) {
  return (
    <div
      data-testid="urai-replay-phase-rings"
      aria-label={`Replay scene, ${activeSegment.label} phase`}
      style={{
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: 'min(58vw, 620px)',
        aspectRatio: '1',
        transform: 'translate(-50%, -50%)',
        borderRadius: 999,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: '15%',
          borderRadius: 999,
          background: 'radial-gradient(circle at 38% 32%, rgba(255,255,255,0.96), rgba(103,232,249,0.58) 22%, rgba(139,92,246,0.42) 48%, transparent 72%)',
          filter: 'blur(0.3px)',
          boxShadow: '0 0 72px rgba(103,232,249,0.38), 0 0 160px rgba(139,92,246,0.28)',
          opacity: 0.9,
        }}
      />
      {REPLAY_SEGMENTS.map((segment, index) => {
        const isActive = segment.id === activeSegment.id
        const inset = 4 + index * 9
        return (
          <div
            key={segment.id}
            style={{
              position: 'absolute',
              inset: `${inset}%`,
              borderRadius: 999,
              border: `1px solid ${isActive ? 'rgba(224,247,255,0.76)' : 'rgba(142,220,255,0.18)'}`,
              boxShadow: isActive ? '0 0 38px rgba(103,232,249,0.26), inset 0 0 36px rgba(139,92,246,0.16)' : 'inset 0 0 24px rgba(139,92,246,0.08)',
              transform: `rotate(${index * 21 + progressPercent / (reducedMotion ? 24 : 6)}deg)`,
              transition: reducedMotion ? 'none' : 'transform 180ms ease-out, border-color 180ms ease-out',
            }}
          />
        )
      })}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: `translate(-50%, -50%) rotate(${progressPercent * 3.6}deg) translateY(-42%)`,
          width: 12,
          height: 12,
          borderRadius: 999,
          background: '#e0f7ff',
          boxShadow: '0 0 28px rgba(103,232,249,0.92)',
          transition: reducedMotion ? 'none' : 'transform 160ms ease-out',
        }}
        aria-hidden="true"
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          padding: '8px 12px',
          border: '1px solid rgba(142,220,255,0.22)',
          borderRadius: 999,
          background: 'rgba(3,7,18,0.38)',
          color: 'rgba(235,244,255,0.82)',
          fontSize: '0.72rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          backdropFilter: 'blur(12px)',
        }}
      >
        {activeSegment.label}
      </div>
    </div>
  )
}
