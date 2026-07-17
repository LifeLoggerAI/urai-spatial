'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { definitionForDestination, URAI_DESTINATION_REGISTRY } from './destinationRegistry'
import {
  requestUraiWorldReturn,
  requestUraiWorldTravel,
  URAI_WORLD_ORB_OPEN_EVENT,
} from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'
import type { UraiDestination } from './worldTypes'

const PRIMARY_DESTINATIONS: readonly UraiDestination[] = [
  'home',
  'infrastructure-hub',
  'life-map',
  'focus',
  'replay',
]

const SECONDARY_DESTINATIONS: readonly UraiDestination[] = [
  'mirror',
  'passport',
  'privacy-controls',
  'location-map',
]

export function PersistentWorldCompanion() {
  const { world, phase } = useUraiWorldState()
  const [open, setOpen] = useState(false)
  const current = definitionForDestination(world.destination)

  const primaryDestinations = useMemo(
    () => PRIMARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]),
    [],
  )
  const secondaryDestinations = useMemo(
    () => SECONDARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]),
    [],
  )

  useEffect(() => {
    const openCompanion = () => setOpen(true)
    window.addEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
    return () => window.removeEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
  }, [])

  useEffect(() => {
    if (phase !== 'idle') setOpen(false)
  }, [phase])

  const travel = useCallback((destination: UraiDestination) => {
    if (phase !== 'idle' || destination === world.destination) {
      setOpen(false)
      return
    }

    const target = definitionForDestination(destination)
    requestUraiWorldTravel({
      destination,
      href: target.href,
      entryPortal: target.entryPortal,
      cameraCheckpoint: target.cameraCheckpoint,
      context: {
        memoryId: world.memoryId,
        threadId: world.threadId,
        personId: world.personId,
        placeId: world.placeId,
        replayManifestId: world.replayManifestId,
        privacyMode: world.privacyMode,
      },
    })
    setOpen(false)
  }, [phase, world])

  const returnThroughWorld = useCallback(() => {
    if (phase !== 'idle' || world.destination === 'home') {
      setOpen(false)
      return
    }
    requestUraiWorldReturn()
    setOpen(false)
  }, [phase, world.destination])

  const destinationButtons = (destinations: typeof primaryDestinations) => destinations.map((destination) => (
    <button
      key={destination.id}
      type="button"
      disabled={phase !== 'idle'}
      data-active={destination.id === world.destination ? 'true' : 'false'}
      data-world-target={destination.id}
      aria-current={destination.id === world.destination ? 'page' : undefined}
      onClick={() => travel(destination.id)}
    >
      {destination.label}
    </button>
  ))

  return (
    <aside
      className="urai-world-companion"
      data-open={open ? 'true' : 'false'}
      data-phase={phase}
      data-destination={world.destination}
    >
      <div className="urai-world-companion__menu" aria-hidden={!open}>
        <p>{current.label}</p>
        <nav aria-label="Travel through the URAI world">
          {destinationButtons(primaryDestinations)}
        </nav>
        <nav className="urai-world-companion__secondary" aria-label="Travel to private URAI realms">
          {destinationButtons(secondaryDestinations)}
        </nav>
        {world.destination !== 'home' ? (
          <button
            type="button"
            className="urai-world-companion__return"
            aria-label="Return through the world"
            disabled={phase !== 'idle'}
            data-return="true"
            onClick={returnThroughWorld}
          >
            Return
          </button>
        ) : null}
      </div>
      <button
        type="button"
        className="urai-world-companion__orb"
        aria-label={open ? 'Close Orb travel controls' : 'Open Orb travel controls'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span aria-hidden="true" />
      </button>
    </aside>
  )
}

export default PersistentWorldCompanion
