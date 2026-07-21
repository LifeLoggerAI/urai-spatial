import { LocationMapScene } from '@/spatial/places/LocationMapScene'
import { listMemoryPlaces } from '@/spatial/places/memoryPlaceRepository'

export default async function LocationMapPage() {
  const places = await listMemoryPlaces()
  const acceptanceFixturesEnabled = process.env.URAI_LOCATION_MAP_ACCEPTANCE_FIXTURES === '1'

  return (
    <section data-launch-surface="premium-emotional-weather-atlas">
      <LocationMapScene
        places={places}
        acceptanceFixturesEnabled={acceptanceFixturesEnabled}
      />
    </section>
  )
}
