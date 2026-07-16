'use client'

import type { ReactNode } from 'react'
import { GroundGateway } from './GroundGateway'
import { WorldTransitionController } from './WorldTransitionController'
import { useUraiWorldState } from './WorldStateProvider'
import './worldNavigation.css'

export function UraiWorldShell({ children }: { children: ReactNode }) {
  const { world, phase } = useUraiWorldState()

  return (
    <div
      className="urai-world-runtime"
      data-testid="urai-persistent-world-shell"
      data-world-destination={world.destination}
      data-world-layer={world.layer}
      data-world-transition={phase}
      data-entry-portal={world.entryPortal ?? ''}
      data-camera-checkpoint={world.cameraCheckpoint ?? ''}
    >
      {children}
      <GroundGateway />
      <WorldTransitionController />
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        URAI destination {world.destination}. World layer {world.layer}.
      </p>
    </div>
  )
}

export default UraiWorldShell
