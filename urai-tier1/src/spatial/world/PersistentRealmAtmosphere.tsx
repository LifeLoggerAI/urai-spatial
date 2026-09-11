'use client'

import { useUraiWorldState } from './WorldStateProvider'

export function PersistentRealmAtmosphere() {
  const { world, phase } = useUraiWorldState()

  // These spatial owners render their own sky, weather and depth. A fixed
  // screen-space veil above the route dims controls and draws a false horizon.
  if (['home', 'infrastructure-hub', 'life-map', 'focus', 'replay', 'mirror'].includes(world.destination)) return null

  return (
    <div
      className="urai-world-atmosphere"
      data-testid="urai-persistent-realm-atmosphere"
      data-realm={world.destination}
      data-layer={world.layer}
      data-phase={phase}
      aria-hidden="true"
    >
      <span className="urai-world-atmosphere__sky" />
      <span className="urai-world-atmosphere__horizon" />
      <span className="urai-world-atmosphere__weather" />
      <span className="urai-world-atmosphere__threshold" />
      <span className="urai-world-atmosphere__depth" />
    </div>
  )
}

export default PersistentRealmAtmosphere
