import type { CSSProperties } from 'react'
import { assetCssStack, privacyControlsAssets } from '@/spatial/assets/uraiAssets'
import ConsentSanctuaryClient from './ConsentSanctuaryClient'

export const metadata = {
  title: 'UrAi Consent Sanctuary',
  description: 'Inspect, preview, narrow, pause, revoke, and audit consent inside the private UrAi world.',
}

const providerSurface = {
  position: 'fixed',
  inset: 0,
  overflow: 'hidden',
  backgroundImage: assetCssStack(privacyControlsAssets.primary),
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundColor: '#02070c',
} satisfies CSSProperties

export default function PrivacyControlsRoutePage() {
  return (
    <div data-privacy-provider-surface="consent-sanctuary" style={providerSurface}>
      <ConsentSanctuaryClient />
    </div>
  )
}
