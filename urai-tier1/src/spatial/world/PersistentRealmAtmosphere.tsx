'use client'

import { useUraiWorldState } from './WorldStateProvider'

export function PersistentRealmAtmosphere() {
  const { world, phase } = useUraiWorldState()

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
