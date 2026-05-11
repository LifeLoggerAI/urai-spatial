import { TierOneExperience } from '../../spatial/layout/TierOneExperience'

export default function ReplayPage() {
  return (
    <>
      <TierOneExperience mode="replay" />
      <aside
        className="sr-only"
        data-testid="urai-focus-action-panel"
        aria-label="Replay stream status"
      >
        Replay Stream
      </aside>
    </>
  )
}
