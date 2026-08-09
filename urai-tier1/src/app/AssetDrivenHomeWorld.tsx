'use client'

import { useEffect, useRef } from 'react'
import { HomeWorldProductionV2 as HomeWorldProduction } from '@/spatial/layout/HomeWorldProductionV2'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  const ownerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const owner = ownerRef.current
    if (!owner) return

    const hardenHomeOwnership = () => {
      owner.querySelectorAll('canvas').forEach((canvas) => {
        canvas.setAttribute('aria-hidden', 'true')
        canvas.setAttribute('role', 'presentation')
        canvas.setAttribute('tabindex', '-1')
      })

      const world = owner.querySelector<HTMLElement>('.urai-asset-home-world[data-home-primary-owner="asset-driven"]')
      if (!world) return
      const query = new URLSearchParams(window.location.search)
      world.setAttribute('data-home-asset-mode', query.get('homeAssetReview') === '1' ? 'disclosed-review-candidate' : 'ready')
      world.setAttribute('data-home-personalization-mode', query.get('homePrivateFixture') === '1' ? 'private-personalized' : 'standard')
    }

    hardenHomeOwnership()
    const observer = new MutationObserver(hardenHomeOwnership)
    observer.observe(owner, { childList: true, subtree: true })
    window.addEventListener('popstate', hardenHomeOwnership)
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', hardenHomeOwnership)
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
