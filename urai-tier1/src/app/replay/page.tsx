import { FinalReplayFilm } from '@/app/FinalMemorySurfaces'

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
        data-urai-route-fingerprint="replay-thread-film-beats"
        style={routeFingerprintStyle}
      >
        Replay the thread. Film beats.
      </span>
      <FinalReplayFilm />
    </>
  )
}
