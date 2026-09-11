import './mirror-mobile-inspection.css'
import MirrorBareEntryGuard from './MirrorBareEntryGuard'
import MirrorSpatialClient from './MirrorSpatialClient'
import { publicIndexing } from '../public-indexing'

export const metadata = {
  robots: publicIndexing,
  title: 'UrAi Mirror',
  description: 'Explore evidence-aware reflection patterns in UrAi’s spatial Mirror experience.',
  alternates: { canonical: 'https://urai.app/mirror/' },
  openGraph: { url: 'https://urai.app/mirror/', title: 'UrAi Mirror', description: 'Explore evidence-aware reflection patterns in UrAi’s spatial Mirror experience.' },
  twitter: { card: 'summary', title: 'UrAi Mirror', description: 'Explore evidence-aware reflection patterns in UrAi’s spatial Mirror experience.' },
}

const routeFingerprintStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const

export default function MirrorRoutePage() {
  return (
    <>
      <span
        data-testid="mirror-route-launch-fingerprint"
        data-urai-route-fingerprint="mirror-embodied-reflection-chamber evidence-aware-patterns replay-passport-continuity"
        style={routeFingerprintStyle}
      >
        Mirror embodied reflection chamber. Evidence-aware patterns. Replay and Passport continuity.
      </span>
      <MirrorBareEntryGuard>
        <MirrorSpatialClient />
      </MirrorBareEntryGuard>
    </>
  )
}
