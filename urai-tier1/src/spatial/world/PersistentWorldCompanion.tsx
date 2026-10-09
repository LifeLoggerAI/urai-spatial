'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { publishOrbState } from '@/app/home/orbStateController'
import OrbConversationPanel from '@/spatial/orb/OrbConversationPanel'
import { definitionForDestination, URAI_DESTINATION_REGISTRY } from './destinationRegistry'
import {
  requestUraiWorldReturn,
  requestUraiWorldTravel,
  URAI_WORLD_ORB_OPEN_EVENT,
} from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'
import type { UraiDestination, UraiWorldTravelRequest } from './worldTypes'

const PRIMARY_DESTINATIONS: readonly UraiDestination[] = ['home', 'infrastructure-hub', 'life-map', 'focus', 'replay', 'life-movie']
const SECONDARY_DESTINATIONS: readonly UraiDestination[] = ['mirror', 'passport', 'privacy-controls', 'location-map']
const CONTEXT_KEYS = ['memoryId', 'node', 'thread', 'personId', 'placeId', 'manifestId', 'movieId', 'chapterId', 'privacyMode'] as const
const AUDIO_CONSENT_KEY = 'urai:spatial-audio-consent-v1'
const AUDIO_MUTE_KEY = 'urai:spatial-audio-muted-v1'

type PublicEstateIdentity = {
  id: 'studio' | 'privacy' | 'labs' | 'foundation'
  label: string
}

type PublicEstateEntry = PublicEstateIdentity & (
  | { status: 'verification-pending'; href?: never }
  | { status: 'live'; href: string }
)

const PUBLIC_ESTATE: readonly PublicEstateEntry[] = [
  { id: 'studio', label: 'URAI Studio', status: 'verification-pending' },
  { id: 'privacy', label: 'URAI Privacy', status: 'verification-pending' },
  { id: 'labs', label: 'URAI Labs', status: 'verification-pending' },
  { id: 'foundation', label: 'URAI Foundation', status: 'verification-pending' },
]

function buildCompanionTravelHref(request: UraiWorldTravelRequest) {
  const definition = definitionForDestination(request.destination)
  const target = new URL(request.href ?? definition.href, window.location.origin)
  const current = new URLSearchParams(window.location.search)
  for (const key of CONTEXT_KEYS) {
    if (!target.searchParams.has(key) && current.has(key)) target.searchParams.set(key, current.get(key) ?? '')
  }
  const context = request.context
  if (context?.memoryId) target.searchParams.set('memoryId', context.memoryId)
  if (context?.threadId) target.searchParams.set('thread', context.threadId)
  if (context?.personId) target.searchParams.set('personId', context.personId)
  if (context?.placeId) target.searchParams.set('placeId', context.placeId)
  if (context?.replayManifestId) target.searchParams.set('manifestId', context.replayManifestId)
  if (context?.movieId) target.searchParams.set('movieId', context.movieId)
  if (context?.chapterId) target.searchParams.set('chapterId', context.chapterId)
  if (context?.privacyMode) target.searchParams.set('privacyMode', context.privacyMode)
  if (request.entryPortal) target.searchParams.set('entryPortal', request.entryPortal)
  if (request.cameraCheckpoint) target.searchParams.set('cameraCheckpoint', request.cameraCheckpoint)
  const memoryId = target.searchParams.get('memoryId')
  const nodeId = target.searchParams.get('node')
  if (request.destination === 'life-map') {
    if (!nodeId && memoryId) target.searchParams.set('node', memoryId)
  } else if (!memoryId && nodeId) target.searchParams.set('memoryId', nodeId)
  return `${target.pathname}${target.search}${target.hash}`
}

export function PersistentWorldCompanion() {
  const router = useRouter()
  const { world, phase } = useUraiWorldState()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const current = definitionForDestination(world.destination)
  const menuRef = useRef<HTMLDivElement>(null)
  const orbRef = useRef<HTMLButtonElement>(null)
  const externalTriggerRef = useRef<HTMLElement | null>(null)
  const restoreFocusRef = useRef(false)
  const primaryDestinations = useMemo(() => PRIMARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]), [])
  const secondaryDestinations = useMemo(() => SECONDARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]), [])

  const closeMenuState = useCallback((restoreFocus: boolean) => {
    restoreFocusRef.current = restoreFocus
    if (!restoreFocus) externalTriggerRef.current = null
    setOpen(false)
  }, [])

  const closeCompanion = useCallback((restoreFocus = true) => {
    closeMenuState(restoreFocus)
    publishOrbState('idle', 'companion')
  }, [closeMenuState])

  // Event listeners can schedule expensive Home rendering. Commit the menu and
  // its focus effect before broadcasting the external Orb visual update.
  const closeCompanionFromEvent = useCallback((restoreFocus = true) => {
    flushSync(() => closeMenuState(restoreFocus))
    publishOrbState('idle', 'companion')
  }, [closeMenuState])

  useEffect(() => {
    setHydrated(true)
    try {
      setAudioEnabled(sessionStorage.getItem(AUDIO_CONSENT_KEY) === 'true' && sessionStorage.getItem(AUDIO_MUTE_KEY) === 'false')
    } catch {
      setAudioEnabled(false)
    }
  }, [])

  const toggleCompanion = useCallback(() => {
    if (open) closeCompanionFromEvent(true)
    else {
      flushSync(() => setOpen(true))
      publishOrbState('attention', 'companion')
      window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue: 'orb-confirm' } }))
    }
  }, [closeCompanionFromEvent, open])

  const toggleAudio = useCallback(() => {
    const enabled = !audioEnabled
    setAudioEnabled(enabled)
    window.dispatchEvent(new CustomEvent('urai:audio-consent', { detail: { enabled } }))
    window.dispatchEvent(new CustomEvent('urai:audio-mute', { detail: { muted: !enabled } }))
  }, [audioEnabled])

  useEffect(() => {
    const openCompanion = () => {
      const active = document.activeElement
      externalTriggerRef.current = active instanceof HTMLElement && active !== document.body && active !== orbRef.current
        ? active
        : null
      flushSync(() => setOpen(true))
      publishOrbState('attention', 'companion')
    }
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
      const externalTrigger = externalTriggerRef.current
      externalTriggerRef.current = null
      const homeSemanticOrb = world.destination === 'home'
        ? document.querySelector<HTMLElement>('[data-testid="home-semantic-orb"]')
        : null
      const focusTarget = externalTrigger?.isConnected ? externalTrigger : homeSemanticOrb ?? orbRef.current
      focusTarget?.focus()
    }
  }, [open, world.destination])

  useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      closeCompanionFromEvent(true)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [closeCompanionFromEvent, open])

  const travel = useCallback((destination: UraiDestination) => {
    if (phase !== 'idle' || destination === world.destination) {
      closeCompanionFromEvent(true)
      return
    }
    const target = definitionForDestination(destination)
    const request: UraiWorldTravelRequest = {
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
        movieId: world.movieId,
        chapterId: world.chapterId,
        privacyMode: world.privacyMode,
      },
    }
    const href = buildCompanionTravelHref(request)
    closeCompanionFromEvent(false)
    publishOrbState('transition', 'companion')
    router.push(href)
    requestUraiWorldTravel({ ...request, href })
  }, [closeCompanionFromEvent, phase, router, world])

  const returnThroughWorld = useCallback(() => {
    if (phase !== 'idle' || world.destination === 'home') {
      closeCompanionFromEvent(true)
      return
    }
    closeCompanionFromEvent(false)
    publishOrbState('transition', 'companion')
    requestUraiWorldReturn()
  }, [closeCompanionFromEvent, phase, world.destination])

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
    <aside className="urai-world-companion" data-hydrated={hydrated ? 'true' : 'false'} data-open={open ? 'true' : 'false'} data-phase={phase} data-destination={world.destination} data-spatial-audio={audioEnabled ? 'on' : 'off'}>
      <div ref={menuRef} id="urai-world-companion-menu" className="urai-world-companion__menu" aria-hidden={!open} inert={!open ? true : undefined}>
        <p>{current.label}</p>
        <nav aria-label="Travel through the URAI world">{destinationButtons(primaryDestinations)}</nav>
        <nav className="urai-world-companion__secondary" aria-label="Travel to private URAI realms">{destinationButtons(secondaryDestinations)}</nav>
        <section className="urai-world-companion__estate" aria-labelledby="urai-public-estate-title">
          <h2 id="urai-public-estate-title">Public constellation</h2>
          <ul>
            {PUBLIC_ESTATE.map((entry) => (
              <li key={entry.id} data-estate-id={entry.id} data-estate-status={entry.status}>
                {entry.status === 'live' ? (
                  <a href={entry.href} target="_blank" rel="noreferrer">
                    <span>{entry.label}</span>
                    <small>Verified live · opens a new site</small>
                  </a>
                ) : (
                  <span className="urai-world-companion__estate-card">
                    <span>{entry.label}</span>
                    <small>Verification pending</small>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
        {world.destination !== 'home' ? (
          <button type="button" className="urai-world-companion__return" aria-label="Return through the world" disabled={!hydrated || phase !== 'idle'} data-return="true" onClick={returnThroughWorld}>
            Return
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed={audioEnabled}
          aria-label={audioEnabled ? 'Mute spatial sound' : 'Enable spatial sound'}
          data-world-target="spatial-audio-toggle"
          disabled={!hydrated}
          onClick={toggleAudio}
        >
          {audioEnabled ? 'Sound on' : 'Sound off'}
        </button>
        <OrbConversationPanel active={open && phase === 'idle'} />
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
      >
        <span aria-hidden="true" />
      </button>
    </aside>
  )
}

export default PersistentWorldCompanion

