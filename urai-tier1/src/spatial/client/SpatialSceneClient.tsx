'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import SpatialV2Overlay from '@/spatial/effects/SpatialV2Overlay'
import RoutePlaceSync from '@/spatial/scene/RoutePlaceSync'

const SpatialScene = dynamic(
  () =>
    import('@/spatial/scene/SpatialScene').then((m: any) => {
      const resolved = m.default ?? m.SpatialScene

      if (!resolved) {
        throw new Error(
          'SpatialScene module has no default export and no named SpatialScene export'
        )
      }

      return resolved
    }),
  { ssr: false }
)

export default function SpatialSceneClient() {
  return (
    <Suspense fallback={<div style={{ color: '#fff' }}>Loading URAI...</div>}>
      <RoutePlaceSync />
      <SpatialV2Overlay />
      <SpatialScene />
    </Suspense>
  )
}
