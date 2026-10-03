'use client'

import './installR3FDataProps'
import './lifeMapMobileTravelDensity.css'
import './lifeMapSemanticNavigatorOwnership.css'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ComposedLifeMapScene from './ComposedLifeMapScene'
import LifeMapSemanticNavigator from './LifeMapSemanticNavigator'
import { LIFE_MAP_SELECTION_EVENT, type LifeMapSelectionDetail } from './lifeMapSelection'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])
const MIN_DIRECT_ROUTE_RENDER_ANCHORS = 8

export default function LifeMapRouteBoundary({ authenticatedUserId }: { authenticatedUserId: string | null }) {
  const router = useRouter()

  useEffect(() => {
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!performance.getEntriesByName('urai:first-spatial-frame').length) {
          performance.mark('urai:first-spatial-frame')
        }
      })
    })

    const primeOverviewIdentity = () => {
      const current = new URLSearchParams(window.location.search)
      current.delete('memoryId')
      current.delete('node')
      current.delete('returnNode')
      current.delete('from')
      current.set('overview', '1')
      router.replace(`/life-map?${current.toString()}`, { scroll: false })
    }

    const handoffSoftwareThreshold = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest<HTMLButtonElement>('.life-map-thresholds button')
      if (!button || button.disabled) return
      const root = button.closest<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      if (root?.dataset.softwareRenderer !== 'true') return

      const label = button.textContent?.trim() || ''
      const route = label.includes('Enter Focus') ? 'focus' : label.includes('Replay') ? 'replay' : null
      if (!route) return

      // Use the scene's resolved destination for both hardware and software
      // rendering. Rebuilding from the browser URL loses the default manifest
      // when the user entered the disclosed sample through /life-map?demo=1.
      const href = button.dataset.destinationHref
      if (!href) return
      const destination = new URL(href, window.location.origin)
      if (destination.origin !== window.location.origin || destination.pathname !== `/${route}`) return
      if (!destination.searchParams.get('memoryId') || !destination.searchParams.get('manifestId')) return

      // Native navigation tears down software WebGL immediately. Keeping a stalled
      // SwiftShader scene alive while Next streams the next realm can otherwise delay
      // an already-authorized keyboard/pointer transition for many seconds.
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(`${destination.pathname}${destination.search}`)
    }

    const primeOverview = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      const label = button?.textContent?.trim() || ''
      if (!button || !overviewActionLabels.has(label)) return
      primeOverviewIdentity()
    }

    document.addEventListener('click', handoffSoftwareThreshold, true)
    document.addEventListener('click', primeOverview, true)
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
      document.removeEventListener('click', handoffSoftwareThreshold, true)
      document.removeEventListener('click', primeOverview, true)
    }
  }, [router])

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search)
    if (initial.get('overview') === '1') return
    const nodeId = initial.get('node') || initial.get('memoryId')
    if (!nodeId) return

    let cancelled = false
    let frame = 0
    let repaired = false

    const requestCanonicalSelection = () => {
      if (repaired) return
      repaired = true
      const detail: LifeMapSelectionDetail = { nodeId, source: 'semantic' }
      window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
    }

    const verifyDirectRouteInvariant = () => {
      if (cancelled || repaired) return
      const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      if (!root) {
        frame = window.requestAnimationFrame(verifyDirectRouteInvariant)
        return
      }

      const phase = root.dataset.lifeMapPhase
      if (phase === 'arrival') {
        if (root.querySelector('.life-map-thresholds')) return
        requestCanonicalSelection()
        return
      }

      // A direct browser entry can hydrate its URL identity after the scene's first render.
      // If the real authored world is already healthy but still in overview, issue exactly
      // one canonical selection transaction. This does not run for ordinary in-app journeys:
      // the effect only arms when a node identity exists in the URL at initial mount.
      if (phase === 'overview') {
        const renderReady = root.dataset.lifeMapRenderReady === 'true'
        const visibleAnchors = Number(root.dataset.lifeMapVisibleAnchors || '0')
        if (renderReady && Number.isFinite(visibleAnchors) && visibleAnchors >= MIN_DIRECT_ROUTE_RENDER_ANCHORS) {
          requestCanonicalSelection()
          return
        }
      }

      frame = window.requestAnimationFrame(verifyDirectRouteInvariant)
    }

    frame = window.requestAnimationFrame(verifyDirectRouteInvariant)
    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return <>
    <ComposedLifeMapScene authenticatedUserId={authenticatedUserId} />
    <LifeMapSemanticNavigator authenticatedUserId={authenticatedUserId} />
  </>
}
