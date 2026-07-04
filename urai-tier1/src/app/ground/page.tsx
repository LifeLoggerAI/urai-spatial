import SpatialRealmPage from '@/app/spatial/ar-vr/SpatialRealmPage'

export const metadata = {
  title: 'URAI Ground World',
  description: 'Walk the private Ground headquarters inside the continuous URAI spatial world.',
}

export default function GroundPage() {
  return <SpatialRealmPage realm="ground" />
}
