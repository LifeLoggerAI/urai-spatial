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
      data-home-spatial-regions="home-mountain-horizon home-lantern-village"
      data-home-mountain-source="horizon-mountain-*"
      data-home-village-source="inhabited-village-* village-tower-* village-roof-*"
      style={{ display: 'contents' }}
    >
      <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
    </div>
  )
}
