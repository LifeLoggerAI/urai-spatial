import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import UraiQuestEntryWorldV2 from './UraiQuestEntryWorldV2'

export const metadata = {
  title: 'URAI XR World',
  description: 'Explore the real-time URAI AR / VR / XR entry chamber.',
}

export default function SpatialArVrPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return (
    <>
      <h1 className="sr-only">URAI AR / VR / XR entry chamber</h1>
      <UraiQuestEntryWorldV2 />
    </>
  )
}
