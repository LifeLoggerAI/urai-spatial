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
import './routeOwnerConvergence.css'
import './secondaryRealmConvergence.css'
import './lifeMapIndependentInteraction.css'
import './embodiedExplorationLayout.css'

export function UraiWorldShell({ children }: { children: ReactNode }) {
  const { world, phase } = useUraiWorldState()
  const showWorldCompanion = world.destination !== 'life-map'
  const anchorToPhysicalHomeOrb = world.destination === 'home'

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
      data-home-orb-menu-owner={anchorToPhysicalHomeOrb ? 'physical-home-orb' : ''}
    >
      <PersistentRealmAtmosphere />
      {children}
      <GroundGateway />
      {world.destination === 'life-map' ? <LifeMapIndependentInputBoundary /> : null}
      {showWorldCompanion ? <PersistentWorldCompanion anchorToPhysicalHomeOrb={anchorToPhysicalHomeOrb} /> : null}
      <WorldTransitionController />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        URAI destination {world.destination}. World layer {world.layer}.
      </p>
    </div>
  )
}

export default UraiWorldShell
