import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'URAI Support',
  description: 'Get help with URAI access, privacy, accessibility, and account issues.',
}

export default function SupportPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Support"
      title="Help when you need it."
      lede="For product, account, access, accessibility, or technical help, use the support channel. Privacy controls remain available inside the Consent Sanctuary."
      note="Do not send passwords, authentication secrets, or private memory content by email. Use in-product privacy controls for consent, access, and revocation whenever possible."
      links={[
        { href: 'mailto:support@urailabs.com', label: 'Email support', primary: true },
        { href: '/privacy-controls', label: 'Privacy & consent' },
        { href: '/report-bug', label: 'Report an issue' },
      ]}
    >
      <p><strong>Before reporting a bug:</strong> note the route, device, browser, and what you expected to happen.</p>
      <p><strong>For release state:</strong> the Status surface shows bounded runtime and deployment truth.</p>
    </InstitutionalPublicSurface>
  )
}
