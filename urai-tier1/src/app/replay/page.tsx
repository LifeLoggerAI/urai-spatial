import { TierOneExperience } from '../../spatial/layout/TierOneExperience'
import CinematicReplayClient from './CinematicReplayClient'

export default function ReplayPage() {
  return (
    <>
      <TierOneExperience mode="replay" />
      <CinematicReplayClient />
    </>
  )
}
