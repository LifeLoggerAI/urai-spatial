'use client'

import type { CSSProperties } from 'react'

const URAI_SPATIAL_TIER_LOCKS = [
  { label: 'Tier 1', status: 'locked' },
  { label: 'Tier 2', status: 'locked' },
  { label: 'Tier 3', status: 'candidate' },
  { label: 'Tier 4', status: 'candidate' },
  { label: 'Tier 5', status: 'candidate' },
] as const

const shellStyle: CSSProperties = { position: 'fixed', right: 16, bottom: 16, zIndex: 2147483647, display: 'grid', gap: 8, width: 'min(560px, calc(100vw - 32px))', padding: '12px 14px', borderRadius: 18, border: '1px solid rgba(255,255,255,0.14)', background: 'rgba(3, 7, 18, 0.72)', color: 'rgba(255,255,255,0.92)', boxShadow: '0 18px 70px rgba(0,0,0,0.42)', backdropFilter: 'blur(16px)', pointerEvents: 'none', fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }

export function CanonicalTierLockHud() {
  return (
    <aside aria-label="URAI spatial canonical tier lock status" data-urai-canon-tier-lock="true" style={shellStyle}>
      <div style={{ fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'rgba(203,213,225,.72)' }}>Visual audit status</div>
      <div style={{ fontSize: 12, fontWeight: 700 }}>Tier flow with ESC unwind is wired; Tier 3+ awaiting final CI + live visual signoff.</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {URAI_SPATIAL_TIER_LOCKS.map((tier) => (
          <span key={tier.label} data-tier={tier.label} data-status={tier.status} style={{ display: 'inline-flex', gap: 6, borderRadius: 999, padding: '4px 8px', border: '1px solid rgba(255,255,255,.16)', background: tier.status === 'locked' ? 'rgba(34,211,238,.13)' : 'rgba(251,191,36,.12)', fontSize: 10, fontWeight: 700 }}>
            <span>{tier.label}</span><span>{tier.status}</span>
          </span>
        ))}
      </div>
    </aside>
  )
}
