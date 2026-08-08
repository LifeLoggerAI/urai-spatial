'use client'

import { HomeWorldProduction } from '@/spatial/layout/HomeWorldProduction'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  return (
    <div
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
