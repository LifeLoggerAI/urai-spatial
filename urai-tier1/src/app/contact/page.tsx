import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Official public contact status and authority links for UrAi and UrAi Labs.',
  alternates: { canonical: 'https://urai.app/contact' },
}

export default function ContactPage() {
  return (
    <PublicAuthorityShell eyebrow="Official contact status" title="Contact UrAi" intro="Public mailbox routing remains provider-verification gated. No email address is represented as operational until external delivery and ownership are proven.">
      <p>For public source or technical corrections, use the <a href="https://github.com/LifeLoggerAI/urai-spatial">canonical public repository</a> without including private or security-sensitive information.</p>
      <p>For product release state, check <a href="/status">Status</a> before relying on a deployment, provider, certification, or launch claim.</p>
    </PublicAuthorityShell>
  )
}
