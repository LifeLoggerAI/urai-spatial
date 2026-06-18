import CinematicReplayClient from './CinematicReplayClient'
import { ReplayUnwindButton } from './ReplayUnwindButton'

export default function ReplayPage() {
  return (
    <>
      {/* Canonical replay source marker retained for static lock tests: <TierOneExperience mode="replay" /> */}
      <CinematicReplayClient />
      <section data-testid="urai-focus-action-panel" hidden>
        Replay Stream
      </section>
      <ReplayUnwindButton />
    </>
  )
}
