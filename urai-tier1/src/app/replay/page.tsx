import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Replay',
  description: 'A private cinematic replay theater shell.',
}

export default function ReplayRoutePage() {
  return <RootModeExperience initialMode="replay" />
}
