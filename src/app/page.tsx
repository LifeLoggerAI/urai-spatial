import SpatialScene from '../spatial/scene/SpatialScene'
import { CanonicalTierLockHud } from '../spatial/components/CanonicalTierLockHud'

export default function HomePage() {
  return (
    <>
      <SpatialScene />
      <CanonicalTierLockHud />
    </>
  )
}
