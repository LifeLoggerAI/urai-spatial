import { LaunchRoutePanel } from './LaunchRoutePanel'
import { LaunchSeo } from './LaunchSeo'
import { RootModeExperience } from './RootModeExperience'

export const metadata = {
  title: 'URAI Spatial',
  description: 'The production URAI Spatial home with ground, orb, sky, avatar, horizon, camera movement, and connected Life Map routes.',
}

export default function HomePage() {
  // Keep visible route controls first so audits, keyboard users, and no-pointer users land on real production actions.
  return (
    <>
      <LaunchRoutePanel variant="home" />
      <LaunchSeo label="URAI Spatial is live as a production 3D world." />
      <RootModeExperience initialMode="home" />
    </>
  )
}
