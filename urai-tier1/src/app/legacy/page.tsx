import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export default function LegacyRealmPage() {
  return <RealmShell scene={getSceneDefinition('legacy')} summary="A private archive realm for chapters, milestones, and long-form memory continuity." />
}
