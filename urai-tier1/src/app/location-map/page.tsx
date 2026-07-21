import { Suspense } from 'react'
import { LocationMapAcceptanceBoundary } from '@/spatial/places/LocationMapAcceptanceBoundary'
import '@/spatial/places/location-map-release-depth.css'
import { listMemoryPlaces } from '@/spatial/places/memoryPlaceRepository'

export default async function LocationMapPage() {
  const places = await listMemoryPlaces()
  const acceptanceFixturesEnabled = process.env.URAI_LOCATION_MAP_ACCEPTANCE_FIXTURES === '1'

  return (
    <section data-launch-surface="premium-emotional-weather-atlas">
      <Suspense fallback={null}>
        <LocationMapAcceptanceBoundary
          places={places}
          enabled={acceptanceFixturesEnabled}
        />
      </Suspense>
    </section>
  )
}
