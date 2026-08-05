import SpatialRealmExperience from '@/spatial/realms/SpatialRealmExperience'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Shadow Realm',
  description: 'Walk the URAI Shadow Realm as a spatial integration environment.',
}

export default function ShadowRoutePage() {
  const scene = getSceneDefinition('shadow')

  return (
    <section data-testid="urai-shadow-route" data-scene-id={scene.id}>
      <SpatialRealmExperience realm="shadow" />
      <style>{`
        @media (max-width: 700px) {
          [data-testid="urai-shadow-route"] .urai-movement-help {
            top: max(176px, calc(env(safe-area-inset-top) + 166px)) !important;
            right: max(10px, env(safe-area-inset-right)) !important;
            max-width: 190px !important;
          }
        }
      `}</style>
    </section>
  )
}
