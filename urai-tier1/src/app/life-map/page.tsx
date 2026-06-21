import { LaunchSeo } from '../LaunchSeo'
import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Life Map',
  description: 'The production URAI Life Map: a three-dimensional constellation with Focus and Replay handoff.',
}

export default function LifeMapPage() {
  return (
    <>
      <LaunchSeo label="URAI Life Map renders the explorable 3D constellation." />
      <RootModeExperience initialMode="life-map" />
    </>
  )
}
