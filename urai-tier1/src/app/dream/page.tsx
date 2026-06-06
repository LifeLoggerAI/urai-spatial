import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function DreamRealmPage() {
  return <RealmShell scene={getSceneDefinition('dream')} summary="A private symbolic realm for dreamlike memory weather, soft reflection, and future imagination." />
}
