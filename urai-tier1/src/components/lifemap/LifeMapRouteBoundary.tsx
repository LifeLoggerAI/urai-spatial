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

export default function LifeMapRouteBoundary() {
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
      document.removeEventListener('click', primeOverview, true)
    }
  }, [router])

  useEffect(() => {
    let cancelled = false
    let frame = 0

    const restoreSelectedRoute = () => {
      if (cancelled) return
      const current = new URLSearchParams(window.location.search)
      if (current.get('overview') === '1') return
      const nodeId = current.get('node') || current.get('memoryId')
      if (!nodeId) return

      const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      const selectedModeResolved = root?.dataset.lifeMapMode === 'selected'
      const selectedIdentityResolved = selectedModeResolved
        && Boolean(document.querySelector('nav[aria-label="Selected memory actions"]'))
      if (selectedIdentityResolved) return

      // Direct-route identity can arrive before the suspended production world has
      // installed its selection listener. Keep route-scoped replay alive until the
      // real world accepts selection instead of dropping the request after an
      // arbitrary animation-frame budget. Once selected mode exists, stop dispatching
      // and let the production departure -> travel -> approach -> arrival state
      // machine finish naturally while this bridge only waits for its action surface.
      if (!selectedModeResolved) requestLifeMapSelection(nodeId, 'semantic')
      frame = window.requestAnimationFrame(restoreSelectedRoute)
    }

    frame = window.requestAnimationFrame(restoreSelectedRoute)
    return () => {
      cancelled = true
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [])

  return <>
    <ComposedLifeMapScene />
    <LifeMapSemanticNavigator />
  </>
}