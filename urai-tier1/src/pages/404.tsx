export default function PagesRouterNotFoundShim() {
  return (
    <main aria-labelledby="page-unavailable-title" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', margin: 0, padding: 16, boxSizing: 'border-box', background: '#08030f', color: '#f8fdff', fontFamily: 'system-ui, sans-serif' }}>
      <style>{'.urai-not-found-recovery:focus-visible{outline:3px solid #8ff2ff;outline-offset:4px}'}</style>
      <section style={{ width: '100%', minWidth: 0, maxWidth: 560, boxSizing: 'border-box', padding: 24, border: '1px solid rgba(220, 250, 255, .2)', borderRadius: 28, background: 'rgba(2, 8, 20, .72)' }}>
        <p style={{ color: 'rgba(154, 238, 255, .92)', fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>URAI</p>
        <h1 id="page-unavailable-title" style={{ margin: '12px 0', fontSize: 'clamp(2rem, 8vw, 4rem)', lineHeight: 1 }}>This place isn’t part of your world</h1>
        <p style={{ color: 'rgba(248, 253, 255, .76)', lineHeight: 1.6 }}>The address may have changed, or this view may no longer be available.</p>
        <a className="urai-not-found-recovery" href="/" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 48, boxSizing: 'border-box', marginTop: 18, color: '#03111a', background: '#8ff2ff', borderRadius: 999, padding: '12px 16px', fontWeight: 900, textDecoration: 'none' }}>Return home</a>
      </section>
    </main>
  )
}
