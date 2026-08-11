'use client'

import Link from 'next/link'
import { REAL_WORLD_MODEL_PATHS } from '@/spatial/assets/RealWorldModel'
import PhysicalRealmStage from '@/spatial/assets/PhysicalRealmStage'

export default function LegacyRealWorldRealm() {
  const overlay = (
    <section
      aria-label="Legacy Realm controls"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(18px, 4vw, 44px)', color: '#f7f1e8', fontFamily: 'Inter, ui-sans-serif, system-ui' }}
    >
      <div style={{ pointerEvents: 'auto', width: 'min(520px, 92vw)', padding: 16, borderRadius: 18, background: 'rgba(31,25,20,.62)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,244,224,.12)' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .62 }}>URAI Legacy · physical archive</p>
        <h1 style={{ margin: '7px 0 0', fontSize: 'clamp(30px, 5vw, 50px)', letterSpacing: '-.04em' }}>Stand inside the continuity.</h1>
        <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.55, opacity: .78 }}>Shelves, teaching surfaces, lineage structure and archival space now exist as physical geometry. The Life Map remains available as a doorway into the wider timeline.</p>
      </div>
      <nav style={{ pointerEvents: 'auto', display: 'flex', flexWrap: 'wrap', gap: 9, alignSelf: 'flex-end' }} aria-label="Legacy destinations">
        <Link href="/life-map?from=legacy&overview=1" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(31,25,20,.64)', border: '1px solid rgba(255,244,224,.14)' }}>Open Life Map</Link>
        <Link href="/passport?from=legacy" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(31,25,20,.64)', border: '1px solid rgba(255,244,224,.14)' }}>Passport</Link>
        <Link href="/home?returnFrom=legacy" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(31,25,20,.64)', border: '1px solid rgba(255,244,224,.14)' }}>Home</Link>
      </nav>
    </section>
  )

  return (
    <PhysicalRealmStage
      modelSrc={REAL_WORLD_MODEL_PATHS.legacy}
      ariaLabel="URAI Legacy Archive"
      background="#4b433a"
      fog="#6f665b"
      cameraPosition={[0, 1.68, 7.6]}
      target={[0, 1.35, -1.5]}
      environmentPreset="warehouse"
      overlay={overlay}
      testId="urai-legacy-real-world-stage"
    />
  )
}
