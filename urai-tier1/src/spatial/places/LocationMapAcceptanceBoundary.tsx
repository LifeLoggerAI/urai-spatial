'use client'

import { useSearchParams } from 'next/navigation'
import type { MemoryPlace } from './memoryPlaceSchema'
import { LocationMapScene } from './LocationMapScene'

export function LocationMapAcceptanceBoundary({
  places,
  enabled,
}: {
  places: MemoryPlace[]
  enabled: boolean
}) {
  const searchParams = useSearchParams()

  if (!enabled) return <LocationMapScene places={places} />

  const state = searchParams.get('acceptanceState')
  if (state === 'empty') return <LocationMapScene places={[]} />
  if (state === 'private') {
    return (
      <LocationMapScene
        places={places.map(place => ({
          ...place,
          userId: 'acceptance-user',
          privacyLevel: 'private',
        }))}
      />
    )
  }

  return <LocationMapScene places={places} />
}
