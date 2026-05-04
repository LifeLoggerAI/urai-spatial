import SpatialScene from '@/spatial/scene/SpatialScene'
import { CanonicalTierLockHud } from '@/spatial/components/CanonicalTierLockHud'
import LifeMapCompletionOverlay from '@/spatial/components/LifeMapCompletionOverlay'

const publicDemoMode = process.env.NEXT_PUBLIC_PUBLIC_DEMO_MODE === 'true'
const recordingMode = process.env.NEXT_PUBLIC_RECORDING_MODE === 'true'
const showInternalHud = !publicDemoMode && !recordingMode

export default function HomePage() {
  return (
    <>
      <SpatialScene />
      <LifeMapCompletionOverlay />
      {showInternalHud ? <CanonicalTierLockHud /> : null}
    </>
  )
}
