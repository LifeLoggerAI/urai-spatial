import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import RitualsClient from './RitualsClient'

export default function RitualsPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return <RitualsClient />
}
