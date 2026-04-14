'use client'

import type { SpatialMemory } from '@/spatial/data/spatialMemory'

type Props = {
  memory: SpatialMemory | null
  mode: 'focus' | 'replay'
  visible?: boolean
}

function emotionLabel(emotion: SpatialMemory['emotion']): string {
  switch (emotion) {
    case 'calm': return 'Calm'
    case 'clarity': return 'Clarity'
    case 'tension': return 'Tension'
    case 'weight': return 'Weight'
    case 'wonder': return 'Wonder'
    case 'recovery': return 'Recovery'
    default: return 'Signal'
  }
}

export default function SpatialMemoryOverlay({
  memory,
  mode,
  visible = true,
}: Props) {
  if (!visible || !memory) return null

  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        bottom: mode === 'replay' ? 40 : 28,
        transform: 'translateX(-50%)',
        width: 'min(720px, calc(100vw - 48px))',
        pointerEvents: 'none',
        zIndex: 60,
        color: '#eef4ff',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          borderRadius: 18,
          padding: mode === 'replay' ? '16px 18px' : '12px 16px',
          background: mode === 'replay'
            ? 'linear-gradient(180deg, rgba(6,13,22,0.82), rgba(8,17,28,0.70))'
            : 'linear-gradient(180deg, rgba(11,23,38,0.72), rgba(16,36,58,0.58))',
          border: '1px solid rgba(223,233,255,0.10)',
          boxShadow: mode === 'replay'
            ? '0 12px 44px rgba(0,0,0,0.30)'
            : '0 8px 28px rgba(0,0,0,0.22)',
          backdropFilter: 'blur(10px)',
        }}
      >
        <div
          style={{
            fontSize: 12,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            opacity: 0.72,
            marginBottom: 8,
          }}
        >
          {mode === 'replay' ? 'Replay Memory' : 'Focused Memory'}
        </div>

        <div
          style={{
            fontSize: mode === 'replay' ? 24 : 20,
            lineHeight: 1.15,
            fontWeight: 600,
            marginBottom: 8,
          }}
        >
          {memory.title}
        </div>

        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            fontSize: 13,
            opacity: 0.86,
            marginBottom: memory.summary ? 10 : 0,
          }}
        >
          <span>Emotion: {emotionLabel(memory.emotion)}</span>
          <span>Intensity: {Math.round(memory.intensity * 100)}%</span>
          <span>{new Date(memory.ts).toLocaleDateString()}</span>
        </div>

        {memory.summary ? (
          <div
            style={{
              fontSize: 14,
              lineHeight: 1.45,
              opacity: 0.92,
            }}
          >
            {memory.summary}
          </div>
        ) : null}
      </div>
    </div>
  )
}
