import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import LifeMapSemanticRoute from '@/spatial/realms/LifeMapSemanticRoute'

export default function DreamRealmPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return <LifeMapSemanticRoute kind="dream" />
}
