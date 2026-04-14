'use client'

import SpatialScene from '@/spatial/scene/SpatialScene'

export default function Page() {
  return (
    <main
      style={{
        position: 'fixed',
        inset: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <SpatialScene />
    </main>
  )
}
