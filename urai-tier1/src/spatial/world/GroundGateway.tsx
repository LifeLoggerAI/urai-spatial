'use client'

import { useCallback } from 'react'
import { requestUraiWorldTravel } from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'

export function GroundGateway() {
  const { world, phase } = useUraiWorldState()
  const isHome = world.destination === 'home'
  const disabled = !isHome || phase !== 'idle'

  const enterGround = useCallback(() => {
    if (disabled) return

    requestUraiWorldTravel({
      // `infrastructure-hub` remains the internal compatibility destination id until
      // the wider world-state schema can migrate without breaking old deep links.
      // The public product authority for /ground is the lived physical world.
      destination: 'infrastructure-hub',
      href: '/ground?from=home-ground',
      entryPortal: 'home-ground',
      cameraCheckpoint: world.cameraCheckpoint ?? 'home-ground-descent',
      context: {
        memoryId: world.memoryId,
        threadId: world.threadId,
        personId: world.personId,
        placeId: world.placeId,
        replayManifestId: world.replayManifestId,
        privacyMode: world.privacyMode,
      },
    })
  }, [disabled, world])

  if (!isHome) return null

  return (
    <div className="urai-ground-gateway" data-transition-active={phase !== 'idle' ? 'true' : 'false'} data-ground-gateway="lived-physical-world">
      <button
        type="button"
        className="urai-ground-gateway__surface"
        aria-label="Enter your physical Ground world"
        aria-describedby="urai-ground-gateway-description"
        disabled={disabled}
        onClick={enterGround}
      >
        <span className="urai-ground-gateway__focus-ring" aria-hidden="true" />
        <span className="sr-only">Enter Ground</span>
      </button>
      <p id="urai-ground-gateway-description" className="sr-only">
        Enter the physical world beneath and around you in first person. Your place data remains private and consent controlled. Press Escape in Ground to return Home.
      </p>
    </div>
  )
}

export default GroundGateway
