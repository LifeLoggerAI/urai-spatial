import { LaunchSeo } from '../LaunchSeo'
import { RootModeExperience } from '../RootModeExperience'

export const metadata = {
  title: 'URAI Life Map',
  description: 'The URAI Spatial Life Map opens the explorable memory constellation directly and routes selected stars into Focus.',
}

// Legacy canonical shell markers retained for source-string Phase 4/ascent locks while
// RootModeExperience resolves query/session state for the static-safe route.
// LifeMapAscentGate
// <TierOneExperience mode="life-map" />

export default function LifeMapPage() {
  return (
    <>
      <LaunchSeo label="URAI Life Map opens the explorable memory constellation with star doors into Focus." />
      <RootModeExperience initialMode="life-map" />
    </>
  )
}
