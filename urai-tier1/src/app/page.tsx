import SpatialWorldCanvas from '@/spatial/components/world/SpatialWorldCanvas'

export const metadata = {
  title: 'URAI Spatial',
  description: 'Open the URAI spatial home world first: orbit the chamber, reach Ground below, and open Life Map through the sky.',
}

export default function HomePage() {
  return <SpatialWorldCanvas mode="home" />
}
