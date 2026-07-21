'use client'

import { useEffect } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])

export default function LifeMapRouteBoundary() {
  useEffect(() => {
    const primeOverviewHistory = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return

      const button = target.closest('button')
      const label = button?.textContent?.trim() || ''
      if (!button || !overviewActionLabels.has(label)) return

      const current = new URLSearchParams(window.location.search)
      current.delete('memoryId')
      current.delete('node')
      current.delete('returnNode')
      current.delete('from')
      current.set('overview', '1')
      window.history.replaceState(window.history.state, '', `/life-map?${current.toString()}`)
    }

    document.addEventListener('click', primeOverviewHistory, true)
    return () => document.removeEventListener('click', primeOverviewHistory, true)
  }, [])

  return <AdaptiveLifeMapScene />
}
