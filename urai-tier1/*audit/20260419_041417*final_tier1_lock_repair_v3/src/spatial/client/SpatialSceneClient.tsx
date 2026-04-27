'use client'

import dynamic from 'next/dynamic'

const SpatialScene = dynamic(
  () =>
    import('@/spatial/scene/SpatialScene').then((m: any) => {
      const resolved = m.default ?? m.SpatialScene
      if (!resolved) {
        throw new Error('SpatialScene module has no default export and no named SpatialScene export')
      }
      return resolved
    }),
  { ssr: false }
)

export default function SpatialSceneClient() {
  return <SpatialScene />
}
