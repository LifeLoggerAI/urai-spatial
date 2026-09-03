import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'
import { publicIndexing } from '../public-indexing'

export const metadata: Metadata = {
  robots: publicIndexing,
  title: 'What is UrAi?',
  description: 'UrAi is a privacy-first personal intelligence platform by URAI Labs that turns personal context into a navigable spatial world.',
  twitter: {
    card: 'summary',
    title: 'What is UrAi?',
    description: 'UrAi is a privacy-first personal intelligence platform by URAI Labs that turns personal context into a navigable spatial world.',
  },
  alternates: { canonical: 'https://urai.app/about/' },
  openGraph: {
    type: 'website',
    url: 'https://urai.app/about/',
    title: 'What is UrAi?',
    description: 'UrAi is a privacy-first personal intelligence platform by URAI Labs that turns personal context into a navigable spatial world.',
    siteName: 'UrAi',
  },
}

export default function AboutPage() {
  return (
    <PublicAuthorityShell eyebrow="Official product overview" title="What is UrAi?" intro="UrAi is a privacy-first personal intelligence platform by URAI Labs. It explores how memories, relationships, places, reflection, and personal direction can become a navigable spatial world.">
      <h2>What exists publicly</h2>
      <p>The public web experience includes Home, Ground, Life Map, Focus, Replay, Mirror, Passport, privacy controls, and a release-status surface. Public demonstrations use sample or disclosed content.</p>
      <h2>What the status does not prove</h2>
      <p>A reachable route is not proof of authenticated persistence, active external providers, clinical validation, physical-device certification, or a fully certified production release. Those claims remain evidence-gated and are reported on the Status page.</p>
      <h2>The product relationship</h2>
      <p>UrAi is the product. URAI Labs is the founder-led product organization. Adam Clamp is the founder and system architect. The URAI Foundation is a separately described, formation-stage public-interest standards and governance initiative; no charitable or tax-exempt status is claimed.</p>
      <p><a href="https://github.com/LifeLoggerAI/urai-spatial">View the canonical public source authority on GitHub</a>.</p>
    </PublicAuthorityShell>
  )
}
