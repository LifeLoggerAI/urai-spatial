import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function PassportRealmPage() {
  return <RealmShell scene={getSceneDefinition('passport')} summary="A private identity realm for continuity, self-sovereign profile state, and safe passage across URAI Spatial." />
}
