import GeographicLocationClient from './GeographicLocationClient'

export const metadata = {
  title: 'UrAi Geographic Places',
  description: 'Optional, consent-gated geographic memory places that support the symbolic UrAi Life Map.',
}

export default function GeographicLocationPage() {
  return <GeographicLocationClient />
}
