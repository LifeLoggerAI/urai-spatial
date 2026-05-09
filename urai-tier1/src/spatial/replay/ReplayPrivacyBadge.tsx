'use client'

export function ReplayPrivacyBadge() {
  return (
    <span
      data-testid="urai-replay-privacy-badge"
      aria-label="Privacy: Private. Only visible to you."
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        color: 'rgba(187, 247, 208, 0.92)',
        fontSize: '0.78rem',
      }}
    >
      <span aria-hidden="true">●</span>
      <span>Private · Only visible to you</span>
    </span>
  )
}
