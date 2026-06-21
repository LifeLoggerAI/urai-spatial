import { LaunchSeo } from './LaunchSeo'
import { RootModeExperience } from './RootModeExperience'

export const metadata = {
  title: 'URAI Spatial',
  description: 'Step inside yourself: the production URAI Spatial home with ground, orb, sky, avatar, horizon, camera movement, and connected Life Map routes.',
}

export default function HomePage() {
  // TierOneExperience remains the canonical 3D surface through RootModeExperience.
  return (
    <>
      <LaunchSeo label="URAI Spatial home is live as the production 3D world." />
      <RootModeExperience initialMode="home" />
    </>
  )
}
