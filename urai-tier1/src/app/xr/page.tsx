import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import UraiQuestEntryWorldV2 from '@/app/spatial/ar-vr/UraiQuestEntryWorldV2'
import XrUnavailableBoundary from '@/app/spatial/ar-vr/XrUnavailableBoundary'

export const metadata = {
  title: 'URAI XR World',
  description: 'The canonical URAI XR route opens into the Quest / AR / VR entry chamber.',
}

export default function XrPage() {
  if (!postLaunchSpatialRealmsEnabled()) return <XrUnavailableBoundary />
  return (
    <>
      <h1 className="sr-only">URAI XR World</h1>
      <UraiQuestEntryWorldV2 />
    </>
  )
}
