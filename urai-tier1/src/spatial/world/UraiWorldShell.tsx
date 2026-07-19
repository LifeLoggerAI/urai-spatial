'use client'

import type { ReactNode } from 'react'
import { GroundGateway } from './GroundGateway'
import { LifeMapIndependentInputBoundary } from './LifeMapIndependentInputBoundary'
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

const COMPANION_FREE_DESTINATIONS = new Set(['life-map', 'focus'])

export function UraiWorldShell({ children }: { children: ReactNode }) {
  const { world, phase } = useUraiWorldState()
  // Life Map and Focus are independent companion-free realms. Home keeps the
  // shared controller mounted, but routeOwnerConvergence makes its generated
  // artwork transparent so the authored sanctuary Orb remains the only visible Orb.
  const showWorldCompanion = !COMPANION_FREE_DESTINATIONS.has(world.destination)

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
    >
      <PersistentRealmAtmosphere />
      {children}
      <GroundGateway />
      {world.destination === 'life-map' ? <LifeMapIndependentInputBoundary /> : null}
      {showWorldCompanion ? <PersistentWorldCompanion /> : null}
      <WorldTransitionController />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        URAI destination {world.destination}. World layer {world.layer}.
      </p>
    </div>
  )
}

export default UraiWorldShell
