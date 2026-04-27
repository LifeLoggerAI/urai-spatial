'use client'

type CanonHudProps = {
  mode: 'HOME' | 'LIFEMAP' | 'FOCUS' | 'REPLAY'
  selectedLabel: string | null
  onEsc: () => void
  onHome: () => void
}

export default function CanonHud(props: CanonHudProps) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: 10,
        }}
      >
        <div
          style={{
            padding: '7px 10px',
            borderRadius: 999,
            background: 'rgba(7,11,19,0.28)',
            border: '1px solid rgba(255,255,255,0.06)',
            color: '#d8e2f2',
            fontFamily: 'sans-serif',
            fontSize: 11,
            lineHeight: 1.2,
            backdropFilter: 'blur(6px)',
            pointerEvents: 'none',
          }}
        >
          <span style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {props.mode}
          </span>
          {props.selectedLabel ? (
            <span style={{ opacity: 0.7 }}> · {props.selectedLabel}</span>
          ) : null}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 6,
            pointerEvents: 'auto',
            opacity: 0.7,
          }}
        >
          <button onClick={props.onEsc}>ESC</button>
          <button onClick={props.onHome}>Home</button>
        </div>
      </div>
    </div>
  )
}
