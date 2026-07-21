'use client'

import { useEffect } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])

function primeOverviewIdentity() {
  const current = new URLSearchParams(window.location.search)
  current.delete('memoryId')
  current.delete('node')
  current.delete('returnNode')
  current.delete('from')
  current.set('overview', '1')
  window.history.replaceState(window.history.state, '', `/life-map?${current.toString()}`)
  window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }))
}

export default function LifeMapRouteBoundary() {
  useEffect(() => {
    let secondFrame = 0
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        if (!performance.getEntriesByName('urai:first-spatial-frame').length) {
          performance.mark('urai:first-spatial-frame')
        }
      })
    })

    const primeOverview = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      const label = button?.textContent?.trim() || ''
      if (!button || !overviewActionLabels.has(label)) return
      primeOverviewIdentity()
    }

    const primeEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const current = new URLSearchParams(window.location.search)
      if (!current.has('memoryId') && !current.has('node')) return
      primeOverviewIdentity()
    }

    document.addEventListener('click', primeOverview, true)
    window.addEventListener('keydown', primeEscape, true)
    return () => {
      window.cancelAnimationFrame(firstFrame)
      if (secondFrame) window.cancelAnimationFrame(secondFrame)
      document.removeEventListener('click', primeOverview, true)
      window.removeEventListener('keydown', primeEscape, true)
    }
  }, [])

  return <AdaptiveLifeMapScene />
}
