import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'

export const metadata: Metadata = {
  title: 'About UrAi Labs',
  description: 'UrAi Labs is the founder-led product organization building UrAi.',
  alternates: { canonical: 'https://urai.app/about/labs' },
}

export default function LabsPage() {
  return (
    <PublicAuthorityShell eyebrow="Organization" title="UrAi Labs" intro="UrAi Labs is the founder-led product organization building UrAi and coordinating its product, engineering, privacy, accessibility, release, and evidence work.">
      <h2>Relationship to UrAi</h2>
      <p>UrAi Labs builds and operates the product work described on this site. The canonical public product source is the <a href="https://github.com/LifeLoggerAI/urai-spatial">LifeLoggerAI/urai-spatial</a> repository and its protected release path to urai.app.</p>
      <h2>Evidence boundary</h2>
      <p>This page does not claim a particular legal form, good standing, funding, customers, revenue, partnerships, certifications, or intellectual-property ownership. Those facts require their own retained evidence before publication.</p>
      <h2>Contact status</h2>
      <p>Public mailbox routing remains provider-verification gated. Use the canonical public repository for source or technical corrections without including private or security-sensitive information.</p>
    </PublicAuthorityShell>
  )
}
