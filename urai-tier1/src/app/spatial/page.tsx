import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Spatial',
  description: 'Enter the canonical URAI Home spatial runtime.',
}

export default function SpatialPage() {
  redirect('/home?from=spatial')
}
