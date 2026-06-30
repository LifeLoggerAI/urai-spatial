import SpatialLifeMapCanonical from '@/spatial/lifemap/SpatialLifeMapCanonical'

export const metadata = {
  title: 'URAI Life Map',
  description:
    'The canonical URAI Spatial Life Map with React Three Fiber camera movement, wheel zoom, orbit, memory stars, Focus, Replay, Mirror, Passport, and XR entry.',
}

export default function LifeMapPage() {
  return <SpatialLifeMapCanonical />
}
