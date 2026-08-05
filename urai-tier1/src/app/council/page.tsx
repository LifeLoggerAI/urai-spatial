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
        }
      `}</style>
    </section>
  )
}
