import CouncilRealWorldRealm from '@/spatial/council/CouncilRealWorldRealm'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Council Chamber',
  description: 'Enter the URAI Council as a physical human-scale stewardship chamber.',
}

export default function CouncilRoutePage() {
  const scene = getSceneDefinition('council')

  return (
    <section data-testid="urai-council-route" data-scene-id={scene.id} data-runtime-model="real-world-glb-v1">
      <CouncilRealWorldRealm />
    </section>
  )
}
