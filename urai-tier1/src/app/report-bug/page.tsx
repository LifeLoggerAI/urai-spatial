import InstitutionalPublicSurface from '../InstitutionalPublicSurface'

export const metadata = {
  title: 'Report a URAI Issue',
  description: 'Report a product or accessibility issue without sharing private memory content unnecessarily.',
}

export default function ReportBugPage() {
  return (
    <InstitutionalPublicSurface
      eyebrow="Report an issue"
      title="Tell us what broke."
      lede="Include the route, device, browser, and what you expected to happen. Do not include passwords, authentication secrets, private memory content, or other sensitive material unless a secure support workflow explicitly requests it."
      links={[
        { href: 'mailto:support@urailabs.com?subject=URAI%20issue%20report', label: 'Email support', primary: true },
        { href: '/status', label: 'Check status first' },
        { href: '/support', label: 'Support center' },
      ]}
    />
  )
}
