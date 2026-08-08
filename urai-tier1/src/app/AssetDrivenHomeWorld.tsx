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
      data-home-spatial-regions="home-mountain-horizon home-living-vegetation"
      data-home-mountain-source="horizon-mountain-*"
      data-home-vegetation-source="living-growth-*"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
