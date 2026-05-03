import SpatialScene from '@/spatial/scene/SpatialScene'
import { CanonicalTierLockHud } from '@/spatial/components/CanonicalTierLockHud'

const publicDemoMode = true

export default function HomePage() {
  return (
    <>
      <SpatialScene />
      {!publicDemoMode && <CanonicalTierLockHud />}
    </>
  )
}