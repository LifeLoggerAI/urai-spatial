import Link from 'next/link';

export default function LandingPage() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#000',
      color: '#fff',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2rem' }}>
        <Link href="/life-map" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ border: '1px solid #333', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}>
            <h2>Life-Map VR</h2>
            <p>Browse your stars in 3D space.</p>
          </div>
        </Link>
        <Link href="/ritual-ar" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ border: '1px solid #333', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}>
            <h2>Ritual AR</h2>
            <p>Place ritual glyphs in the real world.</p>
          </div>
        </Link>
        <Link href="/dream-planetarium" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={{ border: '1px solid #333', padding: '2rem', textAlign: 'center', cursor: 'pointer' }}>
            <h2>Dream Planetarium</h2>
            <p>Immersive replay of dream symbols.</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
