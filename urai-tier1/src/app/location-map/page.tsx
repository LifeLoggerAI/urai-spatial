import { LocationMapScene } from '@/spatial/places/LocationMapScene'
import { DEMO_MEMORY_PLACES } from '@/spatial/places/demoMemoryPlaces'

export default function LocationMapPage() {
  return <LocationMapScene places={DEMO_MEMORY_PLACES} />
}
