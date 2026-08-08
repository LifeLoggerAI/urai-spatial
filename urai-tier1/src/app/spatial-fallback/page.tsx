import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Home',
  description: 'Compatibility entry for the canonical Home capability-aware fallback.',
}

export default function SpatialFallbackCompatibilityPage() {
  redirect('/home?from=spatial-fallback')
}
