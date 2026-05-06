'use client'

import { useState } from 'react'
import { useSpatialTierLock } from '@/lib/tier-locks/client'

const FEATURES = ['spatial.lifeMap.personal','spatial.memoryStars.personal','spatial.ritual.interactive','spatial.admin.inspectLocks'] as const

const LOCKS = [
  { tier: 'Tier-1', status: 'LOCKED COMPLETE', scope: 'launch build, route shell, typecheck, production build' },
  { tier: 'Tier-2', status: 'LOCKED COMPLETE', scope: 'route audit, console audit, tier report' },
  { tier: 'Tier-3', status: 'LOCKED COMPLETE', scope: 'typecheck and 51/51 unit tests' },
  { tier: 'Tier-4', status: 'LOCKED COMPLETE', scope: 'env readiness and production build' },
  { tier: 'Tier-5', status: 'LOCKED COMPLETE', scope: 'final route, console, env, typecheck, tests, build, report' },
] as const

export default function LockInspectorPage() {
  const [feature, setFeature] = useState<typeof FEATURES[number]>('spatial.lifeMap.personal')
  const decision = useSpatialTierLock(feature)
  const debugEnabled = process.env.NEXT_PUBLIC_URAI_DEBUG_SPATIAL === 'true'

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 'clamp(24px, 5vw, 72px)',
        color: '#eaf2ff',
        background:
          'radial-gradient(circle at 50% 10%, rgba(80, 120, 255, 0.18), transparent 34%), linear-gradient(180deg, #020617 0%, #05000b 100%)',
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <section
        style={{
          maxWidth: 980,
          margin: '0 auto',
          border: '1px solid rgba(148, 163, 184, 0.22)',
          borderRadius: 28,
          padding: 'clamp(24px, 4vw, 48px)',
          background: 'rgba(6, 10, 28, 0.72)',
          boxShadow: '0 30px 120px rgba(0,0,0,.38)',
        }}
      >
        <p style={{ margin: 0, letterSpacing: '.24em', textTransform: 'uppercase', color: '#93c5fd', fontSize: 12, fontWeight: 800 }}>
          URAI Internal Locks
        </p>
        <h1 style={{ margin: '14px 0 10px', fontSize: 'clamp(2.5rem, 7vw, 5rem)', lineHeight: .92, letterSpacing: '-.06em' }}>
          Tier 1–5 locked complete.
        </h1>
        <p style={{ margin: '0 0 28px', maxWidth: 720, color: 'rgba(226, 232, 240, .74)', fontSize: 18, lineHeight: 1.6 }}>
          Launch lock evidence for the URAI Spatial Tier-1 app is committed under <code>urai-tier1/internal/locks</code>.
        </p>

        <div style={{ display: 'grid', gap: 12 }}>
          {LOCKS.map((lock) => (
            <article
              key={lock.tier}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(90px, 140px) 1fr',
                gap: 14,
                alignItems: 'center',
                border: '1px solid rgba(148, 163, 184, 0.18)',
                borderRadius: 18,
                padding: 16,
                background: 'rgba(15, 23, 42, 0.58)',
              }}
            >
              <strong style={{ color: '#bfdbfe' }}>{lock.tier}</strong>
              <div>
                <div style={{ color: '#bbf7d0', fontWeight: 900, letterSpacing: '.08em', fontSize: 13 }}>{lock.status}</div>
                <div style={{ marginTop: 4, color: 'rgba(226, 232, 240, .68)' }}>{lock.scope}</div>
              </div>
            </article>
          ))}
        </div>

        <p style={{ margin: '28px 0 0', color: 'rgba(226, 232, 240, .66)' }}>
          Final proof: route audit, console audit, env readiness, typecheck, 51/51 unit tests, production build, and Tier-5 runner passed.
        </p>

        {debugEnabled ? (
          <section style={{ marginTop: 34, paddingTop: 24, borderTop: '1px solid rgba(148, 163, 184, 0.18)' }}>
            <h2 style={{ margin: '0 0 12px' }}>Spatial Lock Inspector</h2>
            <select value={feature} onChange={(e) => setFeature(e.target.value as typeof FEATURES[number])}>
              {FEATURES.map((f) => <option key={f} value={f}>{f}</option>)}
            </select>
            <pre style={{ overflow: 'auto', background: 'rgba(0,0,0,.35)', padding: 16, borderRadius: 16 }}>{JSON.stringify(decision, null, 2)}</pre>
          </section>
        ) : null}
      </section>
    </main>
  )
}
