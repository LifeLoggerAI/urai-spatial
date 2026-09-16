import GroundSpatialWorldClean from '@/app/GroundSpatialWorldClean'
import GroundPersonalizationBoundary from './GroundPersonalizationBoundary'
import GroundGeographicLivedWorldBridge from './GroundGeographicLivedWorldBridge'
import GroundSemanticReturnBridge from './GroundSemanticReturnBridge'
import './ground-production-polish.css'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Ground',
  description: 'The URAI Ground route opens the first-person lived world, mounting authorized personal reconstruction only when provenance and consent permit it.',
}

export default function GroundPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main
      data-testid="walkable-first-person-ground-layer"
      data-scene-id={groundScene.id}
      data-ground-realm-authority="personal-lived-world-with-non-personal-fallback"
    >
      <GroundPersonalizationBoundary />
      <GroundGeographicLivedWorldBridge />
      <GroundSemanticReturnBridge />
      <GroundSpatialWorldClean />
    </main>
  )
}
