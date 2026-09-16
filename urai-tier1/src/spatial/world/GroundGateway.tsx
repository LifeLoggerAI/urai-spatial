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
      // `infrastructure-hub` remains an internal compatibility destination id until
      // the wider world-state schema can migrate without breaking old deep links.
      // Public Ground authority is the first-person physical lived world.
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
    <div
      className="urai-ground-gateway-semantic"
      data-transition-active={phase !== 'idle' ? 'true' : 'false'}
      data-ground-gateway="semantic-access-only"
    >
      <button
        type="button"
        className="urai-ground-gateway-semantic__action"
        aria-label="Enter Ground — explore your physical lived world in first person"
        aria-describedby="urai-ground-gateway-description"
        disabled={disabled}
        onClick={enterGround}
      >
        Enter Ground
      </button>
      <p id="urai-ground-gateway-description" className="sr-only">
        Explore the physical lived world in first person. Pointer and touch users enter through the visible Home terrain. Place data remains private and consent controlled. Press Escape in Ground to return Home.
      </p>
      <style jsx>{`
        .urai-ground-gateway-semantic{position:fixed;z-index:2147482000;left:max(12px,env(safe-area-inset-left));bottom:max(12px,env(safe-area-inset-bottom));pointer-events:none}
        .urai-ground-gateway-semantic__action{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;pointer-events:auto}
        .urai-ground-gateway-semantic__action:focus-visible{position:relative;width:auto;height:auto;min-width:48px;min-height:48px;margin:0;padding:0 14px;clip:auto;overflow:visible;border:1px solid rgba(231,248,243,.38);border-radius:999px;background:rgba(4,16,19,.88);color:#f4fbf8;font:700 12px/1 system-ui;letter-spacing:.04em;outline:3px solid #fff;outline-offset:3px;white-space:normal}
        .urai-ground-gateway-semantic__action:disabled{display:none}
      `}</style>
    </div>
  )
}

export default GroundGateway
