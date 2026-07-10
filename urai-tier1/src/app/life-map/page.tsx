import SpatialLifeMapCanonical from '@/spatial/lifemap/SpatialLifeMapCanonical'

export const metadata = {
  title: 'URAI Life Map',
  description: 'The canonical URAI Life Map opens into the React Three Fiber spatial memory field.',
}

export default function LifeMapPage() {
  return <SpatialLifeMapCanonical />
}
