'use client'

import { ReplayPhase, ReplayPhaseDefinition } from '../scene/replayState'

const panelStyle = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  zIndex: 15,
  width: 'min(420px, calc(100vw - 44px))',
  transform: 'translate(-50%, -50%)',
  padding: '20px 22px',
  border: '1px solid rgba(142, 220, 255, 0.24)',
  borderRadius: 24,
  background: 'rgba(4, 12, 28, 0.84)',
  boxShadow: '0 24px 90px rgba(0, 0, 0, 0.42)',
  backdropFilter: 'blur(18px)',
  WebkitBackdropFilter: 'blur(18px)',
} as const

function titleFor(phase: ReplayPhase) {
  if (phase === 'loading_replay') return 'Replay is opening.'
  if (phase === 'replay_empty') return 'No replay target is available.'
  if (phase === 'replay_error') return 'Replay needs attention.'
  return 'Replay is settling.'
}

export function ReplayFallbackPanel({
  phase,
  phaseDefinition,
  onReturnToFocus,
}: {
  phase: ReplayPhase
  phaseDefinition: ReplayPhaseDefinition
  onReturnToFocus: () => void
}) {
  return (
    <section style={panelStyle} data-testid="urai-replay-fallback-panel" data-replay-phase={phase} aria-label="Replay fallback">
      <div style={{ color: 'rgba(182, 226, 255, 0.84)', fontSize: '0.68rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Replay State</div>
      <h2 style={{ margin: '8px 0', fontSize: '1.12rem', lineHeight: 1.2 }}>{titleFor(phase)}</h2>
      <p style={{ margin: 0, color: 'rgba(235, 244, 255, 0.72)', fontSize: '0.84rem', lineHeight: 1.5 }}>{phaseDefinition.userVisibleUi}</p>
      <button type="button" data-testid="urai-replay-fallback-return" style={{ width: '100%', minHeight: 40, marginTop: 16, borderRadius: 999, border: '1px solid rgba(255, 255, 255, 0.32)', background: 'rgba(103, 232, 249, 0.96)', color: '#050713', fontWeight: 800 }} onClick={onReturnToFocus}>
        Return to Focus
      </button>
    </section>
  )
}
