import { LaunchRoutePanel } from '../LaunchRoutePanel'
import { LaunchSeo } from '../LaunchSeo'
import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Home',
  description: 'The private-by-default URAI launch home field with ground, orb, sky, avatar, horizon, camera motion, and route actions.',
}

export default function HomeRoutePage() {
  return (
    <>
      <LaunchSeo label="URAI Home renders the production 3D world and primary route actions." />
      <RootModeExperience initialMode="home" />
      <LaunchRoutePanel variant="home" />
    </>
  )
}
