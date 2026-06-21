import type { CSSProperties } from 'react'

const shell: CSSProperties = {
  minHeight: '100svh',
  display: 'grid',
  placeItems: 'center',
  padding: '24px',
  color: '#eaf4ff',
  background: 'radial-gradient(circle at 50% 18%, rgba(125,211,252,.24), transparent 30%), radial-gradient(circle at 80% 10%, rgba(168,85,247,.16), transparent 28%), linear-gradient(160deg, #020617 0%, #071126 52%, #0f172a 100%)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
}

const card: CSSProperties = {
  width: 'min(920px, 100%)',
  border: '1px solid rgba(147,197,253,.26)',
  borderRadius: '32px',
  padding: 'clamp(24px, 5vw, 56px)',
  background: 'linear-gradient(145deg, rgba(2,6,23,.82), rgba(15,23,42,.58))',
  boxShadow: '0 30px 120px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.08)',
  backdropFilter: 'blur(22px)',
}

const eyebrow: CSSProperties = {
  color: '#67e8f9',
  letterSpacing: '.22em',
  textTransform: 'uppercase',
  fontSize: '.76rem',
  fontWeight: 900,
}

const title: CSSProperties = {
  margin: '14px 0 12px',
  fontSize: 'clamp(2.3rem, 7vw, 5.6rem)',
  lineHeight: .9,
  letterSpacing: '-.075em',
  maxWidth: '10ch',
}

const copy: CSSProperties = {
  color: 'rgba(234,244,255,.78)',
  fontSize: '1.04rem',
  lineHeight: 1.65,
  maxWidth: '68ch',
}

const actions: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '24px',
}

const link: CSSProperties = {
  border: '1px solid rgba(147,197,253,.32)',
  borderRadius: '999px',
  padding: '12px 16px',
  color: '#eaf4ff',
  textDecoration: 'none',
  background: 'rgba(15,23,42,.68)',
  fontWeight: 850,
}

const primary: CSSProperties = {
  ...link,
  color: '#02111d',
  background: 'linear-gradient(135deg, #a7f3d0, #67e8f9)',
  borderColor: 'rgba(103,232,249,.7)',
}

export const metadata = {
  title: 'URAI Passport',
  description: 'The URAI Passport foundation route shell.',
}

export default function PassportRoutePage() {
  return (
    <main style={shell}>
      <section style={card}>
        <div style={eyebrow}>URAI Passport</div>
        <h1 style={title}>Your private life access layer.</h1>
        <p style={copy}>
          Passport is the permission and provenance foundation for URAI. Your world starts private,
          access stays user-controlled, and public demo data never pretends to be your private life.
        </p>
        <div style={actions}>
          <a style={primary} href="/home">Return Home</a>
          <a style={link} href="/life-map">Open Life Map</a>
          <a style={link} href="/status">View Status</a>
        </div>
      </section>
    </main>
  )
}
