import { TierOneExperience } from '../../spatial/layout/TierOneExperience'
import CinematicReplayClient from './CinematicReplayClient'
import { ReplayUnwindButton } from './ReplayUnwindButton'

export default function ReplayPage() {
  return (
    <>
      <TierOneExperience mode="replay" />
      <section
        aria-label="Replay Stream"
        data-testid="urai-focus-action-panel"
        data-replay-marker="Replay Stream"
        hidden
      >
        Replay Stream
      </section>
      <CinematicReplayClient />
      <ReplayUnwindButton />
    </>
  )
}
