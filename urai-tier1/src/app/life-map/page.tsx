import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Life Map',
  description: 'Three dimensional URAI memory constellation.',
}

export default function LifeMapPage() {
  return <RootModeExperience initialMode="life-map" />
}
