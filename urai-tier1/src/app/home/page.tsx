import { LaunchRoutePanel } from '../LaunchRoutePanel'
import { LaunchSeo } from '../LaunchSeo'
import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Home',
  description: 'The private-by-default URAI launch home field with ground, orb, sky, avatar, horizon, camera motion, and route actions.',
}

export default function HomeRoutePage() {
  // Keep visible route controls first so audits, keyboard users, and no-pointer users land on real production actions.
  return (
    <>
      <LaunchRoutePanel variant="home" />
      <LaunchSeo label="URAI Home renders the production 3D world and primary route actions." />
      <RootModeExperience initialMode="home" />
    </>
  )
}
