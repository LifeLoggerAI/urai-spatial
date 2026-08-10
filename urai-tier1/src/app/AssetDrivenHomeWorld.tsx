'use client'

import { useEffect, useRef } from 'react'
import { HomeWorldProductionV2 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV2'
import { URAI_WORLD_TRAVEL_EVENT } from '@/spatial/world/worldEvents'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const ownerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) return

    const homeWorld = () => owner.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
    let lifecycleFrame: number | null = null
    let serializingTraversal = false

    const hardenHomeOwnership = () => {
      owner.querySelectorAll('canvas').forEach((canvas) => {
        canvas.setAttribute('aria-hidden', 'true')
        canvas.setAttribute('role', 'presentation')
        canvas.setAttribute('tabindex', '-1')
      })
    }

    const publishOpening = (event: KeyboardEvent) => {
      if (event.code !== 'Enter' && event.code !== 'Space') return
      if (event.target instanceof Element && event.target.closest('input,textarea,select,[contenteditable="true"],button,a,summary')) return
      const world = homeWorld()
      if (!world || world.dataset.homeInputLocked === 'true') return
      const nearby = world.dataset.homeNearby
      if ((nearby === 'ground' || nearby === 'life-map') && world.dataset.homePortalSequence === 'idle') {
        world.dataset.homePortalSequence = `${nearby}:opening`
      }
    }

    const serializeCollapsedOpening = (records: MutationRecord[]) => {
      const world = homeWorld()
      if (!world || serializingTraversal) return
      const sequence = world.dataset.homePortalSequence || ''
      if (sequence !== 'ground:traversal' && sequence !== 'life-map:traversal') return
      const collapsedFromIdle = records.some((record) => (
        record.type === 'attributes'
        && record.target === world
        && record.attributeName === 'data-home-portal-sequence'
        && record.oldValue === 'idle'
      ))
      if (!collapsedFromIdle) return

      const destination = sequence.startsWith('ground:') ? 'ground' : 'life-map'
      const opening = `${destination}:opening`
      serializingTraversal = true
      world.dataset.homePortalSequence = opening
      lifecycleFrame = window.requestAnimationFrame(() => {
        const current = homeWorld()
        if (current?.dataset.homePortalSequence === opening) {
          current.dataset.homePortalSequence = `${destination}:traversal`
        }
        serializingTraversal = false
        lifecycleFrame = null
      })
    }

    const publishClosing = () => {
      const world = homeWorld()
      if (!world) return
      const sequence = world.dataset.homePortalSequence || ''
      if (sequence === 'ground:traversal') world.dataset.homePortalSequence = 'ground:closing'
      else if (sequence === 'life-map:traversal') world.dataset.homePortalSequence = 'life-map:closing'
    }

    hardenHomeOwnership()
    const observer = new MutationObserver(hardenHomeOwnership)
    observer.observe(owner, { childList: true, subtree: true })
    const lifecycleObserver = new MutationObserver(serializeCollapsedOpening)
    lifecycleObserver.observe(owner, {
      attributes: true,
      attributeFilter: ['data-home-portal-sequence'],
      attributeOldValue: true,
      subtree: true,
    })
    window.addEventListener('keydown', publishOpening, { capture: true })
    window.addEventListener(URAI_WORLD_TRAVEL_EVENT, publishClosing)
    return () => {
      observer.disconnect()
      lifecycleObserver.disconnect()
      if (lifecycleFrame !== null) window.cancelAnimationFrame(lifecycleFrame)
      window.removeEventListener('keydown', publishOpening, true)
      window.removeEventListener(URAI_WORLD_TRAVEL_EVENT, publishClosing)
    }
  }, [])

  return (
    <div
      ref={ownerRef}
      data-home-authored-region-contract="true"
      data-home-visible-world="final-physical-sanctuary-memory-rooms"
      data-home-route-owner="authored-coherent-three-dimensional-sanctuary"
      data-home-spatial-regions="home-sanctuary-geometry home-mountain-horizon home-living-vegetation home-reflecting-water"
      data-home-forge-scenery="suppressed"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
