'use client'

import type { ReactNode } from 'react'
import SpatialAmbientRuntime from '@/spatial/audio/SpatialAmbientRuntime'
import HapticRuntime from '@/spatial/haptics/HapticRuntime'
import MotionOrchestrator from '@/spatial/motion/MotionOrchestrator'
import { GroundGateway } from './GroundGateway'
import { LifeMapIndependentInputBoundary } from './LifeMapIndependentInputBoundary'
import { LifeMapRouteTransactionBridge } from './LifeMapRouteTransactionBridge'
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
import './homeMobileControlSeparation.css'
import './lifeMapSelectedActionHardening.css'
import './lifeMapSelectedActionInvariant.css'
import './lifeMapProductionIsolation.css'

export function UraiWorldShell({ children }: { children: ReactNode }) {
  const { world, phase } = useUraiWorldState()
  const showWorldCompanion = world.destination !== 'life-map' && world.destination !== 'location-map'

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
      <SpatialAmbientRuntime />
      <HapticRuntime />
      <MotionOrchestrator />
      <LifeMapSelectedActionRuntimeInvariant />
      <PersistentRealmAtmosphere />
      {children}
      <GroundGateway />
      {world.destination === 'life-map' ? <LifeMapRouteTransactionBridge /> : null}
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
