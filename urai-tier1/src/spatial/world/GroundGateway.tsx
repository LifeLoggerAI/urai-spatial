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

    // This control is an accessibility/fallback bridge only. Sighted pointer/touch
    // ownership belongs to the rendered Home terrain. When this semantic bridge is
    // used, the world router keeps the canonical Ground route available even if the
    // WebGL scene cannot provide a physical hit point.
    requestUraiWorldTravel({
      destination: 'infrastructure-hub',
      href: '/ground?from=home-ground-semantic',
      entryPortal: 'home-ground',
      cameraCheckpoint: 'ground-first-person-arrival',
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
    <div
      className="urai-ground-gateway urai-ground-gateway--semantic"
      data-transition-active={phase !== 'idle' ? 'true' : 'false'}
      data-ground-gateway="semantic-fallback-only"
      data-pointer-owner="false"
    >
      <button
        type="button"
        className="urai-ground-gateway__semantic-control sr-only"
        aria-label="Enter your physical Ground world"
        aria-describedby="urai-ground-gateway-description"
        disabled={disabled}
        onClick={enterGround}
      >
        Enter Ground
      </button>
      <p id="urai-ground-gateway-description" className="sr-only">
        Enter the physical world beneath and around you in first person. The visible Home terrain owns normal pointer and touch entry. Press Escape or Return in Ground to unwind Home.
      </p>
    </div>
  )
}

export default GroundGateway
