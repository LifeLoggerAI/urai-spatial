import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function GroundRealmPage() {
  return (
    <RealmShell
      scene={getSceneDefinition('ground')}
      summary="A grounded URAI realm for embodied world entry, council presence, real-life artifacts, routines, and safe continuity before ascending into the Life Map."
    />
  )
}
