import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'
import { publicIndexing } from '../../public-indexing'

const foundingEngineerJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Person',
  '@id': 'https://urai.app/about/labs/#chris-herrin',
  name: 'Chris Herrin',
  url: 'https://urai.app/about/labs/#chris-herrin',
  jobTitle: 'Founding Engineer',
  affiliation: {
    '@type': 'Organization',
    '@id': 'https://urai.app/#organization',
    name: 'URAI Labs',
    url: 'https://urai.app/about/labs/',
  },
  subjectOf: 'https://urai.app/about/labs/',
}

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'About URAI Labs',
  description: 'URAI Labs is the founder-led product organization building UrAi, with Chris Herrin serving as Founding Engineer.',
  twitter: {
    card: 'summary',
    title: 'About URAI Labs',
    description: 'URAI Labs is the founder-led product organization building UrAi, with Chris Herrin serving as Founding Engineer.',
  },
  alternates: { canonical: 'https://urai.app/about/labs/' },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/about/labs/',
    title: 'About URAI Labs',
    description: 'URAI Labs is the founder-led product organization building UrAi, with Chris Herrin serving as Founding Engineer.',
    siteName: 'UrAi',
  },
}

export default function LabsPage() {
  return (
    <PublicAuthorityShell eyebrow="Organization" title="URAI Labs" intro="URAI Labs is the founder-led product organization building UrAi and coordinating its product, engineering, privacy, accessibility, release, and evidence work.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(foundingEngineerJsonLd) }} />
      <h2>Relationship to UrAi</h2>
      <p>URAI Labs builds and operates the product work described on this site. The canonical public product source is the <a href="https://github.com/LifeLoggerAI/urai-spatial">LifeLoggerAI/urai-spatial</a> repository and its protected release path to urai.app.</p>
      <h2 id="chris-herrin">Founding Engineer</h2>
      <p><strong>Chris Herrin</strong> is the Founding Engineer at URAI Labs and an engineering contributor to UrAi.</p>
      <p>The Founding Engineer role title alone does not establish equity ownership, corporate-officer or director status, legal co-founder status, employment classification, credentials, location, or independent third-party validation. No external social profile is represented as canonical until the identity match is separately verified and approved.</p>
      <h2>Evidence boundary</h2>
      <p>This page does not claim a particular legal form, good standing, funding, customers, revenue, partnerships, certifications, or intellectual-property ownership. Those facts require their own retained evidence before publication.</p>
      <h2>Contact status</h2>
      <p>Public mailbox routing remains provider-verification gated. Use the canonical public repository for source or technical corrections without including private or security-sensitive information.</p>
    </PublicAuthorityShell>
  )
}
