'use client'

/**
 * Current Home visual repair.
 *
 * Historical V281 overlays remain retired: this component does not restore a
 * Ground ravine, portal, celestial ribbon, or second interaction owner.
 *
 * Retained pixels showed the governed Avatar needs more readable physical fill
 * in the cinematic Home composition. Camera distance/framing remains owned by
 * HomeWorldProductionV223 so this repair never takes over the R3F render loop or
 * mutates the Avatar/eye anchor used by Ground embodiment and return.
 */
export function HomeAAAVisualRepair() {
  return <pointLight
    name="home-visible-avatar-readable-fill"
    position={[-1.1, 2.35, 4.7]}
    intensity={0.5}
    distance={5.5}
    decay={2}
    color="#e4cfb3"
    userData={{ semanticOwner: 'home-avatar-composition', purpose: 'readable-physical-avatar-not-glow' }}
  />
}
