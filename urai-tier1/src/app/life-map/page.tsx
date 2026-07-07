import CityWorld from '@/app/SpatialRealPlaceWorld'

export const metadata = {
  title: 'URAI Life Map',
  description: 'The URAI Life Map opens as the memory sky above the same city-overlook spatial home world.',
}

export default function LifeMapPage() {
  return <CityWorld mode="life-map" />
}
