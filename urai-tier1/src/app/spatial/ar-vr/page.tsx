import UraiQuestEntryWorldV2 from './UraiQuestEntryWorldV2'
import { notFound } from 'next/navigation'
import { spatialLaunchBoundary } from '@/lib/spatial-launch-boundaries'

export const metadata = {
  title: 'URAI XR World',
  description: 'Explore the real-time URAI AR / VR / XR entry chamber.',
}

export default function SpatialArVrPage() {
  if (!spatialLaunchBoundary.liveArWebXrEnabled) notFound()
  return (
    <>
      <h1 className="sr-only">URAI AR / VR / XR entry chamber</h1>
      <UraiQuestEntryWorldV2 />
    </>
  )
}
