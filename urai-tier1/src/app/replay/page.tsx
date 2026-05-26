import { TierOneExperience } from '@/spatial/layout/TierOneExperience'
import { ReplayUnwindButton } from './ReplayUnwindButton'

export default function ReplayPage() {
  return (
    <>
      <TierOneExperience mode="replay" />
      <section data-testid="urai-focus-action-panel" hidden>
        Replay Stream
      </section>
      <ReplayUnwindButton />
    </>
  )
}
