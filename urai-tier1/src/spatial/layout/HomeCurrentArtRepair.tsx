'use client'

import type { OrbState } from '@/app/home/orbStateController'

/**
 * Historical V249 localized destination art is retained only as repository
 * provenance. Current Home uses the continuous physical world for Ground,
 * the broad visible atmosphere for Life Map, and the authored living-memory Orb
 * candidate for current Orb pixels. V288 remains certified predecessor provenance.
 */
export function HomeCurrentArtRepair(_props: {
  orbState: OrbState
  reducedMotion: boolean
  onOrb: () => void
  onGround: () => void
  onLifeMap: () => void
}) {
  return null
}
