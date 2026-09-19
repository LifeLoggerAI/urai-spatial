import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import LegacyArchiveWorld from '@/spatial/legacy/LegacyArchiveWorld'

export default function SpatialLegacyPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return <LegacyArchiveWorld />
}
