'use client'

import './installR3FDataProps'
import './lifeMapMobileTravelDensity.css'
import './lifeMapSemanticNavigatorOwnership.css'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ComposedLifeMapScene from './ComposedLifeMapScene'
import LifeMapSemanticNavigator from './LifeMapSemanticNavigator'

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

    const geometryDiagnostic = window.setTimeout(() => {
      if (window.location.hostname !== '127.0.0.1') return
      const root = document.querySelector<HTMLElement>('[data-testid="urai-true-3d-life-map"]')
      const canonical = document.querySelector<HTMLElement>('[data-testid="urai-r3f-canonical-lifemap"]')
      const snapshot = (element: HTMLElement | null) => {
        if (!element) return null
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return {
          rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.right), Math.round(rect.bottom), Math.round(rect.width), Math.round(rect.height)],
          display: style.display,
          visibility: style.visibility,
          opacity: style.opacity,
          position: style.position,
          transform: style.transform,
        }
      }
      console.warn(`URAI_LIFEMAP_GEOMETRY ${JSON.stringify({ viewport: [innerWidth, innerHeight], root: snapshot(root), canonical: snapshot(canonical) })}`)
    }, 1000)

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
      window.clearTimeout(geometryDiagnostic)
      document.removeEventListener('click', primeOverview, true)
    }
  }, [router])

  return <>
    <ComposedLifeMapScene />
    <LifeMapSemanticNavigator />
  </>
}
