import SpatialRealPlaceWorld from './SpatialRealPlaceWorld'

export const metadata = {
  title: 'URAI Spatial',
  description: 'Open the URAI real-place spatial home first: Ground below, Life Map above, one anchored world.',
}

export default function HomePage() {
  return <SpatialRealPlaceWorld mode="home" />
}
