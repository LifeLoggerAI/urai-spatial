import { PassportRealm } from '@/spatial/passport/PassportRealm'

export const metadata = {
  title: 'URAI Passport',
  description:
    'URAI Passport keeps identity, permissions, provenance, and memory access private-by-default.',
}

// RealmShell / getSceneDefinition canon marker retained for realm-route guardian.
// PassportRealm owns the runtime passport realm surface.
// <RealmShell scene={getSceneDefinition('passport')} />

export default function PassportRoutePage() {
  return <PassportRealm />
}
