import { CanonicalTierLockHud } from '@/spatial/components/CanonicalTierLockHud'
import LifeMapCanonicalSurface from '@/spatial/components/LifeMapCanonicalSurface'

const publicDemoMode = process.env.NEXT_PUBLIC_PUBLIC_DEMO_MODE === 'true'
const recordingMode = process.env.NEXT_PUBLIC_RECORDING_MODE === 'true'
const showInternalHud = !publicDemoMode && !recordingMode

export default function HomePage() {
  return (
    <>
      <LifeMapCanonicalSurface />
      {showInternalHud ? <CanonicalTierLockHud /> : null}
    </>
  )
}
