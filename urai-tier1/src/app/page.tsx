import { TierOneExperience } from '@/spatial/layout/TierOneExperience'

export const metadata = {
  title: 'URAI Spatial',
  description: 'Open the URAI spatial world with Home, Ground, Life Map, Replay, Mirror, Passport, and Status.',
}

export default function HomePage() {
  return <TierOneExperience mode="home" />
}
