import Link from 'next/link'
import { Suspense } from 'react'
import { LocationMapAcceptanceBoundary } from '@/spatial/places/LocationMapAcceptanceBoundary'
import { LocationMapNativeWheelBridge } from '@/spatial/places/LocationMapNativeWheelBridge'
import '@/spatial/places/location-map-release-depth.css'
import '@/spatial/places/location-map-mobile-release-fixes.css'
import '@/spatial/places/location-map-r3f-final.css'
import './geographic-route-bridge.css'
import { listMemoryPlaces } from '@/spatial/places/memoryPlaceRepository'
import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  title: 'UrAi Location Map',
  description: 'Explore disclosed sample places through UrAi’s consent-bounded spatial location map.',
  alternates: { canonical: 'https://urai.app/location-map/' },
  openGraph: { url: 'https://urai.app/location-map/', title: 'UrAi Location Map', description: 'Explore disclosed sample places through UrAi’s consent-bounded spatial location map.' },
  twitter: { card: 'summary', title: 'UrAi Location Map', description: 'Explore disclosed sample places through UrAi’s consent-bounded spatial location map.' },
}

export default async function LocationMapPage() {
  const repositoryPlaces = await listMemoryPlaces({ source: 'demo' })
  // This static route may embed only disclosed sample places. Authenticated private
  // places must be loaded after trusted auth and must never cross the server/client
  // boundary merely because a browser-local flag exists.
  const places = repositoryPlaces.filter(place => place.privacyLevel === 'demo')
  const acceptanceFixturesEnabled = process.env.URAI_LOCATION_MAP_ACCEPTANCE_FIXTURES === '1'

  return (
    <section data-launch-surface="premium-emotional-weather-atlas">
      <LocationMapNativeWheelBridge />
      <aside className="locationMapGeographicBridge" aria-label="Geographic location layer">
        <span>Optional supporting layer</span>
        <Link href="/location-map/geographic/">Open consent-gated geographic places</Link>
      </aside>
      <Suspense fallback={null}>
        <LocationMapAcceptanceBoundary
          places={places}
          enabled={acceptanceFixturesEnabled}
        />
      </Suspense>
    </section>
  )
}
