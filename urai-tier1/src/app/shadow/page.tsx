import SpatialRealmRuntime from '@/spatial/realms/SpatialRealmRuntime'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Shadow Realm',
  description: 'Walk the URAI Shadow Realm as a spatial integration environment.',
}

export default function ShadowRoutePage() {
  const scene = getSceneDefinition('shadow')

  return (
    <section data-testid="urai-shadow-route" data-scene-id={scene.id}>
      <SpatialRealmRuntime realm="shadow" />
    </section>
  )
}
