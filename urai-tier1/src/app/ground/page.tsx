import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function GroundRealmPage() {
  return <RealmShell scene={getSceneDefinition('ground')} summary="A safe grounding realm for returning to the home world, terrain, and calm spatial state." />
}
