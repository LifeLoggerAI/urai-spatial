import { Suspense } from 'react'
import SpatialScene from '@/spatial/scene/SpatialScene'
import LifeMapCanonicalSurface from '@/spatial/components/LifeMapCanonicalSurface'

function FocusRouteStage() {
  return (
    <>
      <SpatialScene />
      <LifeMapCanonicalSurface />
    </>
  )
}

export default function FocusRoute() {
  return (
    <Suspense fallback={null}>
      <FocusRouteStage />
    </Suspense>
  )
}
