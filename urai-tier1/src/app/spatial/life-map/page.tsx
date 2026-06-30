import SpatialLifeMapCanonical from '@/spatial/lifemap/SpatialLifeMapCanonical'

export const metadata = {
  title: 'URAI Spatial Life Map',
  description:
    'The canonical URAI Spatial Life Map with React Three Fiber camera movement, wheel zoom, orbit, memory stars, and XR-ready spatial behavior.',
}

export default function SpatialLifeMapPage() {
  return <SpatialLifeMapCanonical />
}
