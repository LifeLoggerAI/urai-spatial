'use client'

import type { CSSProperties } from 'react'
import {
  CANON_SEQUENCE_LINE,
  CANON_TIER_LOCK_LINE,
  URAI_SPATIAL_TIER_LOCKS,
} from '../canon/tierLockState'

const shellStyle: CSSProperties = {
  position: 'fixed',
  right: 16,
  bottom: 16,
  zIndex: 2147483647,
  display: 'grid',
  gap: 8,
  width: 'min(520px, calc(100vw - 32px))',
  padding: '12px 14px',
  borderRadius: 18,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(3, 7, 18, 0.72)',
  color: 'rgba(255,255,255,0.92)',
  boxShadow: '0 18px 70px rgba(0,0,0,0.42)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  pointerEvents: 'none',
  fontFamily:
    'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
}

const labelStyle: CSSProperties = {
  fontSize: 10,
  lineHeight: '14px',
  letterSpacing: '0.18em',
  textTransform: 'uppercase',
  color: 'rgba(203, 213, 225, 0.72)',
}

const lineStyle: CSSProperties = {
  fontSize: 12,
  lineHeight: '18px',
  fontWeight: 700,
  color: 'rgba(255,255,255,0.96)',
}

const sequenceStyle: CSSProperties = {
  fontSize: 11,
  lineHeight: '16px',
  color: 'rgba(203, 213, 225, 0.82)',
}

const rowStyle: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: 6,
}

const badgeBaseStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  minHeight: 24,
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.12)',
  fontSize: 10,
  lineHeight: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
}

const lockedBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(148, 163, 184, 0.12)',
  color: 'rgba(241,245,249,0.92)',
}

const completedBadgeStyle: CSSProperties = {
  ...badgeBaseStyle,
  background: 'rgba(34, 211, 238, 0.13)',
  color: 'rgba(207,250,254,0.96)',
}

export default function CanonicalTierLockHud() {
  return (
    <aside
      aria-label="URAI spatial canonical tier lock status"
      data-urai-canon-tier-lock="true"
      style={shellStyle}
    >
      <div style={labelStyle}>Visual audit closeout</div>
      <div style={lineStyle}>{CANON_TIER_LOCK_LINE}</div>
      <div style={sequenceStyle}>{CANON_SEQUENCE_LINE}</div>
      <div style={rowStyle}>
        {URAI_SPATIAL_TIER_LOCKS.map((tier) => (
          <span
            key={tier.label}
            data-tier={tier.label}
            data-status={tier.status}
            style={tier.status === 'completed locked' ? completedBadgeStyle : lockedBadgeStyle}
          >
            <span>{tier.label}</span>
            <span>{tier.status}</span>
          </span>
        ))}
      </div>
    </aside>
  )
}
