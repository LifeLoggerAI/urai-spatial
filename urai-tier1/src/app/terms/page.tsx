import AdamLauncherSlot from '@/spatial/adam/AdamLauncherSlot'

import Link from 'next/link'

export const metadata = {
  title: 'Terms & Conditions | UrAi',
  description: 'UrAi Terms & Conditions, including SMS terms, consent, product boundaries, and responsible-use requirements.',
}

const cardStyle = {
  border: '1px solid rgba(186,230,253,.14)',
  borderRadius: 24,
  background: 'rgba(3,8,20,.5)',
  padding: 'clamp(20px,4vw,30px)',
} as const

const linkStyle = { color: '#b9f4ff', textUnderlineOffset: 4 } as const

export default function TermsPage() {
  return (
    <main aria-labelledby="terms-heading" style={{ minHeight: '100dvh', padding: 'clamp(32px,7vw,80px) 20px', color: '#f8fbff', background: 'radial-gradient(circle at 50% 8%,rgba(70,110,170,.18),transparent 34%),linear-gradient(180deg,#071326,#020713)' }}>
      <article style={{ maxWidth: 920, margin: '0 auto', display: 'grid', gap: 20, lineHeight: 1.72 }}>
        <header style={{ display: 'grid', gap: 12, marginBottom: 8 }}>
          <p style={{ margin: 0, letterSpacing: '.18em', textTransform: 'uppercase', color: '#7defff', fontSize: 12 }}>UrAi · Legal</p>
          <h1 id="terms-heading" style={{ margin: 0, fontSize: 'clamp(42px,8vw,72px)', lineHeight: 1 }}>Terms &amp; Conditions</h1>
          <p style={{ margin: 0, color: '#bfd0db' }}>Last updated October 4, 2026</p>
          <p style={{ margin: 0, fontSize: 18 }}>These Terms &amp; Conditions govern use of UrAi. By using UrAi, you agree to use the service lawfully and within the product, privacy, and safety boundaries described here and in the Privacy Policy.</p>
        </header>

        <section style={cardStyle}>
          <h2>Product scope</h2>
          <p>UrAi is a personal intelligence, memory, communications, and spatial-interface product. Some experiences may use demo, fallback, or sample data when a provider, device capability, or private data source is not connected, consented, and validated. UrAi will not treat preview behavior as proof that an external provider or private-data integration is active.</p>
        </section>

        <section style={cardStyle}>
          <h2>SMS Terms</h2>
          <p><strong>Users who expressly opt in may receive SMS messages from UrAi, including account notifications, service updates, user-requested reminders, and customer-care communications. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time. Reply HELP for assistance. Consent to receive SMS messages is not required to use UrAi.</strong></p>
          <p>SMS consent is separate from acceptance of these Terms. UrAi does not use a preselected consent box or require SMS consent as a condition of creating or using an account. Your mobile carrier&apos;s terms and charges may also apply.</p>
        </section>

        <section style={cardStyle}>
          <h2>Consent and access control</h2>
          <p>Features that use private or sensitive information are subject to applicable consent and access controls. Connected providers must not be represented as active until the relevant connection, permissions, and deployment state are validated.</p>
        </section>

        <section style={cardStyle}>
          <h2>No medical, diagnostic, or emergency use</h2>
          <p>UrAi does not provide medical advice, diagnosis, therapy, crisis response, or emergency services. Do not rely on UrAi for urgent safety decisions or clinical interpretation. Contact appropriate emergency or professional services when needed.</p>
        </section>

        <section style={cardStyle}>
          <h2>Responsible product language</h2>
          <p>Reflection summaries, Life Map patterns, Replay paths, simulations, and companion responses are intended to support reflection and user-directed exploration. They should not be treated as certain statements about a person, a diagnosis, or a guaranteed future outcome.</p>
        </section>

        <section style={cardStyle}>
          <h2>Account and service availability</h2>
          <p>You are responsible for maintaining control of your account credentials and for using UrAi in compliance with applicable law. Features may change, be limited, or be unavailable while safety, privacy, provider, device, or release requirements are being verified.</p>
        </section>

        <section style={cardStyle}>
          <h2>Privacy</h2>
          <p>Use of personal information is described in the <Link href="/privacy/" style={linkStyle}>UrAi Privacy Policy</Link>. SMS consent and opt-out choices are governed by that policy and the SMS Terms above.</p>
        </section>

        <section style={cardStyle}>
          <h2>Contact</h2>
          <p>For legal questions, contact <a href="mailto:legal@urailabs.com" style={linkStyle}>legal@urailabs.com</a>. For product or account support, contact <a href="mailto:support@urailabs.com" style={linkStyle}>support@urailabs.com</a>.</p>
        </section>

        <nav aria-label="Terms related links" style={{ display: 'flex', flexWrap: 'wrap', gap: 18, padding: '12px 0 32px' }}>
          <Link href="/privacy/" style={{ ...linkStyle, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Privacy Policy</Link>
          <Link href="/settings/communications" style={{ ...linkStyle, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Communication settings</Link>
          <Link href="/support" style={{ ...linkStyle, minHeight: 48, display: 'inline-flex', alignItems: 'center' }}>Support</Link>
          <AdamLauncherSlot name="terms-legal" />
        </nav>
      </article>
    </main>
  )
}
