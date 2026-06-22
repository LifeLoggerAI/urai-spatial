import { RealmShell } from '@/spatial/realms/RealmShell'
import { getSceneDefinition } from '@/spatial/realms/sceneRegistry'

export const metadata = {
  title: 'URAI Passport',
  description: 'URAI Passport keeps identity, permissions, provenance, and memory access private-by-default.',
}

export default function PassportRoutePage() {
  return (
    <RealmShell
      scene={getSceneDefinition('passport')}
      summary="A private ownership realm for identity, consent, provenance, and memory access across URAI Spatial."
    />
  )
}
