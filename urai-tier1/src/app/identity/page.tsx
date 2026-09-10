import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'
import { publicIndexing } from '../public-indexing'

const identityJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': 'https://urai.app/identity/#page',
  url: 'https://urai.app/identity/',
  name: 'Official UrAi identity and naming',
  description: 'Canonical identity and disambiguation for UrAi, URAI Labs, Adam Clamp, and similarly named unrelated organizations and products.',
  mainEntity: {
    '@type': 'Organization',
    '@id': 'https://urai.app/#organization',
    name: 'URAI Labs',
    alternateName: 'UrAi Labs',
    url: 'https://urai.app/about/labs/',
    founder: { '@id': 'https://urai.app/founder/#person' },
    brand: { '@id': 'https://urai.app/#product' },
    disambiguatingDescription: 'URAI Labs is the founder-led product organization behind UrAi at urai.app. It is not Urai AI Corp., Inturai Ventures Corp., or another organization or product that happens to use Urai or URAI.',
  },
  about: [
    {
      '@type': 'SoftwareApplication',
      '@id': 'https://urai.app/#product',
      name: 'UrAi',
      alternateName: 'URAI Spatial',
      url: 'https://urai.app/',
      publisher: { '@id': 'https://urai.app/#organization' },
      creator: { '@id': 'https://urai.app/founder/#person' },
      disambiguatingDescription: 'UrAi is the privacy-first personal intelligence product at urai.app. It is unrelated to third-party products, companies, tickers, or acronyms that also use Urai or URAI.',
    },
    {
      '@type': 'Person',
      '@id': 'https://urai.app/founder/#person',
      name: 'Adam Clamp',
      url: 'https://urai.app/founder/',
      jobTitle: 'Founder, Steward and System Architect',
      worksFor: { '@id': 'https://urai.app/#organization' },
    },
  ],
}

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'Official identity and naming',
  description: 'Official identity and disambiguation for UrAi, URAI Labs, Adam Clamp, and unrelated organizations or products using similar Urai or URAI names.',
  twitter: {
    card: 'summary',
    title: 'Official UrAi identity and naming',
    description: 'Canonical identity and disambiguation for UrAi and URAI Labs.',
  },
  alternates: { canonical: 'https://urai.app/identity/' },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/identity/',
    title: 'Official UrAi identity and naming',
    description: 'Canonical identity and disambiguation for UrAi and URAI Labs.',
    siteName: 'UrAi',
  },
}

export default function IdentityPage() {
  return (
    <PublicAuthorityShell eyebrow="Official identity" title="UrAi identity and naming" intro="UrAi is the product at urai.app. URAI Labs is the founder-led product organization behind it. This page exists so people, search engines, and automated systems can distinguish this project from unrelated uses of Urai or URAI.">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(identityJsonLd) }} />
      <h2>Canonical identity</h2>
      <ul>
        <li><strong>Product:</strong> UrAi</li>
        <li><strong>Canonical website:</strong> <a href="https://urai.app/">https://urai.app/</a></li>
        <li><strong>Organization:</strong> URAI Labs</li>
        <li><strong>Founder:</strong> Adam Clamp — Founder, Steward and System Architect</li>
        <li><strong>Canonical public source:</strong> <a href="https://github.com/LifeLoggerAI/urai-spatial">LifeLoggerAI/urai-spatial</a></li>
      </ul>
      <h2>Unrelated entities with similar names</h2>
      <p>UrAi and URAI Labs are not affiliated with <strong>Urai AI Corp.</strong>, the Canadian AI-agent company using uraiai.com.</p>
      <p>UrAi and URAI Labs are not affiliated with <strong>Inturai Ventures Corp.</strong>, the separate company that uses URAI as a market symbol.</p>
      <p>UrAi and URAI Labs are not affiliated with the <strong>URAI</strong> product listed by Perfect10 AI.</p>
      <p>Name, acronym, ticker, or spelling similarity does not establish ownership, partnership, endorsement, or affiliation.</p>
      <h2>Machine-readable authority</h2>
      <p>The same boundaries are published in the <a href="/urai-entity.json">UrAi entity registry</a> and the <a href="/urai-public-claims.json">public claims registry</a>. Legal-entity form, funding, customers, partnerships, certifications, and other claims remain separately evidence-gated.</p>
    </PublicAuthorityShell>
  )
}
