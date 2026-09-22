import { notFound } from 'next/navigation'
import { postLaunchSpatialRealmsEnabled } from '@/lib/release/postLaunchRealmGate'
import SpatialRealmRuntime from '@/spatial/realms/SpatialRealmRuntime'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function SpatialShadowPage() {
  if (!postLaunchSpatialRealmsEnabled()) notFound()
  const scene = getSceneDefinition('shadow')
  return (
    <section
      data-testid="urai-spatial-shadow-route"
      data-scene-id={scene.id}
      data-route-owner="canonical-shadow-runtime"
    >
      <SpatialRealmRuntime realm="shadow" />
    </section>
  )
}
