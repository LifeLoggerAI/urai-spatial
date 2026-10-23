'use client'

import { useEffect, useState } from 'react'
import { useBrowserLocation } from '@/hooks/useBrowserLocation'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { useLifeMapEvents } from '@/components/lifemap/useLifeMapEvents'
import { app, firebasePublicEnvReady } from '@/lib/firebase/client'
import { withLifeMapSelectionIdentity } from '@/spatial/memory/lifeMapSelectionJourney'

function routeHref(params: URLSearchParams) {
  const query = params.toString()
  return `/life-map${query ? `?${query}` : ''}`
}

function buttonFromEvent(event: MouseEvent) {
  return event.target instanceof Element
    ? event.target.closest<HTMLButtonElement>('button')
    : null
}

export function LifeMapRouteTransactionBridge() {
  // Track committed route identity: the persistent bridge does not remount
  // for Next same-route demo/query transitions or browser Back and Forward.
  const location = useBrowserLocation()
  const explicitDemo = new URL(location || '/life-map', 'https://urai.invalid').searchParams.get('demo') === '1'
  // Fence cached private nodes synchronously before effect cleanup/auth refresh.
  const [identity, setIdentity] = useState<{ location: string; userId: string | null }>({ location: '', userId: null })
  const authenticatedUserId = !explicitDemo && identity.location === location ? identity.userId : null
  const { nodes } = useLifeMapEvents(explicitDemo ? 'demo-user' : authenticatedUserId ?? undefined)

  useEffect(() => {
    let active = true
    setIdentity({ location, userId: null })
    if (explicitDemo || !firebasePublicEnvReady) return () => { active = false }
    try {
      const unsubscribe = onAuthStateChanged(getAuth(app), user => {
        if (active) setIdentity({ location, userId: user?.uid ?? null })
      }, () => {
        if (active) setIdentity({ location, userId: null })
      })
      return () => { active = false; unsubscribe() }
    } catch {
      if (active) setIdentity({ location, userId: null })
      return () => { active = false }
    }
  }, [location, explicitDemo])

  useEffect(() => {
    const captureRouteIdentity = (event: MouseEvent) => {
      const button = buttonFromEvent(event)
      if (!button) return

      const help = button.closest<HTMLDetailsElement>('details.life-map-help')
      if (help) {
        const label = button.textContent?.trim() ?? ''
        const node = nodes.find((candidate) => (
          label === `${candidate.title}: ${candidate.summary}` ||
          label.startsWith(`${candidate.title}:`)
        ))
        if (!node) return

        const current = new URLSearchParams(window.location.search)
        const demo = current.get('demo') === '1'
        const next = withLifeMapSelectionIdentity(current, new URLSearchParams(), node.id)
        next.delete('overview')
        // A Life Map node is a constellation event, not necessarily the canonical
        // owner-verified memory document. Only that document may enter Focus/Replay.
        next.set('node', node.id)
        if (demo) next.set('memoryId', node.id)
        else if (node.authorizedMemory && node.memoryId) next.set('memoryId', node.memoryId)
        else next.delete('memoryId')
        if (!demo) {
          next.delete('manifestId')
          if (node.authorizedMemory && node.replayManifestId) next.set('manifestId', node.replayManifestId)
        }
        if (node.eraId) next.set('era', node.eraId)

        // Commit identity before the scene exposes selected state. The scene's
        // route replacement then hydrates the same URL into Next navigation.
        window.history.replaceState(window.history.state, '', routeHref(next))
        return
      }

      const selectedActions = button.closest<HTMLElement>('nav[aria-label="Selected memory actions"]')
      if (!selectedActions || button.textContent?.trim() !== 'Overview') return

      const next = new URLSearchParams(window.location.search)
      // Preserve the constellation node and optional verified private memory as
      // separate identities. Overview never mints a memoryId from an event id.
      if (!next.get('node') && !next.get('memoryId')) return
      next.set('overview', '1')
      const href = routeHref(next)

      // Overview is a navigable state, not a mutation of the selected entry.
      // The scene replaces this newly pushed entry with the same canonical URL,
      // leaving Back and Forward able to restore selected and overview states.
      if (`${window.location.pathname}${window.location.search}` !== href) {
        window.history.pushState(window.history.state, '', href)
      }
    }

    window.addEventListener('click', captureRouteIdentity, true)
    return () => window.removeEventListener('click', captureRouteIdentity, true)
  }, [nodes])

  return null
}

export default LifeMapRouteTransactionBridge
