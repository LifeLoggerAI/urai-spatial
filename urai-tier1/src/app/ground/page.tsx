import GroundSpatialWorldCanon from '@/app/GroundSpatialWorldCanon'
import GroundAccessibleMovementControls from './GroundAccessibleMovementControls'
import GroundHistoryGuard from './GroundHistoryGuard'
import './ground-production-polish.css'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Ground',
  description: 'The URAI Ground route opens the canonical first-person lived Ground world.',
}

export default function GroundPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main
      data-testid="walkable-first-person-ground-layer"
      data-scene-id={groundScene.id}
      data-ground-canon="home-ground-continuity-v1"
      data-ground-place-layer="consent-aware-empty-by-default"
      data-ground-private-location-mounted="false"
      data-ground-history="guarded-spatial-unwind"
    >
      <GroundHistoryGuard />
      <GroundSpatialWorldCanon />
      <GroundAccessibleMovementControls />
    </main>
  )
}
