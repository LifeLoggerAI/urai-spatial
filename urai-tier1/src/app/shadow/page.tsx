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

          [data-testid="urai-shadow-route"] .urai-mobile-movement {
            bottom: max(10px, env(safe-area-inset-bottom)) !important;
          }

          [data-testid="urai-shadow-route"] .urai-spatial-realm-portals {
            left: auto !important;
            right: max(12px, env(safe-area-inset-right)) !important;
            transform: none !important;
            width: calc(100vw - 180px) !important;
            max-width: 210px !important;
          }
        }
      `}</style>
    </section>
  )
}
