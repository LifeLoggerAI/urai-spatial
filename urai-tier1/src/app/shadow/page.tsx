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
        [data-testid="urai-shadow-route"] .urai-spatial-realm-portals {
          left: auto !important;
          right: calc(50% + 52px) !important;
          transform: none !important;
        }

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
            right: max(10px, env(safe-area-inset-right)) !important;
            bottom: max(10px, env(safe-area-inset-bottom)) !important;
            width: 132px !important;
            max-width: 132px !important;
            flex-direction: column !important;
            gap: 6px !important;
            overflow: visible !important;
            padding: 0 !important;
          }

          [data-testid="urai-shadow-route"] .urai-spatial-realm-portals button {
            width: 100% !important;
            min-height: 38px !important;
            justify-content: flex-start !important;
            padding: 0 10px !important;
            font-size: 11px !important;
          }
        }
      `}</style>
    </section>
  )
}
