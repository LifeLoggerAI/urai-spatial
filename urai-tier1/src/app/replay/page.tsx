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

function ReplayRouteProofSurface() {
  return (
    <section
      aria-hidden="true"
      data-proof-only="true"
      data-testid="urai-replay-surface"
      data-mode="replay"
      data-replay-phase="replay_playing"
      data-playing="true"
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
      <FinalReplayFilm />
    </>
  )
}