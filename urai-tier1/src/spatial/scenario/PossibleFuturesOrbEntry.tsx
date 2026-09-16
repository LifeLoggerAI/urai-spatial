'use client'

import { useEffect, useState } from 'react'
import { requestUraiWorldTravel } from '@/spatial/world/worldEvents'
import { useUraiWorldState } from '@/spatial/world/WorldStateProvider'

/**
 * Companion-owned Scenario doorway. It appears only while the persistent Orb
 * companion is open and reuses the canonical world-travel stack rather than
 * inventing a second router.
 */
export function PossibleFuturesOrbEntry() {
  const { world, phase } = useUraiWorldState()
  const [companionOpen, setCompanionOpen] = useState(false)

  useEffect(() => {
    const owner = document.querySelector<HTMLElement>('.urai-world-companion')
    if (!owner) return
    const sync = () => setCompanionOpen(owner.dataset.open === 'true')
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(owner, { attributes: true, attributeFilter: ['data-open'] })
    return () => observer.disconnect()
  }, [world.destination])

  if (!companionOpen || world.destination === 'possible-futures') return null

  const explore = () => {
    if (phase !== 'idle') return
    requestUraiWorldTravel({
      destination: 'possible-futures',
      href: '/possible-futures',
      entryPortal: 'orb-possible-futures',
      cameraCheckpoint: 'possible-futures-arrival',
      context: {
        memoryId: world.memoryId,
        threadId: world.threadId,
        personId: world.personId,
        placeId: world.placeId,
        eraId: world.eraId,
        replayManifestId: world.replayManifestId,
        privacyMode: world.privacyMode,
        reconstructionFidelity: world.reconstructionFidelity,
        truthMode: 'scenario',
        scenarioOrigin: world.originRealm ?? (world.destination === 'infrastructure-hub' ? 'ground' : world.destination),
        originRealm: world.originRealm,
        returnToken: world.returnToken,
      },
    })
  }

  return (
    <button
      type="button"
      className="urai-possible-futures-orb-entry"
      data-testid="urai-orb-possible-futures-entry"
      onClick={explore}
      disabled={phase !== 'idle'}
      aria-label="Explore a Possible Future"
    >
      <span>Explore a Possible Future</span>
      <small>What might happen under assumptions · never a memory</small>
    </button>
  )
}
