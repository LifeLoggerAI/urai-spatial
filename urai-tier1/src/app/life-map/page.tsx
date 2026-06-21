import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Life Map',
  description: 'A seeded private-by-default life map shell.',
}

export default function LifeMapRoutePage() {
  return <RootModeExperience initialMode="life-map" />
}
