import GroundSpatialWorldClean from '@/app/GroundSpatialWorldClean'
import GroundCheckpointRestoreSignal from './GroundCheckpointRestoreSignal'
import GroundFocusContainment from './GroundFocusContainment'
import './ground-focus-containment.css'
import './ground-production-polish.css'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'
import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  title: 'URAI Ground',
  description: 'The URAI Ground route opens the final walkable first-person ground layer.',
}

export default function GroundPage() {
  const groundScene = getSceneDefinition('ground')

  return (
    <main
      data-testid="walkable-first-person-ground-layer"
      data-scene-id={groundScene.id}
    >
      <GroundCheckpointRestoreSignal />
      <GroundFocusContainment />
      <GroundSpatialWorldClean />
    </main>
  )
}
