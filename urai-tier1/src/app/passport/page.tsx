import type { CSSProperties } from 'react'

const shell: CSSProperties = {
  minHeight: '100svh',
  position: 'relative',
  overflow: 'hidden',
  display: 'grid',
  placeItems: 'center',
  padding: 'clamp(18px, 4vw, 56px)',
  color: '#eaf4ff',
  background:
    'radial-gradient(circle at 16% 18%, rgba(103,232,249,.22), transparent 28rem), radial-gradient(circle at 82% 16%, rgba(168,85,247,.18), transparent 32rem), radial-gradient(circle at 50% 105%, rgba(167,243,208,.16), transparent 34rem), linear-gradient(160deg, #020617 0%, #071126 48%, #0f172a 100%)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
}

const starfield: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage:
    'radial-gradient(circle at 20% 22%, rgba(255,255,255,.7) 0 1px, transparent 1.6px), radial-gradient(circle at 74% 24%, rgba(186,230,253,.75) 0 1px, transparent 1.7px), radial-gradient(circle at 56% 62%, rgba(216,180,254,.65) 0 1px, transparent 1.6px)',
  backgroundSize: '180px 180px, 240px 240px, 310px 310px',
  opacity: .34,
}

const grid: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 'min(1120px, 100%)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1.04fr) minmax(280px, .76fr)',
  gap: 'clamp(18px, 3vw, 30px)',
  alignItems: 'stretch',
}

const card: CSSProperties = {
  border: '1px solid rgba(186,230,253,.28)',
  borderRadius: '34px',
  padding: 'clamp(24px, 5vw, 58px)',
  background: 'linear-gradient(145deg, rgba(2,6,23,.84), rgba(15,23,42,.56))',
  boxShadow: '0 32px 130px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.08)',
  backdropFilter: 'blur(24px)',
}

const sideCard: CSSProperties = {
  ...card,
  padding: 'clamp(22px, 3.2vw, 34px)',
  display: 'grid',
  gap: '16px',
}

const eyebrow: CSSProperties = {
  color: '#67e8f9',
  letterSpacing: '.22em',
  textTransform: 'uppercase',
  fontSize: '.76rem',
  fontWeight: 900,
}

const title: CSSProperties = {
  margin: '14px 0 16px',
  fontSize: 'clamp(2.7rem, 7vw, 6.8rem)',
  lineHeight: .86,
  letterSpacing: '-.08em',
  maxWidth: '11ch',
  textShadow: '0 22px 90px rgba(103,232,249,.22)',
}

const copy: CSSProperties = {
  color: 'rgba(234,244,255,.8)',
  fontSize: 'clamp(1rem, 1.4vw, 1.14rem)',
  lineHeight: 1.65,
  maxWidth: '68ch',
}

const actions: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  marginTop: '28px',
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
  boxShadow: '0 18px 50px rgba(103,232,249,.18)',
}

const listItem: CSSProperties = {
  border: '1px solid rgba(226,232,240,.14)',
  borderRadius: '22px',
  padding: '16px',
  background: 'rgba(2,6,23,.48)',
}

export const metadata = {
  title: 'URAI Passport',
  description: 'URAI Passport keeps identity, permissions, provenance, and memory access private-by-default.',
}

export default function PassportRoutePage() {
  const safeguards = [
    ['Identity', 'Your world has an owner: you. URAI treats identity as permission, not extraction.'],
    ['Provenance', 'Every memory surface keeps a clear trail back to where it came from and why it appears.'],
    ['Control', 'Life Map, Focus, Replay, and Mirror stay connected through user-controlled access gates.'],
  ]

  return (
    <main style={shell}>
      <div style={starfield} aria-hidden="true" />
      <section style={grid}>
        <article style={card}>
          <div style={eyebrow}>URAI Passport · Access Layer</div>
          <h1 style={title}>Own your life. Live your world.</h1>
          <p style={copy}>
            Passport is the trust layer underneath URAI Spatial: identity, consent, provenance, and access all stay visible.
            It is built so the Life Map can feel alive without turning a person&apos;s private life into someone else&apos;s asset.
          </p>
          <div style={actions}>
            <a style={primary} href="/home">Return Home</a>
            <a style={link} href="/life-map">Open Life Map</a>
            <a style={link} href="/focus?memoryId=purpose-thread-visible">Open Focus</a>
            <a style={link} href="/status">View Status</a>
          </div>
        </article>
        <aside style={sideCard} aria-label="Passport safeguards">
          <div style={eyebrow}>Private by default</div>
          {safeguards.map(([name, detail]) => (
            <div key={name} style={listItem}>
              <strong>{name}</strong>
              <p style={{ margin: '8px 0 0', color: 'rgba(234,244,255,.72)', lineHeight: 1.5 }}>{detail}</p>
            </div>
          ))}
        </aside>
      </section>
    </main>
  )
}
