import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function PassportRealmPage() {
  return <RealmShell scene={getSceneDefinition('passport')} summary="A private permission realm for understanding and controlling the data categories that power the world." />
}
