import Link from 'next/link'

export const metadata = {
  title: 'URAI Support',
  description: 'Get support for your private URAI world, account, privacy, or access.',
}

export default function SupportPage() {
  return (
    <main style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: 24, background: '#04090d', color: '#f5fafc' }}>
      <section style={{ width: 'min(640px,100%)', padding: 'clamp(26px,6vw,48px)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 28, background: 'rgba(8,18,24,.82)' }}>
        <Link href="/home" style={{ color: '#a9dce4', textDecoration: 'none' }}>← Home</Link>
        <p style={{ marginTop: 40, fontSize: 11, letterSpacing: '.2em', textTransform: 'uppercase', color: '#88aeb7' }}>Support</p>
        <h1 style={{ margin: '10px 0 14px', fontSize: 'clamp(40px,8vw,64px)', lineHeight: .96 }}>We can help.</h1>
        <p style={{ color: '#c4d4da', lineHeight: 1.6 }}>
          For account, product, access, or launch support, email{' '}
          <a href="mailto:support@urailabs.com" style={{ color: '#d9f7fb' }}>support@urailabs.com</a>.
        </p>
        <p style={{ color: '#8fa8b0', lineHeight: 1.6, marginTop: 20 }}>
          Privacy permissions remain under your control in the Consent Sanctuary.
        </p>
        <div style={{ marginTop: 28, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/privacy-controls" style={{ color: '#d9f7fb' }}>Privacy controls</Link>
          <Link href="/status" style={{ color: '#d9f7fb' }}>System status</Link>
        </div>
      </section>
    </main>
  )
}
