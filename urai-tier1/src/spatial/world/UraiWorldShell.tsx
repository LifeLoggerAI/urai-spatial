'use client'

import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'
import { GroundGateway } from './GroundGateway'
import { LifeMapIndependentInputBoundary } from './LifeMapIndependentInputBoundary'
import { LifeMapSelectedActionRuntimeInvariant } from './LifeMapSelectedActionRuntimeInvariant'
import { PersistentRealmAtmosphere } from './PersistentRealmAtmosphere'
import { PersistentWorldCompanion } from './PersistentWorldCompanion'
import { WorldTransitionController } from './WorldTransitionController'
import { useUraiWorldState } from './WorldStateProvider'
import './worldNavigation.css'
import './persistentWorldCompanion.css'
import './interactiveTargetConvergence.css'
import './persistentRealmAtmosphere.css'
import './lifeMapConvergence.css'
import './lifeMapSelectedCinematic.css'
import './routeOwnerConvergence.css'
import './secondaryRealmConvergence.css'
import './lifeMapIndependentInteraction.css'
import './embodiedExplorationLayout.css'
import './interactionCollisionRepair.css'
import './lifeMapSelectedActionHardening.css'
import './lifeMapSelectedActionInvariant.css'

export function UraiWorldShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || ''
  const { world, phase } = useUraiWorldState()
  const locationMapOwnsRoute = pathname.startsWith('/location-map')
  // Life Map and Location Map are independent non-Orb realms. Route-owned worlds
  // must not inherit persistent companion, gateway, atmosphere, or transition chrome.
  const showWorldCompanion = !locationMapOwnsRoute && world.destination !== 'life-map'

  return (
    <div
      className="urai-world-runtime"
      data-testid="urai-persistent-world-shell"
      data-world-destination={world.destination}
      data-world-layer={world.layer}
      data-world-transition={phase}
      data-entry-portal={world.entryPortal ?? ''}
      data-camera-checkpoint={world.cameraCheckpoint ?? ''}
      data-companion-owned={showWorldCompanion ? 'true' : 'false'}
      data-route-owned-world={locationMapOwnsRoute ? 'location-map' : 'shared-shell'}
    >
      {!locationMapOwnsRoute ? <LifeMapSelectedActionRuntimeInvariant /> : null}
      {!locationMapOwnsRoute ? <PersistentRealmAtmosphere /> : null}
      {children}
      {!locationMapOwnsRoute ? <GroundGateway /> : null}
      {!locationMapOwnsRoute && world.destination === 'life-map' ? <LifeMapIndependentInputBoundary /> : null}
      {showWorldCompanion ? <PersistentWorldCompanion /> : null}
      {!locationMapOwnsRoute ? <WorldTransitionController /> : null}
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        URAI destination {world.destination}. World layer {world.layer}.
      </p>
    </div>
  )
}

export default UraiWorldShell
