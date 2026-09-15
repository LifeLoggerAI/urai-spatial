import GroundSpatialWorldCanon from '@/app/GroundSpatialWorldCanon'
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
    >
      <GroundSpatialWorldCanon />
    </main>
  )
}
