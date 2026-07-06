import type { Metadata } from 'next'
import Link from 'next/link'
import {
  URAI_BRAND_NAME,
  URAI_CANONICAL_URL,
  URAI_CREATOR_NAME,
  URAI_DISAMBIGUATION,
  URAI_PUBLIC_DESCRIPTION,
  uraiPersonSchema,
} from '@/lib/brand-authority'
import styles from './about.module.css'

export const metadata: Metadata = {
  title: 'About URAI Labs',
  description: `Official identity page for ${URAI_BRAND_NAME}, the organization behind URAI, created by ${URAI_CREATOR_NAME}.`,
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    type: 'profile',
    url: `${URAI_CANONICAL_URL}/about`,
    title: `About ${URAI_BRAND_NAME}`,
    description: URAI_PUBLIC_DESCRIPTION,
    images: ['/opengraph-image'],
  },
}

const aboutPageSchema = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  '@id': `${URAI_CANONICAL_URL}/about#page`,
  url: `${URAI_CANONICAL_URL}/about`,
  name: `About ${URAI_BRAND_NAME}`,
  description: URAI_PUBLIC_DESCRIPTION,
  mainEntity: {
    '@id': `${URAI_CANONICAL_URL}/#organization`,
  },
  about: [
    {
      '@id': `${URAI_CANONICAL_URL}/#organization`,
    },
    {
      '@id': `${URAI_CANONICAL_URL}/about#adam-clamp`,
    },
  ],
} as const

export default function AboutUraiLabsPage() {
  return (
    <main className={styles.page} data-urai-brand-authority="official">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutPageSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(uraiPersonSchema) }}
      />

      <div className={styles.shell}>
        <nav className={styles.nav} aria-label="URAI Labs navigation">
          <Link className={styles.brand} href="/">
            URAI LABS
          </Link>
          <div className={styles.navLinks}>
            <Link href="/">Enter URAI</Link>
            <Link href="/privacy-controls">Privacy</Link>
            <Link href="/status">Status</Link>
          </div>
        </nav>

        <header className={styles.hero}>
          <div>
            <p className={styles.eyebrow}>Official identity</p>
            <h1>
              URAI <span>Labs</span>
            </h1>
            <p className={styles.lead}>{URAI_PUBLIC_DESCRIPTION}</p>
          </div>

          <section className={styles.creatorCard} id="adam-clamp" aria-labelledby="creator-heading">
            <p className={styles.creatorLabel}>Who created URAI</p>
            <h2 className={styles.creatorName} id="creator-heading">
              {URAI_CREATOR_NAME}
            </h2>
            <p className={styles.creatorCopy}>
              URAI was created by Adam Clamp. This page is the canonical public identity reference for that connection.
            </p>
          </section>
        </header>

        <section className={styles.grid} aria-label="URAI Labs identity facts">
          <article className={styles.card}>
            <h2>What URAI is</h2>
            <p>
              URAI is a privacy-first spatial experience for memory, reflection, relationships, and personal ownership. Its canonical public product is the application at <strong>urai.app</strong>.
            </p>
            <p>
              The public route chain includes Home, Ground, Life Map, Focus, Replay, Mirror, Passport, Privacy Controls, and Status.
            </p>
          </article>

          <article className={styles.card}>
            <h2>What URAI Labs is</h2>
            <p>
              URAI Labs is the organization behind the URAI product and its connected research, design, engineering, privacy, accessibility, and spatial-computing work.
            </p>
            <p className={styles.official}>URAI Labs → URAI → urai.app</p>
          </article>

          <article className={`${styles.card} ${styles.cardWide}`}>
            <h2>Not ARAI Labs or another “Urai”</h2>
            <p>{URAI_DISAMBIGUATION}</p>
            <p>
              References to unrelated voice-agent companies, industrial distributors, laboratory-equipment businesses, neuroscience labs, industrial blowers, chemical brands, or ARAI Labs do not describe this URAI Labs.
            </p>
          </article>

          <article className={styles.card}>
            <h2>Evidence boundary</h2>
            <p>
              URAI separates implemented source, deployed behavior, provider-backed features, device certification, and roadmap work. A route, mockup, source file, or version name is not treated as production certification by itself.
            </p>
          </article>

          <article className={styles.card}>
            <h2>Canonical references</h2>
            <p>
              These are the authoritative public locations for the product and its current operational posture.
            </p>
            <div className={styles.links}>
              <Link href="/">URAI product</Link>
              <Link href="/status">Product status</Link>
              <Link href="/privacy-controls">Privacy controls</Link>
              <a href="https://github.com/LifeLoggerAI" rel="me noopener noreferrer">
                GitHub organization
              </a>
            </div>
          </article>
        </section>

        <footer className={styles.footer}>
          <span>URAI Labs — official identity page</span>
          <span>Created by Adam Clamp</span>
        </footer>
      </div>
    </main>
  )
}
