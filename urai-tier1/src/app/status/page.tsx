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
    'radial-gradient(circle at 14% 16%, rgba(125,211,252,.24), transparent 30rem), radial-gradient(circle at 80% 12%, rgba(192,132,252,.18), transparent 32rem), radial-gradient(circle at 46% 104%, rgba(190,242,100,.13), transparent 34rem), linear-gradient(160deg, #020617 0%, #071126 50%, #0f172a 100%)',
  fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
}

const grid: CSSProperties = {
  position: 'relative',
  zIndex: 1,
  width: 'min(1180px, 100%)',
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, .82fr)',
  gap: 'clamp(18px, 3vw, 30px)',
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
  maxWidth: '10ch',
  textShadow: '0 22px 90px rgba(103,232,249,.22)',
}

const copy: CSSProperties = {
  color: 'rgba(234,244,255,.8)',
  fontSize: 'clamp(1rem, 1.4vw, 1.14rem)',
  lineHeight: 1.65,
  maxWidth: '70ch',
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

const statusGrid: CSSProperties = {
  display: 'grid',
  gap: '12px',
  marginTop: '18px',
}

const row: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr auto',
  gap: '16px',
  alignItems: 'center',
  border: '1px solid rgba(226,232,240,.14)',
  borderRadius: '20px',
  padding: '14px 16px',
  background: 'rgba(2,6,23,.48)',
}

const ok: CSSProperties = {
  color: '#bbf7d0',
  border: '1px solid rgba(187,247,208,.28)',
  borderRadius: '999px',
  padding: '6px 10px',
  background: 'rgba(22,101,52,.18)',
  fontSize: '.78rem',
  fontWeight: 900,
}

export const metadata = {
  title: 'URAI Status',
  description: 'URAI Spatial launch status for Home, Life Map, Focus, Replay, Mirror, Passport, and Status.',
}

export default function StatusRoutePage() {
  const routes = ['Home /', 'Life Map', 'Focus', 'Replay', 'Mirror', 'Passport', 'Static export']

  return (
    <main style={shell}>
      <section style={grid}>
        <article style={card}>
          <div style={eyebrow}>URAI Status · Launch Surface</div>
          <h1 style={title}>Routes wired. World online.</h1>
          <p style={copy}>
            Home, Life Map, Focus, Replay, Mirror, Passport, and Status now resolve as launch-ready spatial surfaces.
            The public build stays static-export safe while the experience feels like one connected emotional universe.
          </p>
          <div style={actions}>
            <a style={primary} href="/home">Open Home</a>
            <a style={link} href="/life-map">Open Life Map</a>
            <a style={link} href="/focus?memoryId=quiet-reset">Open Focus</a>
            <a style={link} href="/passport">Open Passport</a>
          </div>
        </article>
        <aside style={sideCard} aria-label="Route readiness">
          <div style={eyebrow}>Readiness</div>
          <div style={statusGrid}>
            {routes.map((route) => (
              <div key={route} style={row}>
                <strong>{route}</strong>
                <span style={ok}>Ready</span>
              </div>
            ))}
          </div>
        </aside>
      </section>
    </main>
  )
}
