import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function CouncilRealmPage() {
  return <RealmShell scene={getSceneDefinition('council')} summary="A private council realm for reflective guidance, continuity review, and calm decision support inside URAI Spatial." />
}
