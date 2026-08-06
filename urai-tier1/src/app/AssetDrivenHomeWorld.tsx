'use client'

import { HomeWorldProduction } from '@/spatial/layout/HomeWorldProduction'

type Props = {
  onOrbOpen: () => void
  webglAvailable: true
}

export default function AssetDrivenHomeWorld({ onOrbOpen, webglAvailable }: Props) {
  return <HomeWorldProduction onOrbOpen={onOrbOpen} webglAvailable={webglAvailable} />
}
