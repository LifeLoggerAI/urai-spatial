import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'
import { publicIndexing } from '../public-indexing'

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'UrAi Ecosystem',
  description: 'The factual relationship between UrAi, URAI Labs, the URAI Foundation, and supporting systems.',
  alternates: { canonical: 'https://urai.app/ecosystem/' },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/ecosystem/',
    title: 'UrAi Ecosystem',
    description: 'The factual relationship between UrAi, URAI Labs, the URAI Foundation, and supporting systems.',
    siteName: 'UrAi',
  },
}

const systems = [
  ['UrAi', 'Public application', 'Canonical personal intelligence product at urai.app.'],
  ['UrAi Studio', 'Creator and orchestration system', 'Public source exists; deployment and production certification are separate gates.'],
  ['UrAi Jobs', 'Internal service', 'Asynchronous execution fabric; a public repository or route does not make internal provider operations public.'],
  ['UrAi Asset Factory', 'Developer infrastructure', 'Asset contracts and generation pipeline; provider-active claims are evidence-gated.'],
  ['UrAi Analytics', 'Internal service', 'Privacy-bounded analytics work; not represented as production-live without receipts.'],
  ['UrAi Content', 'Developer infrastructure', 'Content schemas and publication tooling.'],
  ['UrAi Privacy', 'Trust system', 'Consent, data-rights, and privacy-control work.'],
  ['UrAi Admin', 'Administrative surface', 'Protected operations tooling; not a public customer application.'],
  ['UrAi Investors', 'Gated information surface', 'Private diligence material, not public product authority.'],
  ['B2B / Partner systems', 'Gated service', 'Enterprise intake and partner tooling; provider and legal readiness are separately gated.'],
  ['UrAi Storytime', 'Experimental product', 'Narrative system with safety and deployment gates.'],
  ['UrAi Communications', 'Internal service', 'Delivery and communications work; provider activity is not claimed without evidence.'],
] as const

export default function EcosystemPage() {
  return (
    <PublicAuthorityShell eyebrow="Entity map" title="One product family. Clear boundaries." intro="URAI Labs builds UrAi. Supporting repositories and services have distinct roles, and none independently declare the whole ecosystem live.">
      <h2>URAI Foundation</h2>
      <p>The URAI Foundation is described as a formation-stage public-interest standards and governance initiative related to accessibility, consent, safety, and risk review. It is organizationally distinct from the product. This site does not claim incorporation, charity status, tax exemption, donation deductibility, active certification authority, or launched programs.</p>
      <h2>Systems</h2>
      <dl>{systems.map(([name, kind, detail]) => <div key={name} style={{ borderTop: '1px solid rgba(140,231,238,.18)', padding: '20px 0' }}><dt><strong>{name}</strong> — {kind}</dt><dd style={{ margin: '8px 0 0', color: '#c9d9e5' }}>{detail}</dd></div>)}</dl>
      <p>The complete machine-readable registry is available at <a href="/urai-entity.json">/urai-entity.json</a>.</p>
    </PublicAuthorityShell>
  )
}
