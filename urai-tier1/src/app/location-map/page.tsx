import { LocationMapScene } from '@/spatial/places/LocationMapScene'
import { listMemoryPlaces } from '@/spatial/places/memoryPlaceRepository'

export default async function LocationMapPage() {
  return (
    <section data-launch-surface="premium-emotional-weather-atlas">
      <LocationMapScene places={await listMemoryPlaces()} />
    </section>
  )
}
