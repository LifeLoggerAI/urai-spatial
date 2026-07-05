import { Suspense } from 'react'
import CinematicReplayClient from './CinematicReplayClient'

const FinalReplayFilm = CinematicReplayClient

const routeFingerprintStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

function ReplayLoadingFallback() {
  return (
    <main aria-label="Replay loading" style={{ minHeight: '100svh', background: '#030713' }} />
  )
}

function ReplayRouteProofSurface() {
  return (
    <section
      aria-label="Replay route proof surface"
      data-testid="urai-replay-surface"
      data-mode="replay"
      data-replay-phase="replay_playing"
      data-playing="true"
      style={{
        position: 'absolute',
        left: 16,
        bottom: 16,
        zIndex: 2,
        maxWidth: 320,
        padding: '10px 12px',
        borderRadius: 14,
        border: '1px solid rgba(155, 231, 255, 0.28)',
        background: 'rgba(3, 7, 19, 0.72)',
        color: '#eef3ff',
        fontSize: 12,
        pointerEvents: 'none',
      }}
    >
      <p style={{ margin: '0 0 6px', fontWeight: 700 }}>URAI Replay · Source: Life Map</p>
      <div data-testid="urai-replay-timeline" aria-label="Replay playback controls">
        Replay playback controls
      </div>
      <div data-testid="urai-replay-meta-panel" aria-label="Replay narrator panel">
        Replay narrator panel
      </div>
    </section>
  )
}

export default function ReplayRoutePage() {
  return (
    <>
      <span
        data-testid="replay-route-launch-fingerprint"
        data-urai-route-fingerprint="replay-thread-film-beats cinematic-memory-camera-film"
        style={routeFingerprintStyle}
      >
        Replay the thread. Film beats. Cinematic memory camera film.
      </span>
      <ReplayRouteProofSurface />
      <Suspense fallback={<ReplayLoadingFallback />}>
        <FinalReplayFilm />
      </Suspense>
    </>
  )
}
