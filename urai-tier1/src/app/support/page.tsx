export const metadata = {
  title: 'URAI Support',
  description: 'Get help with URAI access, privacy, accessibility, and account issues.',
}

export default function SupportPage() {
  return (
    <main style={{ minHeight: '100vh', padding: 'clamp(24px, 6vw, 72px)', background: '#05070a', color: '#f5f7fb' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <p style={{ letterSpacing: '0.14em', textTransform: 'uppercase', opacity: 0.72 }}>URAI · Support</p>
        <h1 style={{ fontSize: 'clamp(2.25rem, 7vw, 4.5rem)', lineHeight: 1, margin: '0.5rem 0 1rem' }}>Help when you need it.</h1>
        <p style={{ fontSize: '1.1rem', lineHeight: 1.7, opacity: 0.86 }}>
          For product, account, access, or technical support, contact the URAI support team.
          Privacy controls remain available inside the Consent Sanctuary.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 28 }}>
          <a href="mailto:support@urailabs.com" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', border: '1px solid currentColor', borderRadius: 999, color: 'inherit', textDecoration: 'none' }}>
            Email support
          </a>
          <a href="/privacy-controls" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', border: '1px solid rgba(245,247,251,.35)', borderRadius: 999, color: 'inherit', textDecoration: 'none' }}>
            Privacy & consent
          </a>
          <a href="/" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', color: 'inherit' }}>
            Return Home
          </a>
        </div>
      </div>
    </main>
  )
}
