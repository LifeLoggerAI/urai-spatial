export default function PagesRouterNotFoundShim() {
  return (
    <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', margin: 0, background: '#08030f', color: '#f8fdff', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: 560, padding: 32, border: '1px solid rgba(220, 250, 255, .2)', borderRadius: 28, background: 'rgba(2, 8, 20, .72)' }}>
        <p style={{ color: 'rgba(154, 238, 255, .92)', fontSize: 12, fontWeight: 900, letterSpacing: '.16em', textTransform: 'uppercase' }}>URAI Spatial</p>
        <h1 style={{ margin: '12px 0', fontSize: 'clamp(2rem, 8vw, 4rem)', lineHeight: 1 }}>Return to Home.</h1>
        <p style={{ color: 'rgba(248, 253, 255, .76)', lineHeight: 1.6 }}>This legacy Pages Router shim exists so static builds always emit Next's pages manifest. The canonical not-found surface remains in the App Router.</p>
        <a href="/" style={{ display: 'inline-flex', marginTop: 18, color: '#03111a', background: '#8ff2ff', borderRadius: 999, padding: '12px 16px', fontWeight: 900, textDecoration: 'none' }}>Return home</a>
      </section>
    </main>
  )
}
