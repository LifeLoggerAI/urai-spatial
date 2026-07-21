'use client'

import { useCallback, useEffect, useState } from 'react'
import AdaptiveLifeMapScene from './AdaptiveLifeMapScene'

const overviewActionLabels = new Set(['Overview', 'Open semantic overview'])

function overviewHref() {
  const current = new URLSearchParams(window.location.search)
  current.delete('memoryId')
  current.delete('node')
  current.delete('returnNode')
  current.delete('from')
  current.set('overview', '1')
  return `/life-map?${current.toString()}`
}

export default function LifeMapRouteBoundary() {
  const [sceneVersion, setSceneVersion] = useState(0)

  const unwindToOverview = useCallback(() => {
    window.history.replaceState(window.history.state, '', overviewHref())
    setSceneVersion((version) => version + 1)
  }, [])

  useEffect(() => {
    const primeOverview = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const button = target.closest('button')
      const label = button?.textContent?.trim() || ''
      if (!button || !overviewActionLabels.has(label)) return
      event.preventDefault()
      event.stopPropagation()
      unwindToOverview()
    }

    const unwindOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      const current = new URLSearchParams(window.location.search)
      if (!current.has('memoryId') && !current.has('node')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      unwindToOverview()
    }

    document.addEventListener('click', primeOverview, true)
    window.addEventListener('keydown', unwindOnEscape, true)
    return () => {
      document.removeEventListener('click', primeOverview, true)
      window.removeEventListener('keydown', unwindOnEscape, true)
    }
  }, [unwindToOverview])

  return <AdaptiveLifeMapScene key={sceneVersion} />
}
