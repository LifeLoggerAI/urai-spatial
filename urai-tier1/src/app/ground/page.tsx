import GroundSpatialWorldClean from '@/app/GroundSpatialWorldClean'
import GroundGeographicLivedWorldBridge from './GroundGeographicLivedWorldBridge'
import GroundPersonalizationBoundary from './GroundPersonalizationBoundary'
import GroundSemanticReturnBridge from './GroundSemanticReturnBridge'
import './ground-production-polish.css'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Ground',
  description: 'The URAI Ground route opens the final walkable first-person ground layer.',
}

export default function GroundPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main
      data-testid="walkable-first-person-ground-layer"
      data-scene-id={groundScene.id}
      data-ground-personalization="personal-lived-world-with-non-personal-fallback"
    >
      <GroundGeographicLivedWorldBridge />
      <GroundPersonalizationBoundary />
      <GroundSemanticReturnBridge />
      <GroundSpatialWorldClean />
    </main>
  )
}
