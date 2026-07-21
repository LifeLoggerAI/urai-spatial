import { LocationMapScene } from '@/spatial/places/LocationMapScene'
import { listMemoryPlaces } from '@/spatial/places/memoryPlaceRepository'
import type { MemoryPlace } from '@/spatial/places/memoryPlaceSchema'

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

function acceptancePlaces(places: MemoryPlace[], state: string | string[] | undefined) {
  if (process.env.URAI_LOCATION_MAP_ACCEPTANCE_FIXTURES !== '1') return places
  if (state === 'empty') return []
  if (state === 'private') {
    return places.map((place, index) => ({
      ...place,
      id: `private-acceptance-${index + 1}`,
      userId: 'acceptance-user',
      title: `Private Place ${index + 1}`,
      privacyLevel: 'private' as const,
      locationPrivacy: index === 0 ? 'exact-private' as const : 'approx-private' as const,
    }))
  }
  return places
}

export default async function LocationMapPage({ searchParams }: PageProps) {
  const params = await searchParams
  const places = acceptancePlaces(await listMemoryPlaces(), params.acceptanceState)

  return (
    <section data-launch-surface="premium-emotional-weather-atlas">
      <LocationMapScene places={places} />
    </section>
  )
}
