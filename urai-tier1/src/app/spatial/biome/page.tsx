import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import { EmotionalBiome } from "@/components/spatial/emotional-biome";

export default function SpatialBiomePage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  return <EmotionalBiome />;
}
