import { Suspense } from 'react'
import CinematicReplayClient from './CinematicReplayClient'

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
      <Suspense fallback={<ReplayLoadingFallback />}>
        <CinematicReplayClient />
      </Suspense>
    </>
  )
}
