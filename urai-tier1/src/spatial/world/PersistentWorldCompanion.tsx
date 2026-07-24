'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  const router = useRouter()
  const { world, phase } = useUraiWorldState()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const current = definitionForDestination(world.destination)
  const menuRef = useRef<HTMLDivElement>(null)
  const orbRef = useRef<HTMLButtonElement>(null)
  const restoreFocusRef = useRef(false)

  const primaryDestinations = useMemo(
    () => PRIMARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]),
    [],
  )
  const secondaryDestinations = useMemo(
    () => SECONDARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]),
    [],
  )

  const closeCompanion = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus
    setOpen(false)
  }, [])

  useEffect(() => {
    setHydrated(true)
  }, [])

  const toggleCompanion = useCallback(() => {
    if (open) closeCompanion(true)
    else setOpen(true)
  }, [closeCompanion, open])

  useEffect(() => {
    const openCompanion = () => setOpen(true)
    window.addEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
    return () => window.removeEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
  }, [])

  useEffect(() => {
    if (phase !== 'idle') closeCompanion(false)
  }, [closeCompanion, phase])

  useEffect(() => {
    if (open) {
      restoreFocusRef.current = false
      const firstControl = menuRef.current?.querySelector<HTMLElement>('button:not([disabled])')
      firstControl?.focus()
      return
    }

    if (restoreFocusRef.current) {
      restoreFocusRef.current = false
      orbRef.current?.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeCompanion(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeCompanion, open])

  const travel = useCallback((destination: UraiDestination) => {
    if (phase !== 'idle' || destination === world.destination) {
      closeCompanion(true)
      return
    }

    const target = definitionForDestination(destination)
    const sourcePathname = window.location.pathname.replace(/\/+$/, '') || '/'
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
    // The transition controller owns normal spatial travel. This guarded fallback
    // guarantees a real button activation still completes if an event listener is
    // interrupted during hydration or a synthetic accessibility activation.
    window.setTimeout(() => {
      const currentPathname = window.location.pathname.replace(/\/+$/, '') || '/'
      if (currentPathname === sourcePathname) router.push(target.href)
    }, 1800)
    closeCompanion(false)
  }, [closeCompanion, phase, router, world])

  const returnThroughWorld = useCallback(() => {
    if (phase !== 'idle' || world.destination === 'home') {
      closeCompanion(true)
      return
    }
    requestUraiWorldReturn()
    closeCompanion(false)
  }, [closeCompanion, phase, world.destination])

  const destinationButtons = (destinations: typeof primaryDestinations) => destinations.map((destination) => (
    <button
      key={destination.id}
      type="button"
      disabled={!hydrated || phase !== 'idle'}
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
      <div
        ref={menuRef}
        id="urai-world-companion-menu"
        className="urai-world-companion__menu"
        aria-hidden={!open}
        inert={!open ? true : undefined}
      >
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
            disabled={!hydrated || phase !== 'idle'}
            data-return="true"
            onClick={returnThroughWorld}
          >
            Return
          </button>
        ) : null}
      </div>
      <button
        ref={orbRef}
        type="button"
        className="urai-world-companion__orb"
        aria-label={open ? 'Close Orb travel controls' : 'Open Orb travel controls'}
        aria-expanded={open}
        aria-controls="urai-world-companion-menu"
        data-world-target="orb-controls"
        data-urai-audit-action="orb-controls"
        disabled={!hydrated || phase !== 'idle'}
        onClick={toggleCompanion}
        onKeyDown={(event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          event.stopPropagation()
          toggleCompanion()
        }}
      >
        <span aria-hidden="true" />
      </button>
    </aside>
  )
}

export default PersistentWorldCompanion
