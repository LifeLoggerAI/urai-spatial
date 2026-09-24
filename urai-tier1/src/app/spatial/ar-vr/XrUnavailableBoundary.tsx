import Link from 'next/link'

export default function XrUnavailableBoundary() {
  return (
    <main
      data-testid="urai-xr-unavailable"
      data-xr-public-enabled="false"
      data-xr-provider-state="gated"
      aria-labelledby="xr-unavailable-title"
      style={{
        minHeight: '100svh',
        display: 'grid',
        placeItems: 'center',
        padding: 24,
        background: 'radial-gradient(circle at 50% 28%,rgba(63,157,188,.16),transparent 32%),linear-gradient(180deg,#07121c,#03080d)',
        color: '#eefbff',
        fontFamily: 'system-ui,sans-serif',
      }}
    >
      <section style={{ width: 'min(720px,100%)', padding: 'clamp(24px,6vw,56px)', border: '1px solid rgba(207,241,255,.18)', borderRadius: 28, background: 'rgba(3,10,16,.76)' }}>
        <p style={{ margin: 0, opacity: .7, fontSize: 11, fontWeight: 800, letterSpacing: '.16em', textTransform: 'uppercase' }}>UrAi · XR provider boundary</p>
        <h1 id="xr-unavailable-title" style={{ margin: '12px 0 0', fontSize: 'clamp(34px,7vw,68px)', lineHeight: .98 }}>Immersive XR is not enabled on this release candidate.</h1>
        <p style={{ maxWidth: '60ch', margin: '20px 0 0', lineHeight: 1.65, opacity: .82 }}>
          No AR or VR session will be requested until the governed XR release gate is enabled and its required hardware, comfort, controller, performance, privacy, and accessibility evidence is complete. The non-XR UrAi experience remains available.
        </p>
        <nav aria-label="Continue without XR" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 26 }}>
          <Link href="/home" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', borderRadius: 999, background: '#eaf8fb', color: '#061216', fontWeight: 800, textDecoration: 'none' }}>Home</Link>
          <Link href="/life-map" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', borderRadius: 999, border: '1px solid rgba(234,248,251,.24)', color: '#eefbff', fontWeight: 800, textDecoration: 'none' }}>Life Map</Link>
          <Link href="/ground" style={{ minHeight: 48, display: 'inline-flex', alignItems: 'center', padding: '0 18px', borderRadius: 999, border: '1px solid rgba(234,248,251,.24)', color: '#eefbff', fontWeight: 800, textDecoration: 'none' }}>Ground</Link>
        </nav>
      </section>
    </main>
  )
}
