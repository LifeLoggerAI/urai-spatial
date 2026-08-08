import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Spatial',
  description: 'Compatibility entry for the canonical URAI Home spatial runtime.',
}

export default function UraiSpatialV1CompatibilityPage() {
  redirect('/home?from=spatial-v1')
}
