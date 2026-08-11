'use client'

import Link from 'next/link'
import { REAL_WORLD_MODEL_PATHS } from '@/spatial/assets/RealWorldModel'
import PhysicalRealmStage from '@/spatial/assets/PhysicalRealmStage'

export default function MirrorRealWorldRealm() {
  const overlay = (
    <section
      aria-label="Mirror physical chamber controls"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'clamp(18px, 4vw, 44px)', color: '#f2f6f6', fontFamily: 'Inter, ui-sans-serif, system-ui' }}
    >
      <div style={{ pointerEvents: 'auto', width: 'min(520px, 92vw)', padding: 16, borderRadius: 18, background: 'rgba(14,19,20,.58)', backdropFilter: 'blur(14px)', border: '1px solid rgba(255,255,255,.12)' }}>
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '.18em', textTransform: 'uppercase', opacity: .62 }}>URAI Mirror · physical chamber</p>
        <h1 style={{ margin: '7px 0 0', fontSize: 'clamp(30px, 5vw, 50px)', letterSpacing: '-.04em' }}>Reflection now has a room.</h1>
        <p style={{ margin: '9px 0 0', fontSize: 14, lineHeight: 1.55, opacity: .78 }}>This is the physical Mirror substrate. The evidence-aware Mirror interface remains the governed interpretation layer rather than being baked into the architecture.</p>
      </div>
      <nav style={{ pointerEvents: 'auto', display: 'flex', flexWrap: 'wrap', gap: 9, alignSelf: 'flex-end' }} aria-label="Mirror destinations">
        <Link href="/mirror?from=physical-mirror" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(14,19,20,.6)', border: '1px solid rgba(255,255,255,.13)' }}>Open Reflection Layer</Link>
        <Link href="/replay?from=physical-mirror" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(14,19,20,.6)', border: '1px solid rgba(255,255,255,.13)' }}>Replay</Link>
        <Link href="/home?returnFrom=mirror" style={{ color: '#fff', textDecoration: 'none', padding: '10px 14px', borderRadius: 999, background: 'rgba(14,19,20,.6)', border: '1px solid rgba(255,255,255,.13)' }}>Home</Link>
      </nav>
    </section>
  )

  return (
    <PhysicalRealmStage
      modelSrc={REAL_WORLD_MODEL_PATHS.mirror}
      ariaLabel="URAI Mirror Physical Chamber"
      background="#6f7b7c"
      fog="#879090"
      cameraPosition={[0, 1.68, 7.2]}
      target={[0, 1.25, -1.0]}
      environmentPreset="studio"
      overlay={overlay}
      testId="urai-mirror-real-world-stage"
    />
  )
}
