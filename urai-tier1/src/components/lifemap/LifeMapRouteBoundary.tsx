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

export default function LifeMapRouteBoundary() {
  const router = useRouter()

  useEffect(() => {
    let secondFrame = 0
    let selectedRouteFrame = 0
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

          // URL-derived mode/phase can exist before the Suspense-mounted production
          // world has acknowledged the selected node. The actual selected action rail
          // is the observable product acknowledgement for a restored deep link.
          if (document.querySelector('nav[aria-label="Selected memory actions"]')) return

          const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
          if (root?.dataset.lifeMapRenderReady === 'true') {
            requestLifeMapSelection(selectedRouteId, 'semantic')
            return
          }

          if (performance.now() - selectedRouteReplayStartedAt >= SELECTED_ROUTE_REPLAY_TIMEOUT_MS) return
          selectedRouteFrame = window.requestAnimationFrame(replaySelectedRoute)
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
      if (selectedRouteFrame) window.cancelAnimationFrame(selectedRouteFrame)
      document.removeEventListener('click', primeOverview, true)
    }
  }, [router])

  return <>
    <ComposedLifeMapScene />
    <LifeMapSemanticNavigator />
  </>
}
