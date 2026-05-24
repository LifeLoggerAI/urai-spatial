import { TierOneExperience } from '../../spatial/layout/TierOneExperience'
import CinematicReplayClient from './CinematicReplayClient'

export default function ReplayPage() {
  return (
    <>
      <TierOneExperience mode="replay" />
      <section
        aria-label="Replay Stream"
        data-testid="urai-replay-marker"
        data-replay-marker="Replay Stream"
        hidden
      >
        Replay Stream
      </section>
      <CinematicReplayClient />
    </>
  )
}
