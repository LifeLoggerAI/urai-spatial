'use client'

export function ReplayCorrectionControls() {
  return (
    <div data-testid="urai-replay-correction-controls" aria-label="Replay correction controls" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {['Save', 'Hide', 'Correct'].map((label) => (
        <button
          key={label}
          type="button"
          style={{
            minHeight: 34,
            borderRadius: 999,
            border: '1px solid rgba(142, 220, 255, 0.28)',
            background: 'rgba(95, 125, 255, 0.16)',
            color: '#edf7ff',
            padding: '6px 12px',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
