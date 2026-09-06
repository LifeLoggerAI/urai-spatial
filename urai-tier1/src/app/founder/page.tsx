import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'
import { publicIndexing } from '../public-indexing'

const profile = {"@context":"https://schema.org","@type":"ProfilePage","@id":"https://urai.app/founder/#profile","url":"https://urai.app/founder/","mainEntity":{"@type":"Person","@id":"https://urai.app/founder/#person","name":"Adam Clamp","jobTitle":"Founder and system architect","worksFor":{"@id":"https://urai.app/#organization"}}}

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'Adam Clamp — Founder',
  description: 'Adam Clamp is the founder and system architect behind URAI Labs and UrAi.',
  twitter: {
    card: 'summary',
    title: 'Adam Clamp — Founder',
    description: 'Adam Clamp is the founder and system architect behind URAI Labs and UrAi.',
  },
  alternates: { canonical: 'https://urai.app/founder/' },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/founder/',
    title: 'Adam Clamp — Founder',
    description: 'Adam Clamp is the founder and system architect behind URAI Labs and UrAi.',
    siteName: 'UrAi',
  },
}

export default function FounderPage() {
  return (
    <PublicAuthorityShell eyebrow="Founder" title="Adam Clamp" intro="Adam Clamp is the founder and system architect behind URAI Labs and the UrAi product direction.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(profile) }} />
      <h2>Work</h2>
      <p>His documented work focuses on spatial interfaces for memory, reflection, relationships, places, user-owned context, and proof-first release infrastructure.</p>
      <h2>Public evidence</h2>
      <p>Founder and architecture references are retained in the canonical UrAi source and governance record. This biography intentionally does not claim credentials, awards, patents, clinical authority, funding, or third-party recognition that have not been independently verified.</p>
      <p><a href="https://github.com/LifeLoggerAI">Public GitHub authority: LifeLoggerAI</a>.</p>
    </PublicAuthorityShell>
  )
}
