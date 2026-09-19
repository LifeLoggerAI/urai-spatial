import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import { ShadowRealmPortal } from "@/components/spatial/shadow-realm-portal";

export default function SpatialShadowPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return <ShadowRealmPortal />;
}
