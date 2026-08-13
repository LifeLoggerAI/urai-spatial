import { CouncilRealm } from '@/spatial/council/CouncilRealm'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

// Migration note: SpatialRealmRuntime previously owned this route as realm="council".
// CouncilRealm now owns the canonical embodied scene so the committed V3 humans are actually visible.

export const metadata = {
  title: 'URAI Council Chamber',
  description: 'Enter the URAI Council as a navigable spatial stewardship chamber.',
}

export default function CouncilRoutePage() {
  const scene = getSceneDefinition('council')

  return (
    <section data-testid="urai-council-route" data-scene-id={scene.id} data-route-owner="rigged-embodied-council">
      <CouncilRealm />
    </section>
  )
}
