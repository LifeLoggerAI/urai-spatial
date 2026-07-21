'use client'

import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import type { MemoryPlace } from './memoryPlaceSchema'
import { LocationMapScene } from './LocationMapScene'

const EMPTY_PLACES: MemoryPlace[] = []

export function LocationMapAcceptanceBoundary({
  places,
  enabled,
}: {
  places: MemoryPlace[]
  enabled: boolean
}) {
  const searchParams = useSearchParams()
  const privatePlaces = useMemo(() => places.map(place => ({
    ...place,
    userId: 'acceptance-user',
    privacyLevel: 'private' as const,
  })), [places])

  if (!enabled) return <LocationMapScene places={places} />

  const state = searchParams.get('acceptanceState')
  if (state === 'empty') return <LocationMapScene places={EMPTY_PLACES} />
  if (state === 'private') return <LocationMapScene places={privatePlaces} />

  return <LocationMapScene places={places} />
}