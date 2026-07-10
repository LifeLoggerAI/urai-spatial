import type { Metadata } from 'next'
import Link from 'next/link'
import { publicIdentity } from '@/data/publicIdentity'

export const metadata: Metadata = {
  title: 'About URAI',
  description: `${publicIdentity.description} ${publicIdentity.publicBoundary}`,
  alternates: { canonical: '/about' },
}

const card = {
  border: '1px solid rgba(186,230,253,.16)',
  borderRadius: '24px',
  background: 'rgba(3,8,20,.58)',
  padding: '24px',
} as const

export default function AboutPage() {
  return (
    <main
      style={{
        minHeight: '100dvh',
        padding: '48px 20px',
        color: 'white',
        background:
          'radial-gradient(circle at 50% 12%,rgba(103,232,249,.14),transparent 28%),linear-gradient(180deg,#071321,#02040c)',
      }}
    >
      <article style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gap: 20 }}>
        <p style={{ margin: 0, letterSpacing: '.2em', textTransform: 'uppercase', color: '#9af8ff' }}>
          Public identity authority
        </p>
        <h1 style={{ margin: 0, fontSize: 'clamp(46px,9vw,84px)', lineHeight: .9 }}>About URAI</h1>
        <p style={{ margin: 0, maxWidth: 760, fontSize: 20, lineHeight: 1.7, color: 'rgba(238,250,255,.82)' }}>
          {publicIdentity.description}
        </p>

        <section style={card} aria-labelledby="creator-heading">
          <h2 id="creator-heading">Creator</h2>
          <p>
            <strong>{publicIdentity.creator.name}</strong> is identified by the current URAI repository canon as the founder and
            creator of URAI.
          </p>
          <Link href={publicIdentity.creator.profilePath}>Open the public creator profile</Link>
        </section>

        <section style={card} aria-labelledby="evidence-heading">
          <h2 id="evidence-heading">Current evidence boundary</h2>
          <p>{publicIdentity.publicBoundary}</p>
          <p>
            Route availability or source implementation does not, by itself, prove authenticated personal-memory persistence,
            active providers, production certification, or physical-device certification.
          </p>
          <Link href="/status">Review current Status and claim boundaries</Link>
        </section>

        <section style={card} aria-labelledby="authority-heading">
          <h2 id="authority-heading">Canonical public references</h2>
          <p>
            Website: <a href={publicIdentity.canonicalUrl}>{publicIdentity.canonicalUrl}</a>
          </p>
          <p>
            Source repository: <a href={publicIdentity.repositoryUrl}>{publicIdentity.repositoryUrl}</a>
          </p>
          <p>{publicIdentity.disambiguation}</p>
        </section>

        <nav aria-label="About URAI navigation" style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          <Link href="/home">Open Home</Link>
          <Link href="/privacy-controls">Privacy Controls</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/status">Status</Link>
        </nav>
      </article>
    </main>
  )
}
