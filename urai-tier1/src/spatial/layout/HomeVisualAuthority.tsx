'use client'

/**
 * Current Home visual authority shim.
 *
 * V288 remains the last certified predecessor in currentHomeVisualAuthority.json,
 * but it is no longer mounted over the active runtime. HomeWorldProductionV223
 * owns current Orb pixels through the governed authored GLB, translucent shell,
 * internal memory bloom and exact runtime state machine. Fresh exact-head retained
 * pixels are required before V291 can be certified.
 */
export function HomeVisualAuthority() {
  return null
}
