import GroundSpatialWorldCanon from '@/app/GroundSpatialWorldCanon'
import GroundAccessibleMovementControls from './GroundAccessibleMovementControls'
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
      className="ground-spatial-root ground-spatial-route-boundary"
      data-testid="walkable-first-person-ground-layer"
      data-scene-id={groundScene.id}
      data-ground-canon="home-ground-continuity-v1"
      data-ground-exploration="first-person"
      data-ground-pointer-lock="false"
      data-ground-camera="eye-level-terrain-following"
      data-ground-collision="terrain-slope-step-and-authored-obstacles"
      data-ground-place-layer="consent-aware-empty-by-default"
      data-ground-private-location-mounted="false"
    >
      <GroundSpatialWorldCanon />
      <GroundAccessibleMovementControls />
    </main>
  )
}
