import { LaunchSeo } from './LaunchSeo'
import { RootModeExperience } from './RootModeExperience'

export const metadata = {
  title: 'URAI Spatial',
  description: 'The production URAI Spatial home with ground, orb, sky, avatar, horizon, camera movement, and connected Life Map routes.',
}

export default function HomePage() {
  // TierOneExperience remains the canonical 3D surface through RootModeExperience.
  return (
    <>
      <LaunchSeo label="URAI Spatial is live as a production 3D world." />
      <RootModeExperience initialMode="home" />
    </>
  )
}
