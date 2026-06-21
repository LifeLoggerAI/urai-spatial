import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Replay',
  description: 'URAI Replay is connected to Life Map and Focus.',
}

export default function ReplayRoutePage() {
  return <RootModeExperience initialMode="replay" />
}
