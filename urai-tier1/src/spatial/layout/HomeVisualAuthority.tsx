'use client'

import type { ReactNode } from 'react'

/**
 * Current Home Orb visual authority boundary.
 *
 * The living-memory runtime owns its translucent shell, luminous interior,
 * speech/state expression and single pointer action together. Historical rock
 * adapters are not mounted and cannot suppress the current materials or lights.
 * This is an uncertified candidate until fresh exact-head pixels are accepted.
 */
export function HomeVisualAuthority({ children }: { children: ReactNode }) {
  return <group
    name="home-orb-living-memory-visible-authority"
    userData={{ visualAuthority: 'living-memory-translucent-heart', interactionOwner: false, certified: false }}
  >{children}</group>
}
