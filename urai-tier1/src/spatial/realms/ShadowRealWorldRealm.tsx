'use client'

import Link from 'next/link'
import { REAL_WORLD_MODEL_PATHS } from '@/spatial/assets/RealWorldModel'
import PhysicalRealmStage from '@/spatial/assets/PhysicalRealmStage'

export default function ShadowRealWorldRealm() {
  const overlay = (
    <section
      aria-label="Shadow Realm controls"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(18px, 4vw, 44px)', color: '#f5f2ef', fontFamily: 'Inter, ui-sans-serif, system-ui' }}
    >
      <div style={{ pointerEvents: 'auto', width: 'min(500px, 92vw)', padding: 16, borderRadius: 18, background: 'rgba(12,12,14,.62)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.1)' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .6 }}>URAI Shadow · physical world</p>
        <h1 style={{ margin: '7px 0 0', fontSize: 'clamp(30px, 5vw, 50px)', letterSpacing: '-.04em' }}>A real place beneath the reflection layer.</h1>
        <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.55, opacity: .76 }}>Stone, glass, water, architectural depth and human scale are now the visual substrate. Passport and Shadow consent rules remain separate governance layers.</p>
      </div>
      <nav style={{ pointerEvents: 'auto', display: 'flex', flexWrap: 'wrap', gap: 9, alignSelf: 'flex-end' }} aria-label="Shadow destinations">
        <Link href="/mirror?from=shadow" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(12,12,14,.62)', border: '1px solid rgba(255,255,255,.12)' }}>Mirror</Link>
        <Link href="/replay?from=shadow" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(12,12,14,.62)', border: '1px solid rgba(255,255,255,.12)' }}>Replay</Link>
        <Link href="/home?returnFrom=shadow" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(12,12,14,.62)', border: '1px solid rgba(255,255,255,.12)' }}>Home</Link>
      </nav>
    </section>
  )

  return (
    <PhysicalRealmStage
      modelSrc={REAL_WORLD_MODEL_PATHS.shadow}
      ariaLabel="URAI Shadow Realm"
      background="#121316"
      fog="#1d1c20"
      cameraPosition={[0, 1.68, 7.7]}
      target={[0, 1.2, -2.2]}
      environmentPreset="night"
      overlay={overlay}
      testId="urai-shadow-real-world-stage"
    />
  )
}
