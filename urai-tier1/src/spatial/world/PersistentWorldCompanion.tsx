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
  type UraiWorldOrbOpenDetail,
} from './worldEvents'
import { useUraiWorldState } from './WorldStateProvider'
import type { UraiDestination, UraiWorldTravelRequest } from './worldTypes'

const PRIMARY_DESTINATIONS: readonly UraiDestination[] = ['home', 'infrastructure-hub', 'life-map', 'focus', 'replay']
const SECONDARY_DESTINATIONS: readonly UraiDestination[] = ['mirror', 'passport', 'privacy-controls', 'location-map']
const CONTEXT_KEYS = ['memoryId', 'node', 'thread', 'personId', 'placeId', 'manifestId', 'privacyMode'] as const
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
  const externalActivatorRef = useRef<HTMLElement | null>(null)
  const restoreFocusRef = useRef(false)
  const primaryDestinations = useMemo(() => PRIMARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]), [])
  const secondaryDestinations = useMemo(() => SECONDARY_DESTINATIONS.map((id) => URAI_DESTINATION_REGISTRY[id]), [])

  const closeCompanion = useCallback((restoreFocus = true) => {
    restoreFocusRef.current = restoreFocus
    setOpen(false)
    publishOrbState('idle', 'companion')
  }, [])

  useEffect(() => {
    setHydrated(true)
    try {
      setAudioEnabled(sessionStorage.getItem(AUDIO_CONSENT_KEY) === 'true' && sessionStorage.getItem(AUDIO_MUTE_KEY) === 'false')
    } catch {
      setAudioEnabled(false)
    }
  }, [])

  const publishCompanionAttention = useCallback(() => {
    window.queueMicrotask(() => {
      publishOrbState('attention', 'companion')
      window.dispatchEvent(new CustomEvent('urai:audio-cue', { detail: { cue: 'orb-confirm' } }))
    })
  }, [])

  const toggleCompanion = useCallback(() => {
    if (open) closeCompanion(true)
    else {
      externalActivatorRef.current = null
      setOpen(true)
      publishCompanionAttention()
    }
  }, [closeCompanion, open, publishCompanionAttention])

  const toggleAudio = useCallback(() => {
    const enabled = !audioEnabled
    setAudioEnabled(enabled)
    window.dispatchEvent(new CustomEvent('urai:audio-consent', { detail: { enabled } }))
    window.dispatchEvent(new CustomEvent('urai:audio-mute', { detail: { muted: !enabled } }))
  }, [audioEnabled])

  useEffect(() => {
    const openCompanion = (event: CustomEvent<UraiWorldOrbOpenDetail>) => {
      externalActivatorRef.current = event.detail.returnFocusTo ?? null
      // External semantic Home controls dispatch a native window event. Commit the
      // accessibility state synchronously so heavy spatial formation work cannot
      // leave the visible companion stale/aria-hidden after an intentional click.
      flushSync(() => setOpen(true))
      publishCompanionAttention()
    }
    window.addEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
    return () => window.removeEventListener(URAI_WORLD_ORB_OPEN_EVENT, openCompanion)
  }, [publishCompanionAttention])

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
      const activator = externalActivatorRef.current
      externalActivatorRef.current = null
      if (activator?.isConnected) activator.focus()
      else orbRef.current?.focus()
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
        privacyMode: world.privacyMode,
      },
    }
    const href = buildCompanionTravelHref(request)
    closeCompanion(false)
    publishOrbState('transition', 'companion')
    router.push(href)
    requestUraiWorldTravel({ ...request, href })
  }, [closeCompanion, phase, router, world])

  const returnThroughWorld = useCallback(() => {
    if (phase !== 'idle' || world.destination === 'home') {
      closeCompanion(true)
      return
    }
    closeCompanion(false)
    publishOrbState('transition', 'companion')
    requestUraiWorldReturn()
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
    <aside className="urai-world-companion" data-open={open ? 'true' : 'false'} data-phase={phase} data-destination={world.destination} data-spatial-audio={audioEnabled ? 'on' : 'off'}>
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
        <OrbConversationPanel />
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