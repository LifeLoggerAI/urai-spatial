import { LocationMapScene } from '@/spatial/places/LocationMapScene'
import { listMemoryPlaces } from '@/spatial/places/memoryPlaceRepository'

export default async function LocationMapPage() {
  return <LocationMapScene places={await listMemoryPlaces()} />
}
