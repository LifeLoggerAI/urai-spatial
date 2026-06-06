import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function CouncilRealmPage() {
  return <RealmShell scene={getSceneDefinition('council')} summary="A private guidance realm where the orb and Council presence can later explain places, patterns, and next steps." />
}
