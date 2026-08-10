'use client'

import { useEffect, useRef } from 'react'
import { HomeWorldProduction } from '@/spatial/layout/HomeWorldProduction'

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
    }

    hardenHomeOwnership()
    const observer = new MutationObserver(hardenHomeOwnership)
    observer.observe(owner, { childList: true, subtree: true })
    return () => {
      observer.disconnect()
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
