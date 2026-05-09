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
}: {
  phase: ReplayPhase
  activeSegment: ReplaySegmentDefinition
  progressMs: number
  durationMs: number
  playing: boolean
  reducedMotion: boolean
  onPlayPause: () => void
  onScrub: (progressMs: number) => void
}) {
  const safeDuration = Math.max(1, durationMs)
  const clampedProgress = clampReplayProgress(progressMs, safeDuration)
  const progressPercent = Math.round((clampedProgress / safeDuration) * 100)
  const canInteract = phase !== 'loading_replay' && phase !== 'replay_empty' && phase !== 'replay_error'

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!canInteract) return
    const step = event.shiftKey ? 1000 : 250
    if (event.key === 'ArrowLeft') onScrub(clampedProgress - step)
    if (event.key === 'ArrowRight') onScrub(clampedProgress + step)
    if (event.key === 'Home') onScrub(0)
    if (event.key === 'End') onScrub(safeDuration)
  }

  return (
    <section className="urai-replay-timeline" data-testid="urai-replay-timeline" data-replay-phase={phase} data-reduced-motion={reducedMotion ? 'true' : 'false'} aria-label="Replay timeline">
      <div className="urai-replay-timeline__header">
        <button type="button" className="urai-replay-timeline__play" onClick={onPlayPause} disabled={!canInteract} aria-label={playing ? 'Pause replay' : 'Play replay'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <div className="urai-replay-timeline__time" aria-live="polite">
          <span>{formatReplayTime(clampedProgress)}</span>
          <span aria-hidden="true">/</span>
          <span>{formatReplayTime(safeDuration)}</span>
        </div>
        <div className="urai-replay-timeline__phase">{activeSegment.label}</div>
      </div>

      <div className="urai-replay-timeline__track-wrap">
        <input
          className="urai-replay-timeline__scrubber"
          type="range"
          min={0}
          max={safeDuration}
          step={100}
          value={clampedProgress}
          disabled={!canInteract}
          onChange={(event) => onScrub(Number(event.currentTarget.value))}
          onKeyDown={handleKeyDown}
          aria-label={`Replay scrubber, ${activeSegment.label} phase, ${progressPercent} percent complete`}
        />
        <div className="urai-replay-timeline__ticks" aria-hidden="true">
          {REPLAY_SEGMENTS.map((segment) => (
            <span
              key={segment.id}
              className={segment.id === activeSegment.id ? 'urai-replay-timeline__tick urai-replay-timeline__tick--active' : 'urai-replay-timeline__tick'}
              style={{ left: `${(segment.startsAtMs / safeDuration) * 100}%` }}
            >
              {segment.label}
            </span>
          ))}
        </div>
      </div>

      <p className="urai-replay-timeline__hint">Esc returns to Focus</p>
    </section>
  )
}
