import { redirect } from 'next/navigation'

export const metadata = {
  title: 'URAI Life Map',
  description: 'Compatibility entry for the canonical URAI Life Map.',
}

export default function SpatialLifeMapR3fCompatibilityPage() {
  redirect('/life-map?from=spatial-life-map-r3f')
}
