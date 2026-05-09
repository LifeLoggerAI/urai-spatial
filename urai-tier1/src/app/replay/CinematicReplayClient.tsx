'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { buildMemoryMorphology } from '@/spatial/memory/memoryMorphology'
import { useReducedMotion } from '@/spatial/hooks/useReducedMotion'
import { ReplayMetaPanel } from '@/spatial/replay/ReplayMetaPanel'
import { ReplayTimeline } from '@/spatial/replay/ReplayTimeline'
import { ReplayPhaseRings } from '@/spatial/replay/ReplayPhaseRings'
import {
  REPLAY_DURATION_MS,
  getReplayPhaseDefinition,
  getReplaySegmentAt,
  resolveReplayPhase,
  clampReplayProgress,
} from '@/spatial/scene/replayState'

function nodeNameFromParams(value: string | null) {
  if (!value) return 'Evening Pattern'
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export default function CinematicReplayClient() {
  const router = useRouter()
  const params = useSearchParams()
  const reducedMotion = useReducedMotion()
  const [playing, setPlaying] = useState(true)
  const [scrubbing, setScrubbing] = useState(false)
  const [progressMs, setProgressMs] = useState(0)

  const manifestId = params.get('manifestId')
  const nodeName = nodeNameFromParams(params.get('node') ?? manifestId)
  const morphology = useMemo(() => buildMemoryMorphology(null, 'mirror'), [])
  const activeSegment = getReplaySegmentAt(progressMs)
  const replayPhase = resolveReplayPhase({
    mode: 'replay',
    hasReplayTarget: true,
    isManifestLoading: false,
    isGateLoading: false,
    isGateBlocked: false,
    isPlaying: playing,
    isScrubbing: scrubbing,
    progressMs,
  })
  const phaseDefinition = getReplayPhaseDefinition(replayPhase)
  const progressPercent = (clampReplayProgress(progressMs) / REPLAY_DURATION_MS) * 100

  const returnToFocus = useCallback(() => {
    const target = manifestId ? `/focus?manifestId=${encodeURIComponent(manifestId)}` : '/focus'
    router.push(target)
  }, [manifestId, router])

  const scrubTo = useCallback((nextProgressMs: number) => {
    const next = clampReplayProgress(nextProgressMs)
    setProgressMs(next)
    if (next >= REPLAY_DURATION_MS) setPlaying(false)
  }, [])

  const togglePlay = useCallback(() => {
    setPlaying((current) => {
      if (!current && progressMs >= REPLAY_DURATION_MS) setProgressMs(0)
      return !current
    })
  }, [progressMs])

  useEffect(() => {
    if (!playing || scrubbing) return

    const interval = window.setInterval(() => {
      setProgressMs((current) => {
        const next = clampReplayProgress(current + (reducedMotion ? 250 : 120))
        if (next >= REPLAY_DURATION_MS) {
          window.clearInterval(interval)
          setPlaying(false)
        }
        return next
      })
    }, reducedMotion ? 250 : 120)

    return () => window.clearInterval(interval)
  }, [playing, reducedMotion, scrubbing])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') returnToFocus()
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        togglePlay()
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [returnToFocus, togglePlay])

  return (
    <main
      data-testid="cinematic-replay-client"
      data-replay-phase={replayPhase}
      data-replay-segment={activeSegment.id}
      data-reduced-motion={reducedMotion ? 'true' : 'false'}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        color: '#eef3ff',
        background:
          'radial-gradient(circle at 50% 36%, rgba(103, 232, 249, 0.18), transparent 24%), radial-gradient(circle at 50% 62%, rgba(139, 92, 246, 0.24), transparent 42%), linear-gradient(180deg, #08112a 0%, #030713 56%, #010208 100%)',
      }}
    >
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(2px 2px at 18% 24%, rgba(255,255,255,0.52), transparent), radial-gradient(1px 1px at 68% 14%, rgba(255,255,255,0.4), transparent), radial-gradient(2px 2px at 72% 74%, rgba(146,166,255,0.46), transparent), radial-gradient(1px 1px at 36% 58%, rgba(178,224,255,0.42), transparent)',
          opacity: 0.68,
        }}
      />

      <section
        aria-label="Replay location"
        style={{
          position: 'absolute',
          left: 22,
          top: 22,
          zIndex: 14,
          maxWidth: 'min(390px, calc(100vw - 44px))',
          padding: '18px 20px',
          border: '1px solid rgba(180, 215, 255, 0.18)',
          borderRadius: 24,
          background: 'linear-gradient(150deg, rgba(5, 9, 22, 0.62), rgba(16, 11, 35, 0.42))',
          boxShadow: '0 24px 90px rgba(0, 0, 0, 0.34)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
        }}
      >
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(182, 226, 255, 0.76)' }}>
          Pattern Replay
        </div>
        <h1 style={{ margin: '8px 0 8px', fontSize: 'clamp(1.35rem, 3vw, 2rem)', lineHeight: 1.05 }}>A rhythm is returning after static.</h1>
        <p style={{ margin: 0, color: 'rgba(235, 244, 255, 0.75)', fontSize: '0.9rem', lineHeight: 1.55 }}>
          Source: LifeMap · {nodeName}
        </p>
      </section>

      <button
        type="button"
        aria-label="Center replay"
        style={{
          position: 'absolute',
          right: 22,
          top: 22,
          zIndex: 15,
          border: '1px solid rgba(142, 220, 255, 0.24)',
          borderRadius: 999,
          background: 'rgba(5, 9, 22, 0.46)',
          color: 'rgba(235, 244, 255, 0.78)',
          padding: '8px 12px',
          fontSize: '0.74rem',
          letterSpacing: '0.04em',
          backdropFilter: 'blur(14px)',
        }}
      >
        Center Replay
      </button>

      <button
        type="button"
        aria-label="Return to Focus"
        onClick={returnToFocus}
        style={{
          position: 'absolute',
          right: 22,
          top: 68,
          zIndex: 15,
          border: '1px solid rgba(142, 220, 255, 0.24)',
          borderRadius: 999,
          background: 'rgba(5, 9, 22, 0.46)',
          color: 'rgba(235, 244, 255, 0.78)',
          padding: '8px 12px',
          fontSize: '0.74rem',
          letterSpacing: '0.04em',
          backdropFilter: 'blur(14px)',
        }}
      >
        Return to Focus
      </button>

      <ReplayPhaseRings activeSegment={activeSegment} progressPercent={progressPercent} reducedMotion={reducedMotion} />

      <ReplayMetaPanel
        morphology={morphology}
        phase={replayPhase}
        phaseDefinition={phaseDefinition}
        activeSegment={activeSegment}
        sourceLabel={`LifeMap · ${nodeName}`}
        onReturnToFocus={returnToFocus}
      />

      <ReplayTimeline
        phase={replayPhase}
        activeSegment={activeSegment}
        progressMs={progressMs}
        durationMs={REPLAY_DURATION_MS}
        playing={playing}
        reducedMotion={reducedMotion}
        onPlayPause={togglePlay}
        onScrub={scrubTo}
        onScrubbingChange={setScrubbing}
      />
    </main>
  )
}
