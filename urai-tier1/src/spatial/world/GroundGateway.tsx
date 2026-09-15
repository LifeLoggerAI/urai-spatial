'use client'

import { useRouter } from 'next/navigation'
import { useCallback } from 'react'
import { useUraiWorldState } from './WorldStateProvider'

export function GroundGateway() {
  const router = useRouter()
  const { world, phase } = useUraiWorldState()
  const isHome = world.destination === 'home'
  const disabled = !isHome || phase !== 'idle'

  const enterGround = useCallback(() => {
    if (disabled) return

    // This control is an accessibility/renderer-failure bridge only. Sighted
    // pointer/touch ownership belongs to rendered Home terrain. It deliberately
    // bypasses the generic world-transition controller so the obsolete second
    // Ground transition can never reappear behind the semantic path.
    const target = new URL('/ground', window.location.origin)
    target.searchParams.set('from', 'home-ground-semantic')
    target.searchParams.set('cameraCheckpoint', 'ground-first-person-arrival')
    if (world.memoryId) target.searchParams.set('memoryId', world.memoryId)
    if (world.threadId) target.searchParams.set('thread', world.threadId)
    if (world.personId) target.searchParams.set('personId', world.personId)
    if (world.placeId) target.searchParams.set('placeId', world.placeId)
    if (world.replayManifestId) target.searchParams.set('manifestId', world.replayManifestId)
    if (world.privacyMode) target.searchParams.set('privacyMode', world.privacyMode)
    router.push(`${target.pathname}${target.search}`)
  }, [disabled, router, world])

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
