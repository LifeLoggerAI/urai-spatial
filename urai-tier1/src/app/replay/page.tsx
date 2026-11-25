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
      <Suspense fallback={
        <main aria-labelledby="replay-entry-heading" className="grid place-items-center overflow-y-auto">
          <section className="max-w-xl p-6">
            <h1 id="replay-entry-heading" className="font-serif text-4xl">Choose a memory to enter Replay.</h1>
            <a href="/life-map/" className="mt-3 inline-flex min-h-12 items-center rounded-sm px-2 underline focus-visible:outline-2 focus-visible:outline-offset-4">
              Choose a memory
            </a>
          </section>
        </main>
      }>
        <FinalReplayFilm />
      </Suspense>
    </>
  )
}
