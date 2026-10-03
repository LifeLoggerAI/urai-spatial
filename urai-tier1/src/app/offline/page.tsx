import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Offline',
  description: 'URAI offline and degraded-mode guidance.',
}

export default function OfflinePage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Offline"
      title="Your way back stays visible."
      lede="Some network-backed capabilities are unavailable right now. Local and fallback-safe surfaces should remain understandable, and you can return to Home or retry a public route when connectivity returns."
      links={[
        { href: '/', label: 'Return Home', primary: true },
        { href: '/status', label: 'Check status' },
        { href: '/support', label: 'Get support' },
      ]}
    >
      <p><strong>Privacy rule:</strong> degraded mode should fail closed around protected memory, provider, and account operations rather than guessing or silently broadening access.</p>
    </InstitutionalPublicSurface>
  )
}
