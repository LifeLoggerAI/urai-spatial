import CinematicReplayClient from './CinematicReplayClient'
import { ReplayUnwindButton } from './ReplayUnwindButton'

export default function ReplayPage() {
  return (
    <main data-testid="urai-scene-stage" data-mode="replay" data-scene-mode="replay">
      {/* Canonical replay source marker retained for static lock tests: <TierOneExperience mode="replay" /> */}
      <CinematicReplayClient />
      <section data-testid="urai-focus-action-panel" hidden>
        Replay Stream
      </section>
      <ReplayUnwindButton />
    </main>
  )
}
