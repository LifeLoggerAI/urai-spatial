import ShadowRealWorldRealm from '@/spatial/realms/ShadowRealWorldRealm'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Shadow Realm',
  description: 'Enter the URAI Shadow Realm as a physical human-scale environment.',
}

export default function ShadowRoutePage() {
  const scene = getSceneDefinition('shadow')

  return (
    <section data-testid="urai-shadow-route" data-scene-id={scene.id} data-runtime-model="real-world-glb-v1">
      <ShadowRealWorldRealm />
    </section>
  )
}
