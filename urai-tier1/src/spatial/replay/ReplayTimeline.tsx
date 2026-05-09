'use client'

import { KeyboardEvent } from 'react'
import { REPLAY_SEGMENTS, ReplayPhase, ReplaySegmentDefinition, clampReplayProgress } from '../scene/replayState'

function formatReplayTime(ms: number) {
  const seconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(seconds / 60)
  const remainder = seconds % 60
  return `${minutes}:${remainder.toString().padStart(2, '0')}`
}

export function ReplayTimeline({
  phase,
  activeSegment,
  progressMs,
  durationMs,
  playing,
  reducedMotion,
  onPlayPause,
  onScrub,
  onScrubbingChange,
}: {
  phase: ReplayPhase
  activeSegment: ReplaySegmentDefinition
  progressMs: number
  durationMs: number
  playing: boolean
  reducedMotion: boolean
  onPlayPause: () => void
  onScrub: (progressMs: number) => void
  onScrubbingChange?: (scrubbing: boolean) => void
}) {
  const safeDuration = Math.max(1, durationMs)
  const clampedProgress = clampReplayProgress(progressMs, safeDuration)
  const progressPercent = Math.round((clampedProgress / safeDuration) * 100)
  const canInteract = phase !== 'loading_replay' && phase !== 'replay_empty' && phase !== 'replay_error'
  const phaseLine = REPLAY_SEGMENTS.map((segment) => segment.label).join(' · ')

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!canInteract) return
    const step = event.shiftKey ? 1000 : 250
    if (event.key === 'ArrowLeft') onScrub(clampedProgress - step)
    if (event.key === 'ArrowRight') onScrub(clampedProgress + step)
    if (event.key === 'Home') onScrub(0)
    if (event.key === 'End') onScrub(safeDuration)
  }

  return (
    <section
      data-testid="urai-replay-timeline"
      data-replay-phase={phase}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      aria-label="Replay timeline"
      style={{
        position: 'absolute',
        left: '50%',
        bottom: 24,
        zIndex: 14,
        width: 'min(680px, calc(100vw - 32px))',
        transform: 'translateX(-50%)',
        border: '1px solid rgba(142, 220, 255, 0.24)',
        borderRadius: 24,
        background: 'linear-gradient(135deg, rgba(4, 12, 28, 0.74), rgba(19, 13, 45, 0.7))',
        boxShadow: '0 18px 70px rgba(0, 0, 0, 0.34), 0 0 34px rgba(34, 211, 238, 0.08)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        padding: 14,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onPlayPause}
          disabled={!canInteract}
          aria-label={playing ? 'Pause replay' : 'Play replay'}
          style={{
            minWidth: 74,
            minHeight: 40,
            borderRadius: 999,
            border: '1px solid rgba(255, 255, 255, 0.32)',
            background: 'linear-gradient(135deg, rgba(103, 232, 249, 0.96), rgba(139, 92, 246, 0.88))',
            color: '#050713',
            fontWeight: 800,
          }}
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <div style={{ color: 'rgba(235, 244, 255, 0.82)', fontSize: '0.82rem', minWidth: 88 }} aria-live="polite">
          <span>{formatReplayTime(clampedProgress)}</span>
          <span aria-hidden="true"> / </span>
          <span>{formatReplayTime(safeDuration)}</span>
        </div>
        <div style={{ color: 'rgba(182, 226, 255, 0.84)', fontSize: '0.76rem', letterSpacing: '0.12em', textTransform: 'uppercase', minWidth: 72 }}>
          {activeSegment.label}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 12, paddingBottom: 22 }}>
        <input
          type="range"
          min={0}
          max={safeDuration}
          step={100}
          value={clampedProgress}
          disabled={!canInteract}
          onPointerDown={() => onScrubbingChange?.(true)}
          onPointerUp={() => onScrubbingChange?.(false)}
          onPointerCancel={() => onScrubbingChange?.(false)}
          onBlur={() => onScrubbingChange?.(false)}
          onChange={(event) => onScrub(Number(event.currentTarget.value))}
          onKeyDown={handleKeyDown}
          aria-label={`Replay scrubber, ${activeSegment.label} phase, ${progressPercent} percent complete`}
          style={{
            width: '100%',
            accentColor: '#67e8f9',
            cursor: canInteract ? 'pointer' : 'not-allowed',
          }}
        />
        <div aria-hidden="true">
          {REPLAY_SEGMENTS.map((segment) => {
            const left = `${(segment.startsAtMs / safeDuration) * 100}%`
            const active = segment.id === activeSegment.id
            return (
              <span
                key={segment.id}
                style={{
                  position: 'absolute',
                  left,
                  bottom: 0,
                  transform: 'translateX(-50%)',
                  color: active ? '#e0f7ff' : 'rgba(235, 244, 255, 0.54)',
                  fontSize: active ? '0.72rem' : '0.68rem',
                  fontWeight: active ? 800 : 500,
                  textShadow: active ? '0 0 14px rgba(103, 232, 249, 0.75)' : 'none',
                  transition: reducedMotion ? 'none' : 'color 160ms ease-out',
                  whiteSpace: 'nowrap',
                }}
              >
                {segment.label}
              </span>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 4 }}>
        <span style={{ color: 'rgba(235, 244, 255, 0.64)', fontSize: '0.72rem' }}>{phaseLine}</span>
        <span style={{ color: 'rgba(182, 226, 255, 0.8)', fontSize: '0.74rem' }}>Esc returns to Focus</span>
      </div>
    </section>
  )
}
