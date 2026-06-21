import { LaunchSeo } from '../LaunchSeo'
import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Focus',
  description: 'URAI Focus is wired to Life Map and Replay.',
}

export default function FocusRoutePage() {
  return (
    <>
      <LaunchSeo label="URAI Focus is wired to Life Map and Replay." />
      <RootModeExperience initialMode="focus" />
    </>
  )
}
