import type { Metadata } from 'next'
import PublicAuthorityShell from '@/components/public-authority/PublicAuthorityShell'

export const metadata: Metadata = {
  title: 'Press and Media',
  description: 'Official, factual UrAi naming, descriptions, founder information, links, and status language.',
  alternates: { canonical: 'https://urai.app/press' },
}

export default function PressPage() {
  return (
    <PublicAuthorityShell eyebrow="Official media facts" title="UrAi press and media" intro="Use UrAi for the product name and UrAi Labs for the founder-led product organization.">
      <h2>Short description</h2>
      <p>UrAi is a privacy-first personal intelligence platform by UrAi Labs that makes memory, reflection, relationships, and direction spatial.</p>
      <h2>Extended description</h2>
      <p>UrAi explores a navigable personal world built from disclosed or permissioned context. Its public experience connects Home, Ground, Life Map, Focus, Replay, Mirror, Passport, privacy controls, and release status. Public demonstrations use sample or clearly disclosed content.</p>
      <h2>Founder</h2>
      <p>Adam Clamp is the founder and system architect behind UrAi Labs and the UrAi product direction.</p>
      <h2>Status language</h2>
      <p>Safe current wording: “The public UrAi web experience is reachable while the current coherent-3D Home release remains exact-head CI, visual acceptance, governance, protected deployment, and live-verification gated.”</p>
      <h2>Media assets</h2>
      <p>Use only logos, founder photography, screenshots, and video that are explicitly approved for public use. Final product imagery must be tied to a certified release SHA. No final launch-image pack is represented as approved on this page.</p>
      <h2>Contact and links</h2>
      <ul><li><a href="mailto:press@urai.app">press@urai.app</a></li><li><a href="https://urai.app/">urai.app</a></li><li><a href="https://github.com/LifeLoggerAI/urai-spatial">Canonical public repository</a></li><li><a href="/status">Current status</a></li></ul>
    </PublicAuthorityShell>
  )
}
