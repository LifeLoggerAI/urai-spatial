import UraiQuestEntryWorldV2 from '@/app/spatial/ar-vr/UraiQuestEntryWorldV2'
import { notFound } from 'next/navigation'
import { spatialLaunchBoundary } from '@/lib/spatial-launch-boundaries'

export const metadata = {
  title: 'URAI XR World',
  description: 'The canonical URAI XR route opens into the Quest / AR / VR entry chamber.',
}

export default function XrPage() {
  if (!spatialLaunchBoundary.liveArWebXrEnabled) notFound()
  return (
    <>
      <h1 className="sr-only">URAI XR World</h1>
      <UraiQuestEntryWorldV2 immersiveSessionEnabled={spatialLaunchBoundary.liveArWebXrEnabled} />
    </>
  )
}
