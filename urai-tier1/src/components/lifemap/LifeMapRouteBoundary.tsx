'use client'

import './installR3FDataProps'
import './lifeMapMobileTravelDensity.css'
import './lifeMapSemanticNavigatorOwnership.css'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ComposedLifeMapScene from './CosmicComposedLifeMapScene'
import LifeMapSemanticNavigator from './LifeMapSemanticNavigator'
import { LIFE_MAP_SELECTION_EVENT, type LifeMapSelectionDetail } from './lifeMapSelection'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])
const MIN_DIRECT_ROUTE_RENDER_ANCHORS = 8
const MAX_DIRECT_ROUTE_REPAIR_ATTEMPTS = 4

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

      const current = new URLSearchParams(window.location.search)
      const memoryId = current.get('memoryId') || current.get('node')
      if (!memoryId) return
      current.delete('overview')
      current.set('memoryId', memoryId)
      current.set('node', memoryId)
      current.set('returnNode', memoryId)
      current.set('from', 'life-map')
      const family = button.closest<HTMLElement>('.life-map-thresholds')?.dataset.family
      if (family) current.set('artifactFamily', family)

      // Native navigation tears down software WebGL immediately. Keeping a stalled
      // SwiftShader scene alive while Next streams the next realm can otherwise delay
      // an already-authorized keyboard/pointer transition for many seconds.
      event.preventDefault()
      event.stopImmediatePropagation()
      window.location.assign(`/${route}?${current.toString()}`)
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
    let repairAttempts = 0

    const requestCanonicalSelection = () => {
      if (repairAttempts >= MAX_DIRECT_ROUTE_REPAIR_ATTEMPTS) return false
      repairAttempts += 1
      const detail: LifeMapSelectionDetail = { nodeId, source: 'semantic' }
      window.dispatchEvent(new CustomEvent<LifeMapSelectionDetail>(LIFE_MAP_SELECTION_EVENT, { detail }))
      return true
    }

    const verifyDirectRouteInvariant = () => {
      if (cancelled) return
      const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      if (!root) {
        frame = window.requestAnimationFrame(verifyDirectRouteInvariant)
        return
      }

      const phase = root.dataset.lifeMapPhase
      if (phase === 'arrival') {
        if (root.querySelector('.life-map-thresholds')) return
        requestCanonicalSelection()
        frame = window.requestAnimationFrame(verifyDirectRouteInvariant)
        return
      }

      // A direct browser entry can hydrate its URL identity after the scene's first render.
      // If the real authored world is already healthy but still in overview, issue a bounded
      // canonical selection retry until the semantic action surface proves that the selection
      // transaction was observed. The bound prevents event storms while closing the mount-order
      // race where a one-shot request can precede the production world's selection listener.
      if (phase === 'overview') {
        const renderReady = root.dataset.lifeMapRenderReady === 'true'
        const visibleAnchors = Number(root.dataset.lifeMapVisibleAnchors || '0')
        if (renderReady && Number.isFinite(visibleAnchors) && visibleAnchors >= MIN_DIRECT_ROUTE_RENDER_ANCHORS) {
          requestCanonicalSelection()
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
    <ComposedLifeMapScene />
    <LifeMapSemanticNavigator />
  </>
}
