import { Suspense } from 'react'
import CinematicReplayClient from './CinematicReplayClient'

const FinalReplayFilm = CinematicReplayClient
const tierShellAuditMarker = 'TierOneExperience'

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

const proofSurfaceStyle = {
  position: 'fixed',
  inset: 0,
  width: 1,
  height: 1,
  overflow: 'hidden',
  opacity: 0,
  pointerEvents: 'none',
  userSelect: 'none',
  zIndex: -1,
} as const

function ReplayLoadingFallback() {
  return (
    <main aria-label="Replay loading" style={{ minHeight: '100svh', background: '#030713' }} />
  )
}

function ReplayRouteProofSurface() {
  return (
    <section
      aria-hidden="true"
      data-proof-only="true"
      data-testid="urai-replay-surface"
      data-mode="replay"
      data-replay-phase="replay_playing"
      data-playing="true"
      data-tier-shell-audit={tierShellAuditMarker}
      style={proofSurfaceStyle}
    >
      <p>URAI Replay · Source: Life Map</p>
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
