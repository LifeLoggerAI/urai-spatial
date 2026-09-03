import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'

export const metadata: Metadata = {
  title: 'Contact',
  description: 'Official public contact route for UrAi and UrAi Labs.',
  alternates: { canonical: 'https://urai.app/contact' },
}

export default function ContactPage() {
  return (
    <PublicAuthorityShell eyebrow="Official contact" title="Contact UrAi" intro="Use the verified first-party route below for public, media, correction, and partnership inquiries.">
      <p>Email: <a href="mailto:press@urai.app">press@urai.app</a></p>
      <p>For product release state, check <a href="/status">Status</a> before relying on a deployment, provider, certification, or launch claim.</p>
    </PublicAuthorityShell>
  )
}
