'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import { requestUraiWorldTravel } from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'

export function GroundGateway() {
  const router = useRouter()
  const fallbackTimer = useRef<number | null>(null)
  const { world, phase } = useUraiWorldState()
  const isHome = world.destination === 'home'
  const disabled = !isHome || phase !== 'idle'

  useEffect(() => () => {
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)
  }, [])

  const enterInfrastructure = useCallback(() => {
    if (disabled) return
    if (fallbackTimer.current !== null) window.clearTimeout(fallbackTimer.current)

    requestUraiWorldTravel({
      destination: 'infrastructure-hub',
      href: '/ground?from=ground-gateway',
      entryPortal: 'ground-gateway',
      cameraCheckpoint: world.cameraCheckpoint ?? 'home-threshold',
      context: {
        memoryId: world.memoryId,
        threadId: world.threadId,
        personId: world.personId,
        placeId: world.placeId,
        replayManifestId: world.replayManifestId,
        privacyMode: world.privacyMode,
      },
    })

    fallbackTimer.current = window.setTimeout(() => {
      if (window.location.pathname.replace(/\/$/, '') === '/home') {
        router.push('/ground?from=ground-gateway')
      }
      fallbackTimer.current = null
    }, 1450)
  }, [disabled, router, world])

  if (!isHome) return null

  return (
    <div className="urai-ground-gateway" data-transition-active={phase !== 'idle' ? 'true' : 'false'}>
      <button
        type="button"
        className="urai-ground-gateway__surface"
        aria-label="Open the ground and descend into Hidden Infrastructure"
        aria-describedby="urai-ground-gateway-description"
        disabled={disabled}
        onClick={enterInfrastructure}
      >
        <span className="urai-ground-gateway__focus-ring" aria-hidden="true" />
        <span className="urai-ground-gateway__signal" aria-hidden="true">Enter below</span>
      </button>
      <p id="urai-ground-gateway-description" className="sr-only">
        Activating the living ground preserves this Home position, opens the surface, and enters the private infrastructure world. Press Escape to reverse the journey.
      </p>
    </div>
  )
}

export default GroundGateway
