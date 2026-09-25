import Link from 'next/link'
import { TierOneStaticShell } from '@/spatial/layout/TierOneStaticShell'

export const metadata = {
  title: 'UrAi Support Status',
  description: 'Current availability and safe next steps for UrAi support.',
  robots: { index: false, follow: false },
}

export default function SupportStatusPage() {
  return (
    <TierOneStaticShell
      eyebrow="Support status"
      title="Support intake is not open yet."
      description="UrAi does not currently expose a verified public support mailbox or request form. Do not submit private, medical, account, or recovery information through an unverified address."
    >
      <p role="status" className="tier-one-static-shell__message">This page is intentionally fail-closed until the institutional support route passes inbound and outbound delivery verification.</p>
      <Link href="/status" className="tier-one-route-card__button">View system status</Link>
      <Link href="/privacy-controls" className="tier-one-route-card__button">Open privacy controls</Link>
    </TierOneStaticShell>
  )
}
