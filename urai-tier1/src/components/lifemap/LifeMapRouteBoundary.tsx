'use client'

import './installR3FDataProps'
import './lifeMapMobileTravelDensity.css'
import './lifeMapSemanticNavigatorOwnership.css'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ComposedLifeMapScene from './ComposedLifeMapScene'
import LifeMapSemanticNavigator from './LifeMapSemanticNavigator'
import { requestLifeMapSelection } from './lifeMapSelection'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])
const SELECTED_ROUTE_REPLAY_TIMEOUT_MS = 30_000
const SELECTED_ROUTE_RETRY_MS = 120

export default function LifeMapRouteBoundary() {
  const router = useRouter()

  useEffect(() => {
    let secondFrame = 0
    let selectedRouteTimer = 0
    const selectedRouteReplayStartedAt = performance.now()
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!performance.getEntriesByName('urai:first-spatial-frame').length) {
          performance.mark('urai:first-spatial-frame')
        }

        const replaySelectedRoute = () => {
          const current = new URLSearchParams(window.location.search)
          if (current.get('overview') === '1') return
          const selectedRouteId = current.get('node') || current.get('memoryId')
          if (!selectedRouteId) return

          // A restored URL can expose its arrival identity before the Suspense-mounted
          // production selection owner is ready. The selected action rail is the real
          // acknowledgement. A departure/travel/approach phase also proves that the
          // production owner received the selection and now owns the journey.
          if (document.querySelector('nav[aria-label="Selected memory actions"]')) return

          const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
          const phase = root?.dataset.lifeMapPhase
          if (phase === 'departure' || phase === 'travel' || phase === 'approach') return

          if (performance.now() - selectedRouteReplayStartedAt >= SELECTED_ROUTE_REPLAY_TIMEOUT_MS) return

          if (root?.dataset.lifeMapRenderReady === 'true') {
            requestLifeMapSelection(selectedRouteId, 'semantic')
          }
          selectedRouteTimer = window.setTimeout(replaySelectedRoute, SELECTED_ROUTE_RETRY_MS)
        }

        replaySelectedRoute()
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

    const primeOverview = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      const label = button?.textContent?.trim() || ''
      if (!button || !overviewActionLabels.has(label)) return
      primeOverviewIdentity()
    }

    document.addEventListener('click', primeOverview, true)
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
      if (selectedRouteTimer) window.clearTimeout(selectedRouteTimer)
      document.removeEventListener('click', primeOverview, true)
    }
  }, [router])

  return <>
    <ComposedLifeMapScene />
    <LifeMapSemanticNavigator />
  </>
}
