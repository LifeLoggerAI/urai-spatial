import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import PossibleFuturesClient from './PossibleFuturesClient'

export default function PossibleFuturesPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return <PossibleFuturesClient />
}
