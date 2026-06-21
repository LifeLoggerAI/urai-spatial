import { RootModeExperience } from '@/app/RootModeExperience'

export const metadata = {
  title: 'URAI Life Map',
  description: 'The unified three dimensional URAI Life Map experience.',
}

export default function SpatialLifeMapPage() {
  return <RootModeExperience initialMode="life-map" />
}
