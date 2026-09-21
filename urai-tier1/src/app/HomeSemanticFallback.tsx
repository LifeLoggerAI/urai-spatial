'use client'

import Link from 'next/link'

export default function HomeSemanticFallback() {
  return (
    <main
      data-testid="urai-home-semantic-fallback"
      data-home-fallback="bodyless-semantic"
      data-home-non-xr-body-policy="camera-only-no-hands-body-rig"
      data-home-visible-avatar="false"
      data-home-visible-hands="false"
      aria-label="UrAi Home semantic fallback"
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'linear-gradient(180deg,#10272a 0%,#0c1d1e 58%,#081313 100%)',
        color: '#f3faf7',
        fontFamily: 'var(--font-sans,system-ui)',
      }}
    >
      <section
        style={{
          width: 'min(680px,100%)',
          padding: 'clamp(24px,6vw,56px)',
          border: '1px solid rgba(226,241,234,.18)',
          borderRadius: 28,
          background: 'rgba(7,18,20,.78)',
          boxShadow: '0 22px 70px rgba(0,0,0,.28)',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .72 }}>UrAi · HOME · SEMANTIC ACCESS</p>
        <h1 style={{ margin: '10px 0 0', fontSize: 'clamp(32px,7vw,64px)', lineHeight: .98, letterSpacing: '-.045em' }}>Your private Home.</h1>
        <p style={{ maxWidth: '54ch', margin: '16px 0 0', lineHeight: 1.6, opacity: .78 }}>
          The spatial renderer is unavailable or still preparing. No synthetic avatar, hands, arms, body rig, personal memory, or invented history is rendered here.
        </p>
        <nav aria-label="Home semantic destinations" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 22 }}>
          <Link href="/ground/?from=home-ground" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: 999, background: '#eaf4ef', color: '#0b1716', fontWeight: 800, textDecoration: 'none' }}>Ground</Link>
          <Link href="/life-map/?from=home-sky" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: 999, border: '1px solid rgba(234,244,239,.24)', color: '#f3faf7', fontWeight: 800, textDecoration: 'none' }}>Life Map</Link>
          <Link href="/passport" aria-label="Open Passport from Home" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: 999, border: '1px solid rgba(234,244,239,.24)', color: '#f3faf7', fontWeight: 800, textDecoration: 'none' }}>Passport</Link>
          <Link href="/privacy" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 16px', borderRadius: 999, border: '1px solid rgba(234,244,239,.24)', color: '#f3faf7', fontWeight: 800, textDecoration: 'none' }}>Privacy</Link>
        </nav>
      </section>
    </main>
  )
}
