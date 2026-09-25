import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Ground World · URAI Spatial',
  description: 'Compatibility entry for the canonical URAI Ground runtime.',
}

export default function GroundWorldCompatibilityPage() {
  redirect('/ground?from=world')
}
