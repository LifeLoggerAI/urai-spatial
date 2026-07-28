'use client'

import { useEffect, useState } from 'react'
import { useLifeMapEvents } from '@/components/lifemap/useLifeMapEvents'

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
  // Read the disclosed-demo boundary only after hydration. Using Next's
  // useSearchParams here forces a CSR bailout during static export even though
  // this bridge renders no UI and owns only post-hydration click transactions.
  const [explicitDemo, setExplicitDemo] = useState(false)
  const { nodes } = useLifeMapEvents(explicitDemo ? 'demo-user' : undefined)

  useEffect(() => {
    setExplicitDemo(new URLSearchParams(window.location.search).get('demo') === '1')
  }, [])

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

        const next = new URLSearchParams(window.location.search)
        next.delete('overview')
        next.set('memoryId', node.id)
        next.set('node', node.id)
        if (node.eraId) next.set('era', node.eraId)

        // Commit identity before the scene exposes selected state. The scene's
        // route replacement then hydrates the same URL into Next navigation.
        window.history.replaceState(window.history.state, '', routeHref(next))
        return
      }

      const selectedActions = button.closest<HTMLElement>('nav[aria-label="Selected memory actions"]')
      if (!selectedActions || button.textContent?.trim() !== 'Overview') return

      const next = new URLSearchParams(window.location.search)
      const retainedId = next.get('memoryId') ?? next.get('node')
      if (!retainedId) return
      next.set('memoryId', retainedId)
      next.set('node', retainedId)
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
