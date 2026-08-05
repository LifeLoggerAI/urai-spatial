import SpatialRealmExperience from '@/spatial/realms/SpatialRealmExperience'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Council Chamber',
  description: 'Enter the URAI Council as a navigable spatial stewardship chamber.',
}

export default function CouncilRoutePage() {
  const scene = getSceneDefinition('council')

  return (
    <section data-testid="urai-council-route" data-scene-id={scene.id}>
      <SpatialRealmExperience realm="council" />
      <style>{`
        @media (max-width: 700px) {
          [data-testid="urai-council-route"] .urai-movement-help {
            top: max(194px, calc(env(safe-area-inset-top) + 184px)) !important;
            right: max(10px, env(safe-area-inset-right)) !important;
            max-width: 190px !important;
          }

          [data-testid="urai-council-route"] .urai-mobile-movement {
            bottom: max(10px, env(safe-area-inset-bottom)) !important;
          }

          [data-testid="urai-council-route"] .urai-spatial-realm-portals {
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
