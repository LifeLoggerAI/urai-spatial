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
    let repaired = false

    const verifyArrivalInvariant = () => {
      if (cancelled || repaired) return
      const current = new URLSearchParams(window.location.search)
      if (current.get('overview') === '1') return
      const nodeId = current.get('node') || current.get('memoryId')
      if (!nodeId) return

      const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      if (!root || root.dataset.lifeMapPhase !== 'arrival') {
        frame = window.requestAnimationFrame(verifyArrivalInvariant)
        return
      }
      if (root.querySelector('.life-map-thresholds')) return

      repaired = true
      const detail: LifeMapSelectionDetail = { nodeId, source: 'semantic' }
      window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
    }

    frame = window.requestAnimationFrame(verifyArrivalInvariant)
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